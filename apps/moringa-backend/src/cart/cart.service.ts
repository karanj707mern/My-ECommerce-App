import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisCacheService } from '@/cache/redis-cache.service';
import { AbandonedCartService } from '@/analytics/abandoned-cart.service';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abandonedCartService: AbandonedCartService,
    private readonly cache: RedisCacheService,
  ) {}

  async create(userId: number, dto: { productId: number; quantity?: number }) {
    const { productId, quantity = 1 } = dto;

    const existing = await this.prisma.cartItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing) {
      return this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity },
      });
    }

    return this.prisma.cartItem.create({
      data: { userId, productId, quantity },
    });
  }

  async findAll(userId: number) {
    return this.prisma.cartItem.findMany({
      where: { userId },
      include: { product: { select: { id: true, name: true, price: true, image: true, stock: true, slug: true } } },
      orderBy: { id: 'desc' },
    });
  }

  async remove(userId: number, id: number) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id, userId },
    });

    if (!item) {
      throw new Error('Cart item not found');
    }

    await this.abandonedCartService.createFromCart(userId, undefined, [
      { productId: item.productId, quantity: item.quantity },
    ]);

    await this.prisma.cartItem.delete({ where: { id: item.id } });
    return { message: 'Item removed' };
  }
}
