import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStoreSettings() {
    return this.prisma.storeSettings.findFirst();
  }

  async updateStoreSettings(data: Record<string, unknown>) {
    return this.prisma.storeSettings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data } as never,
    });
  }
}
