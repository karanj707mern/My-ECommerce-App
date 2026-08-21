import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma.service';
import { RedisService } from '@/infrastructure/redis.service';
import { BullMQService, OrderJobData } from '@/infrastructure/bullmq.service';
import { RabbitMQService } from '@/infrastructure/rabbitmq.service';
import { OrderEventsService } from './order-events.service';

export interface CreateOrderDto {
  addressId?: string;
  shippingType?: string;
  paymentMethod?: string;
  couponCode?: string;
  items: Array<{
    productId: number;
    quantity: number;
  }>;
}

export interface OrderResult {
  orderId: number;
  status: string;
  message: string;
}

@Injectable()
export class OrderService {
  private readonly IDEMPOTENCY_PREFIX = 'idempotency:order:';
  private readonly STOCK_PREFIX = 'stock:';
  private readonly IDEMPOTENCY_TTL = 24 * 60 * 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly bullMQService: BullMQService,
    private readonly rabbitMQService: RabbitMQService,
    private readonly orderEventsService: OrderEventsService,
  ) {}

  async createOrder(userId: number, dto: CreateOrderDto, idempotencyKey: string): Promise<OrderResult> {
    const idempotencyKeyFull = `${this.IDEMPOTENCY_PREFIX}${idempotencyKey}`;
    const existingRecord = await this.redisService.getClient().get(idempotencyKeyFull);

    if (existingRecord) {
      const existing = JSON.parse(existingRecord);
      if (existing.status === 'completed') {
        return existing.result;
      }
      if (existing.status === 'processing') {
        throw new ConflictException('Order is already being processed');
      }
    }

    await this.redisService.getClient().setex(
      idempotencyKeyFull,
      this.IDEMPOTENCY_TTL,
      JSON.stringify({ status: 'processing' }),
    );

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const productIds = dto.items.map((item) => item.productId);
        const products = await tx.product.findMany({
          where: {
            id: { in: productIds },
            deletedAt: null,
          },
          select: { id: true, stock: true, price: true, name: true },
        });

        if (products.length !== productIds) {
          throw new BadRequestException('One or more products not found');
        }

        const stockUpdates: Array<{ productId: number; quantity: number }> = [];
        let subtotal = 0;

        for (const item of dto.items) {
          const product = products.find((p) => p.id === item.productId);
          if (!product) {
            throw new BadRequestException(`Product ${item.productId} not found`);
          }

          const currentStock = await this.redisService.getClient().get(`${this.STOCK_PREFIX}${item.productId}`);
          const redisStock = currentStock ? parseInt(currentStock, 10) : product.stock;

          if (redisStock < item.quantity) {
            throw new BadRequestException(`Insufficient stock for product ${product.name}`);
          }

          const newStock = await this.redisService.getClient().decrby(`${this.STOCK_PREFIX}${item.productId}`, item.quantity);

          if (newStock < 0) {
            await this.redisService.getClient().incrby(`${this.STOCK_PREFIX}${item.productId}`, item.quantity);
            throw new BadRequestException(`Insufficient stock for product ${product.name}`);
          }

          stockUpdates.push({ productId: item.productId, quantity: item.quantity });
          subtotal += product.price * item.quantity;
        }

        const shippingAmount = subtotal > 999 ? 0 : 99;
        const taxAmount = subtotal * 0.18;
        const total = subtotal + shippingAmount + taxAmount;

        const order = await tx.order.create({
          data: {
            userId,
            total,
            subtotal,
            taxAmount,
            shippingAmount,
            status: 'PENDING',
            paymentMethod: dto.paymentMethod ?? 'online',
            shippingType: dto.shippingType ?? 'standard',
            couponCode: dto.couponCode,
            inventoryReserved: true,
            items: {
              create: dto.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: products.find((p) => p.id === item.productId)!.price,
              })),
            },
          },
          select: { id: true, status: true, total: true },
        });

        // Update product stock in database
        for (const update of stockUpdates) {
          await tx.product.update({
            where: { id: update.productId },
            data: { stock: { decrement: update.quantity } },
          });
        }

        return {
          orderId: order.id,
          status: order.status,
          message: 'Order created successfully',
        };
      });

      const orderResult: OrderResult = {
        orderId: result.orderId,
        status: result.status,
        message: result.message,
      };

      await this.redisService.getClient().setex(
        idempotencyKeyFull,
        this.IDEMPOTENCY_TTL,
        JSON.stringify({ status: 'completed', result: orderResult }),
      );

      await this.orderEventsService.emitOrderCreated({
        type: 'order.created',
        orderId: orderResult.orderId,
        userId,
        status: orderResult.status,
        payload: { orderId: orderResult.orderId, total: result.total ?? 0 },
      });

      return orderResult;
    } catch (error) {
      await this.redisService.getClient().del(idempotencyKeyFull);
      throw error;
    }
  }

  async findByUserId(userId: number) {
    return this.prisma.order.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, price: true, image: true, slug: true },
            },
          },
        },
      },
    });
  }

  async findById(orderId: number, userId: number) {
    return this.prisma.order.findFirst({
      where: { id: orderId, userId, deletedAt: null },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, price: true, image: true, slug: true },
            },
          },
        },
      },
    });
  }

  async cancelOrder(orderId: number, userId: number): Promise<OrderResult> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId, deletedAt: null },
      include: { items: true },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    if (order.status === 'CANCELLED') {
      throw new BadRequestException('Order is already cancelled');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
        select: { id: true, status: true },
      });

      // Release stock back to Redis and database
      for (const item of order.items) {
        await this.redisService.getClient().incrby(`${this.STOCK_PREFIX}${item.productId}`, item.quantity);
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      return {
        orderId: updatedOrder.id,
        status: updatedOrder.status,
        message: 'Order cancelled successfully',
      };
    });

    await this.orderEventsService.emitOrderUpdated({
      type: 'order.cancelled',
      orderId: result.orderId,
      userId,
      status: result.status,
      payload: { orderId: result.orderId },
    });

    return result;
  }
}
