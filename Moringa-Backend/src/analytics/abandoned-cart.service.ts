import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AbandonedCartService {
  private readonly defaultExpiryHours = 24 * 30;

  constructor(private readonly prisma: PrismaService) {}

  async createFromCart(
    userId: number | undefined,
    guestToken: string | undefined,
    items: { productId: number; quantity: number }[],
    expiryHours = this.defaultExpiryHours,
  ) {
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    await this.prisma.abandonedCart.createMany({
      data: items.map((item) => ({
        userId: userId ?? null,
        guestToken: guestToken ?? null,
        productId: item.productId,
        quantity: item.quantity,
        expiresAt,
      })),
    });
  }

  async getRecoverableCarts(
    userId: number | undefined,
    guestToken: string | undefined,
  ): Promise<
    {
      id: number;
      userId: number | null;
      guestToken: string | null;
      productId: number;
      quantity: number;
      recovered: boolean;
      recoveredAt: Date | null;
      createdAt: Date;
      expiresAt: Date;
      product: {
        id: number;
        name: string;
        price: number;
        image: string | null;
        slug: string;
        stock: number;
      };
    }[]
  > {
    const now = new Date();
    const where: Record<string, unknown> = {
      recovered: false,
      expiresAt: { gt: now },
    };

    if (userId !== undefined) {
      where.userId = userId;
    } else if (guestToken) {
      where.guestToken = guestToken;
    } else {
      return [];
    }

    return this.prisma.abandonedCart.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            image: true,
            slug: true,
            stock: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markRecovered(userId: number | undefined, guestToken?: string) {
    const where: Record<string, unknown> = {
      recovered: false,
    };

    if (userId) {
      where.userId = userId;
    } else if (guestToken) {
      where.guestToken = guestToken;
    } else {
      return;
    }

    await this.prisma.abandonedCart.updateMany({
      where,
      data: {
        recovered: true,
        recoveredAt: new Date(),
      },
    });
  }

  async cleanupExpired() {
    const now = new Date();

    await this.prisma.abandonedCart.deleteMany({
      where: {
        expiresAt: { lte: now },
      },
    });
  }
}
