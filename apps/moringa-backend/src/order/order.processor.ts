import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationType, Prisma } from '../generated/prisma/client';
import { OrderJobData } from '../infrastructure/bullmq.service';
import { PrismaService } from '../infrastructure/prisma.service';
import { RabbitMQService } from '../infrastructure/rabbitmq.service';

@Injectable()
export class OrderProcessor {
  private readonly logger = new Logger(OrderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitMQService: RabbitMQService
  ) {}

  async process(job: Job<OrderJobData>): Promise<void> {
    this.logger.log(`Processing job ${job.id} of type ${job.data.action}`);

    const { orderId, userId, action, payload, idempotencyKey } = job.data;

    switch (action) {
      case 'send_confirmation':
        await this.handleSendConfirmation(orderId, userId);
        break;
      case 'update_inventory':
        await this.handleUpdateInventory(orderId);
        break;
      case 'send_notification':
        await this.handleSendNotification(orderId, userId, payload);
        break;
      case 'process_payment':
        await this.handleProcessPayment(orderId);
        break;
      default:
        this.logger.warn(`Unknown action type: ${String(action)}`);
    }

    // Publish completion event to RabbitMQ for cross-service awareness
    await this.rabbitMQService.publish({
      type: `order.${String(action)}`,
      data: { orderId, userId, ...payload },
      timestamp: Date.now(),
      idempotencyKey,
    });
  }

  private async handleSendConfirmation(orderId: number, userId: number) {
    this.logger.log(`Sending order confirmation email for order ${orderId}, user ${userId}`);

    const order = await this.prisma.order.findFirst({
      where: { id: orderId },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!order) {
      this.logger.warn(`Order ${orderId} not found for confirmation email`);
      return;
    }

    // Integration point: await this.emailService.sendOrderConfirmation(order);
    this.logger.log(`Confirmation email queued for order ${orderId}`);
  }

  private async handleUpdateInventory(orderId: number) {
    this.logger.log(`Updating inventory for order ${orderId}`);

    const order = await this.prisma.order.findFirst({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      this.logger.warn(`Order ${orderId} not found for inventory update`);
      return;
    }

    // Inventory updates are handled transactionally in OrderService,
    // but this processor can handle post-payment inventory finalization
    // Integration point: await this.inventoryService.finalizeStock(order.items);
    this.logger.log(`Inventory finalized for order ${orderId}`);
  }

  private async handleSendNotification(
    orderId: number,
    userId: number,
    payload: Record<string, unknown>
  ) {
    this.logger.log(`Sending notification for order ${orderId}, user ${userId}`);

    const notificationType = payload.type as string;

    await this.prisma.notification.create({
      data: {
        userId,
        orderId,
        type: this.mapNotificationType(notificationType) as NotificationType,
        channel: 'EMAIL',
        recipient: '', // Would be populated from user email
        subject: `Order Update: ${orderId}`,
        body: JSON.stringify(payload),
        payload: payload as unknown as Prisma.InputJsonValue,
        status: 'PENDING',
        scheduledAt: new Date(),
        maxAttempts: 3,
      },
    });

    this.logger.log(`Notification record created for order ${orderId}`);
  }

  private async handleProcessPayment(orderId: number) {
    this.logger.log(`Processing payment for order ${orderId}`);

    const order = await this.prisma.order.findFirst({
      where: { id: orderId },
    });

    if (!order) {
      this.logger.warn(`Order ${orderId} not found for payment processing`);
      return;
    }

    // Payment processing logic
    // Integration point: await this.paymentService.capturePayment(order);
    this.logger.log(`Payment processed for order ${orderId}`);
  }

  private mapNotificationType(type: string): string {
    const mapping: Record<string, string> = {
      ORDER_PLACED: 'ORDER_PLACED',
      ORDER_STATUS_UPDATED: 'ORDER_STATUS_UPDATED',
      ORDER_CANCELLED: 'ORDER_CANCELLED',
      PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
    };

    return mapping[type] ?? 'ORDER_PLACED';
  }
}
