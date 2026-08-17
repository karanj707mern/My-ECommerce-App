import { Injectable, NotFoundException } from '@nestjs/common';
import type { Multer } from 'multer';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisCacheService } from '@/cache/redis-cache.service';
import { StorageService } from '@/storage/storage.service';

@Injectable()
export class HeroService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
    private readonly storageService: StorageService,
  ) {}

  private async getFilesystemImages(): Promise<
    { url: string; alt: string | null; sortOrder: number; active: boolean }[]
  > {
    // Don't list local filesystem images when Cloudinary is the provider.
    // Cloudinary doesn't expose directory listing, and DB records already
    // contain the canonical Cloudinary URLs after migration.
    if (this.storageService.isCloudinaryProvider) {
      return [];
    }

    const files = this.storageService.listFiles('hero');
    await Promise.resolve();
    return files.map((file) => ({
      url: this.storageService.getSignedUrl(`hero/${file}`),
      alt: null,
      sortOrder: 0,
      active: true,
    }));
  }

  async findAll() {
    const cacheKey = 'hero:all';
    const cached =
      await this.cache.getJson<
        {
          url: string;
          alt: string | null;
          sortOrder: number;
          active: boolean;
        }[]
      >(cacheKey);
    if (cached) {
      return cached;
    }

    const dbImages = await this.prisma.heroImage.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    const fsImages = await this.getFilesystemImages();

    const dbUrls = new Set(dbImages.map((img) => img.url));

    const merged = [...dbImages];

    for (const fsImage of fsImages) {
      if (!dbUrls.has(fsImage.url)) {
        merged.push({
          id: 0,
          url: fsImage.url,
          alt: fsImage.alt,
          sortOrder: fsImage.sortOrder,
          active: fsImage.active,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    merged.sort((a, b) => a.sortOrder - b.sortOrder);

    await this.cache.setJson(cacheKey, merged, 300);
    return merged;
  }

  async findActive() {
    const cacheKey = 'hero:active';
    const cached =
      await this.cache.getJson<
        {
          url: string;
          alt: string | null;
          sortOrder: number;
          active: boolean;
        }[]
      >(cacheKey);
    if (cached) {
      return cached;
    }

    const dbImages = await this.prisma.heroImage.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });

    const fsImages = await this.getFilesystemImages();

    const dbUrls = new Set(dbImages.map((img) => img.url));

    const merged = [...dbImages];

    for (const fsImage of fsImages) {
      if (!dbUrls.has(fsImage.url)) {
        merged.push({
          id: 0,
          url: fsImage.url,
          alt: fsImage.alt,
          sortOrder: fsImage.sortOrder,
          active: fsImage.active,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    merged.sort((a, b) => a.sortOrder - b.sortOrder);

    await this.cache.setJson(cacheKey, merged, 300);
    return merged;
  }

  async findOne(id: number) {
    const image = await this.prisma.heroImage.findUnique({
      where: { id },
    });

    if (!image) {
      throw new NotFoundException(`Hero image with ID ${id} not found`);
    }

    return image;
  }

  async create(data: {
    url: string;
    alt?: string | null;
    sortOrder?: number;
    active?: boolean;
  }) {
    const result = await this.prisma.heroImage.create({
      data: {
        url: data.url,
        alt: data.alt,
        sortOrder: data.sortOrder ?? 0,
        active: data.active ?? true,
      },
    });

    await this.cache.del('hero:all');
    await this.cache.del('hero:active');

    return result;
  }

  async uploadImage(file: Multer.File, metadata?: Record<string, unknown>) {
    const result = await this.storageService.uploadFile(
      file,
      'hero',
      'home-hero',
    );

    return this.create({
      url: result.url,
      alt: typeof metadata?.alt === 'string' ? metadata.alt : null,
      sortOrder:
        typeof metadata?.sortOrder === 'number' ? metadata.sortOrder : 0,
      active: metadata?.active !== undefined ? Boolean(metadata.active) : true,
    });
  }

  async update(
    id: number,
    data: {
      url?: string;
      alt?: string | null;
      sortOrder?: number;
      active?: boolean;
    },
  ) {
    const existing = await this.prisma.heroImage.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException(`Hero image with ID ${id} not found`);
    }

    const result = await this.prisma.heroImage.update({
      where: { id },
      data,
    });

    await this.cache.del('hero:all');
    await this.cache.del('hero:active');

    return result;
  }

  async remove(id: number) {
    const existing = await this.prisma.heroImage.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException(`Hero image with ID ${id} not found`);
    }

    await this.prisma.heroImage.delete({
      where: { id },
    });

    await this.cache.del('hero:all');
    await this.cache.del('hero:active');
  }
}
