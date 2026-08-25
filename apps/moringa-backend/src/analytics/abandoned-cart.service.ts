import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AbandonedCartService {
  constructor(private readonly prisma: PrismaService) {}

  async createFromCart(
    userId?: number,
    guestToken?: string,
    items: { productId: number; quantity: number }[] = []
  ) {
    for (const item of items) {
      await this.prisma.abandonedCart.create({
        data: {
          userId,
          guestToken,
          productId: item.productId,
          quantity: item.quantity,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  /**
   * Delete abandoned-cart records whose expiry has passed (legacy parity).
   */
  async cleanupExpired(): Promise<void> {
    const now = new Date();

    await this.prisma.abandonedCart.deleteMany({
      where: {
        expiresAt: { lte: now },
      },
    });
  }
}
