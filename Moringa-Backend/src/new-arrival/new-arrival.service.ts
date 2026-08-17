import { Injectable, NotFoundException } from '@nestjs/common';
import type { Multer } from 'multer';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';

@Injectable()
export class NewArrivalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  private async getFilesystemImages(): Promise<
    {
      url: string;
      alt: string | null;
      sortOrder: number;
      active: boolean;
      comingSoon: boolean;
    }[]
  > {
    if (this.storageService.isCloudinaryProvider) {
      return [];
    }

    const files = this.storageService.listFiles('new-arrivals');
    await Promise.resolve();
    return files.map((file) => ({
      url: `/uploads/new-arrivals/${file}`,
      alt: null,
      sortOrder: 0,
      active: true,
      comingSoon: false,
    }));
  }

  async findAll() {
    const dbImages = await this.prisma.newArrival.findMany({
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
          comingSoon: fsImage.comingSoon,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    merged.sort((a, b) => a.sortOrder - b.sortOrder);

    return merged;
  }

  async findActive() {
    const dbImages = await this.prisma.newArrival.findMany({
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
          comingSoon: fsImage.comingSoon,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    merged.sort((a, b) => a.sortOrder - b.sortOrder);

    return merged;
  }

  async findOne(id: number) {
    const image = await this.prisma.newArrival.findUnique({
      where: { id },
    });

    if (!image) {
      throw new NotFoundException(`New arrival image with ID ${id} not found`);
    }

    return image;
  }

  async create(data: {
    url: string;
    alt?: string | null;
    sortOrder?: number;
    active?: boolean;
    comingSoon?: boolean;
  }) {
    return this.prisma.newArrival.create({
      data: {
        url: data.url,
        alt: data.alt,
        sortOrder: data.sortOrder ?? 0,
        active: data.active ?? true,
        comingSoon: data.comingSoon ?? false,
      },
    });
  }

  async uploadImage(file: Multer.File, metadata?: Record<string, unknown>) {
    const result = await this.storageService.uploadFile(
      file,
      'new-arrivals',
      'new-arrival',
    );

    return this.create({
      url: result.url,
      alt: (metadata?.alt as string) || null,
      sortOrder: (metadata?.sortOrder as number) ?? 0,
      active: (metadata?.active as boolean) ?? true,
      comingSoon: (metadata?.comingSoon as boolean) ?? false,
    });
  }

  async update(
    id: number,
    data: {
      url?: string;
      alt?: string | null;
      sortOrder?: number;
      active?: boolean;
      comingSoon?: boolean;
    },
  ) {
    const existing = await this.prisma.newArrival.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException(`New arrival image with ID ${id} not found`);
    }

    return this.prisma.newArrival.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    const existing = await this.prisma.newArrival.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException(`New arrival image with ID ${id} not found`);
    }

    return this.prisma.newArrival.delete({
      where: { id },
    });
  }
}
