import { RedisCacheService } from '@/cache/redis-cache.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UpdateStoreSettingsDto } from './dto/update-store-settings.dto';

const STORE_SETTINGS_ID = 1;

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
  ) {}

  private buildShippingZones() {
    return [
      {
        key: 'DOMESTIC',
        label: 'India',
        countries: ['india'],
        allowedShippingTypes: ['standard', 'express', 'sameDay', 'prime'],
        taxRate: null,
        shippingMultiplier: 1,
      },
      {
        key: 'INTERNATIONAL',
        label: 'Rest of world',
        countries: [],
        allowedShippingTypes: ['standard'],
        taxRate: 0,
        shippingMultiplier: 2,
      },
    ];
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  private buildShippingOptions(settings: {
    shippingCharge: number;
    expressShippingCharge: number;
    sameDayShippingCharge: number;
  }) {
    return [
      {
        key: 'standard',
        label: 'Standard Delivery',
        amount: settings.shippingCharge,
        etaDays: 4,
      },
      {
        key: 'express',
        label: 'Express Delivery',
        amount: settings.expressShippingCharge,
        etaDays: 2,
      },
      {
        key: 'sameDay',
        label: 'Same Day Delivery',
        amount: settings.sameDayShippingCharge,
        etaDays: 1,
      },
    ];
  }

  async getStoreSettings() {
    const cacheKey = 'store:settings';
    const cached = await this.cache.getJson<unknown>(cacheKey);
    if (cached) {
      return cached;
    }

    const existing = await this.prisma.storeSettings.findUnique({
      where: { id: STORE_SETTINGS_ID },
    });

    let result: any;
    if (existing) {
      result = {
        ...existing,
        shippingOptions: this.buildShippingOptions(existing),
        shippingZones: existing.shippingZones || this.buildShippingZones(),
      };
    } else {
      result = await this.prisma.storeSettings.create({
        data: {
          id: STORE_SETTINGS_ID,
          shippingCharge: 99,
          expressShippingCharge: 149,
          sameDayShippingCharge: 249,
          codCharge: 25,
          handlingCharge: 20,
          taxRate: 0,
          freeShippingThreshold: 1500,
          shippingOptions: this.buildShippingOptions({
            shippingCharge: 99,
            expressShippingCharge: 149,
            sameDayShippingCharge: 249,
          }),
          shippingZones: this.buildShippingZones(),
          codEnabled: true,
          maxCodOrderValue: 5000,
          allowInternationalCod: false,
          autoCancelPendingMinutes: 30,
        },
      });
    }

    if (this.cache.isEnabled) {
      await this.cache.setJson(cacheKey, result, 300);
    }

    return result; // eslint-disable-line @typescript-eslint/no-unsafe-return
  }

  async updateStoreSettings(dto: UpdateStoreSettingsDto) {
    const cacheKey = 'store:settings';

    const settings = await this.prisma.storeSettings.findUnique({
      where: { id: STORE_SETTINGS_ID },
    });

    if (!settings) {
      const result = await this.prisma.storeSettings.create({
        data: {
          id: STORE_SETTINGS_ID,
          shippingCharge: dto.shippingCharge,
          expressShippingCharge: dto.expressShippingCharge,
          sameDayShippingCharge: dto.sameDayShippingCharge,
          codCharge: dto.codCharge,
          handlingCharge: dto.handlingCharge,
          taxRate: dto.taxRate,
          freeShippingThreshold: dto.freeShippingThreshold ?? null,
          shippingOptions: this.buildShippingOptions(dto),
          shippingZones: this.toJsonValue(
            dto.shippingZones ?? this.buildShippingZones(),
          ),
          codEnabled: dto.codEnabled ?? true,
          maxCodOrderValue: dto.maxCodOrderValue ?? 5000,
          allowInternationalCod: dto.allowInternationalCod ?? false,
          autoCancelPendingMinutes: dto.autoCancelPendingMinutes ?? 30,
        },
      });

      if (this.cache.isEnabled) {
        await this.cache.del(cacheKey);
      }

      return result;
    }

    const result = await this.prisma.storeSettings.update({
      where: { id: STORE_SETTINGS_ID },
      data: {
        shippingCharge: dto.shippingCharge,
        expressShippingCharge: dto.expressShippingCharge,
        sameDayShippingCharge: dto.sameDayShippingCharge,
        codCharge: dto.codCharge,
        handlingCharge: dto.handlingCharge,
        taxRate: dto.taxRate,
        freeShippingThreshold: dto.freeShippingThreshold ?? null,
        shippingOptions: this.buildShippingOptions(dto),
        shippingZones: this.toJsonValue(
          dto.shippingZones ??
            settings.shippingZones ??
            this.buildShippingZones(),
        ),
        codEnabled: dto.codEnabled ?? settings.codEnabled,
        maxCodOrderValue: dto.maxCodOrderValue ?? settings.maxCodOrderValue,
        allowInternationalCod:
          dto.allowInternationalCod ?? settings.allowInternationalCod,
        autoCancelPendingMinutes:
          dto.autoCancelPendingMinutes ?? settings.autoCancelPendingMinutes,
      },
    });

    if (this.cache.isEnabled) {
      await this.cache.del(cacheKey);
    }

    return result;
  }
}
