import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisCacheService } from '@/cache/redis-cache.service';
import { Product } from '@prisma/client';

@Injectable()
export class RecentlyViewedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
  ) {}

  async addView(userId: number, productId: number) {
    await this.prisma.recentlyViewed.create({
      data: { userId, productId },
    });

    await this.cache.del(`recently-viewed:user:${userId}`);

    const count = await this.prisma.recentlyViewed.count({
      where: { userId },
    });

    if (count > 50) {
      const overflow = count - 50;
      const oldest = await this.prisma.recentlyViewed.findMany({
        where: { userId },
        orderBy: { viewedAt: 'asc' },
        take: overflow,
        select: { id: true },
      });

      await this.prisma.recentlyViewed.deleteMany({
        where: { id: { in: oldest.map((row) => row.id) } },
      });
    }
  }

  async getRecentlyViewed(userId: number, limit = 20): Promise<Product[]> {
    const cacheKey = `recently-viewed:user:${userId}`;
    const cached = await this.cache.getJson<Product[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const entries = await this.prisma.recentlyViewed.findMany({
      where: { userId },
      orderBy: { viewedAt: 'desc' },
      take: limit,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            image: true,
            stock: true,
            slug: true,
          },
        },
      },
    });

    const result = entries
      .map((entry) => entry.product)
      .filter((product): product is Product => product !== null);

    await this.cache.setJson(cacheKey, result, 300);
    return result;
  }

  async clearHistory(userId: number) {
    await this.prisma.recentlyViewed.deleteMany({
      where: { userId },
    });

    await this.cache.del(`recently-viewed:user:${userId}`);
  }
}
