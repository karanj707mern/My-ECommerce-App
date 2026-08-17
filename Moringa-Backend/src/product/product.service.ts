import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisCacheService } from '@/cache/redis-cache.service';
import { StorageService } from '@/storage/storage.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import type { File as MulterFile } from 'multer';

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
    private readonly storageService: StorageService,
  ) {}

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private normalizeTags(tags?: string[]) {
    return Array.from(
      new Set(
        (tags || [])
          .map((tag) => tag.trim())
          .filter(Boolean)
          .map((tag) => tag.toLowerCase()),
      ),
    );
  }

  private normalizeCreateProductPayload(data: CreateProductDto) {
    return {
      ...data,
      name: data.name.trim(),
      slug: data.slug.trim().toLowerCase(),
      sku: data.sku.trim().toUpperCase(),
      description: data.description.trim(),
      image: data.image.trim(),
      brand: data.brand?.trim() || null,
      tags: data.tags ? this.normalizeTags(data.tags) : undefined,
      seoTitle: data.seoTitle?.trim() || null,
      seoDescription: data.seoDescription?.trim() || null,
      weightGrams: data.weightGrams ?? null,
      compareAtPrice: data.compareAtPrice ?? null,
      isActive: data.isActive ?? true,
      isNewArrival: data.isNewArrival ?? false,
    };
  }

  private normalizeUpdateProductPayload(data: UpdateProductDto) {
    return {
      ...data,
      name: data.name?.trim(),
      slug: data.slug?.trim().toLowerCase(),
      sku: data.sku?.trim().toUpperCase(),
      description: data.description?.trim(),
      image: data.image?.trim(),
      brand: data.brand === undefined ? undefined : data.brand.trim() || null,
      tags: data.tags ? this.normalizeTags(data.tags) : undefined,
      seoTitle:
        data.seoTitle === undefined ? undefined : data.seoTitle.trim() || null,
      seoDescription:
        data.seoDescription === undefined
          ? undefined
          : data.seoDescription.trim() || null,
      weightGrams: data.weightGrams ?? undefined,
      compareAtPrice: data.compareAtPrice ?? undefined,
      isActive: data.isActive ?? undefined,
      isNewArrival: data.isNewArrival ?? undefined,
    };
  }

  async uploadProductImage(file: MulterFile): Promise<{ url: string }> {
    const result = await this.storageService.uploadFile(
      file,
      'products',
      'product',
    );
    return { url: result.url };
  }

  async createProduct(data: CreateProductDto) {
    try {
      const product = await this.prisma.product.create({
        data: this.normalizeCreateProductPayload(data),
      });
      await this.invalidateProductCaches(product.id);
      return product;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Product slug or SKU already exists.');
      }

      throw error;
    }
  }

  async getProducts(includeInactive = false, skip = 0, take = 50) {
    const cappedTake = Math.min(take, 50);
    const cacheKey = includeInactive
      ? `products:all:${skip}:${cappedTake}`
      : `products:active:${skip}:${cappedTake}`;
    const cached =
      await this.cache.getJson<Record<string, unknown>[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const products = await this.prisma.product.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: cappedTake,
    });

    await this.cache.setJson(cacheKey, products, 300);
    return products;
  }

  async getNewArrivals(limit = 8) {
    const cacheKey = `products:new-arrivals:${limit}`;
    const cached =
      await this.cache.getJson<Record<string, unknown>[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const products = await this.prisma.product.findMany({
      where: { isActive: true, isNewArrival: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    await this.cache.setJson(cacheKey, products, 300);
    return products;
  }

  async getProductById(id: number, includeInactive = false) {
    const cacheKey = `product:${id}${includeInactive ? ':all' : ''}`;
    const cached = await this.cache.getJson<Record<string, unknown>>(cacheKey);
    if (cached) {
      return cached;
    }

    const product = await this.prisma.product.findUnique({
      where: {
        id,
        ...(includeInactive ? {} : { isActive: true }),
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.cache.setJson(cacheKey, product, 300);
    return product;
  }

  async updateProduct(id: number, data: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Product not found');
    }

    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: this.normalizeUpdateProductPayload(data),
      });
      await this.invalidateProductCaches(id);
      return product;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Product slug or SKU already exists.');
      }

      throw error;
    }
  }

  async deleteProduct(id: number) {
    const product = await this.prisma.product.delete({
      where: { id },
    });
    await this.invalidateProductCaches(id);
    return product;
  }

  private async invalidateProductCaches(productId?: number) {
    const keys = ['products:active', 'products:all', 'products:new-arrivals:8'];

    if (productId) {
      keys.push(`product:${productId}`);
      keys.push(`product:${productId}:all`);
    }

    await Promise.all(keys.map((key) => this.cache.del(key)));
  }
}
