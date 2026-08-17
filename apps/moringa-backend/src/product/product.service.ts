import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisCacheService } from '@/cache/redis-cache.service';
import { StorageService } from '@/storage/storage.service';

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
    private readonly storageService: StorageService,
  ) {}

  async getProducts(includeInactive = false, skip = 0, take = 50) {
    const products = await this.prisma.product.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: Math.min(take, 50),
    });

    return products;
  }

  async getNewArrivals(limit = 8) {
    return this.prisma.product.findMany({
      where: { isActive: true, isNewArrival: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getProductById(id: number, includeInactive = false) {
    const product = await this.prisma.product.findUnique({
      where: {
        id,
        ...(includeInactive ? {} : { isActive: true }),
      },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    return product;
  }
}
