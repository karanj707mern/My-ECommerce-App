import { PrismaService } from '@/prisma/prisma.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateCouponDto } from './dto/create-coupon.dto';

@Injectable()
export class CouponService {
  constructor(private readonly prisma: PrismaService) {}

  async validate(code: string, orderValue: number) {
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        code: { equals: code.toUpperCase(), mode: 'insensitive' },
        isActive: true,
        validFrom: { lte: new Date() },
        validUntil: { gte: new Date() },
      },
    });

    if (!coupon) {
      throw new BadRequestException('Invalid or expired coupon code.');
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('This coupon has reached its usage limit.');
    }

    if (coupon.minOrderValue && orderValue < coupon.minOrderValue) {
      throw new BadRequestException(
        `Minimum order value of ${coupon.minOrderValue} required for this coupon.`,
      );
    }

    let discountAmount: number;

    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = (orderValue * coupon.discountValue) / 100;
      if (coupon.maxDiscount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    return {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      finalAmount: Math.max(0, orderValue - discountAmount),
    };
  }

  async validateForUser(code: string, orderValue: number, userId: number) {
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        code: { equals: code.toUpperCase(), mode: 'insensitive' },
        isActive: true,
        validFrom: { lte: new Date() },
        validUntil: { gte: new Date() },
      },
    });

    if (!coupon) {
      throw new BadRequestException('Invalid or expired coupon code.');
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('This coupon has reached its usage limit.');
    }

    if (
      userId > 0 &&
      coupon.perUserLimit !== null &&
      coupon.perUserLimit !== undefined
    ) {
      const userUsageCount = await this.prisma.couponUsage.count({
        where: { couponId: coupon.id, userId },
      });
      if (userUsageCount >= coupon.perUserLimit) {
        throw new BadRequestException(
          'You have reached the maximum number of times this coupon can be used.',
        );
      }
    }

    if (coupon.minOrderValue && orderValue < coupon.minOrderValue) {
      throw new BadRequestException(
        `Minimum order value of ${coupon.minOrderValue} required for this coupon.`,
      );
    }

    let discountAmount: number;

    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = (orderValue * coupon.discountValue) / 100;
      if (coupon.maxDiscount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    return {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      finalAmount: Math.max(0, orderValue - discountAmount),
    };
  }

  async recordUsage(couponId: number, userId: number, orderId: number) {
    await this.prisma.$transaction(async (tx) => {
      const coupon = await tx.coupon.findFirst({
        where: { id: couponId },
        select: { id: true, usageLimit: true, usedCount: true },
      });

      if (!coupon) {
        throw new BadRequestException('Coupon not found.');
      }

      if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
        throw new BadRequestException(
          'This coupon has reached its usage limit.',
        );
      }

      await tx.couponUsage.create({
        data: { couponId, userId, orderId },
      });

      await tx.coupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } },
      });
    });
  }

  async getCouponAnalytics() {
    const coupons = await this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        usages: true,
      },
    });

    return coupons.map((coupon: Record<string, unknown>) => {
      const totalUsages = (coupon.usages as Record<string, unknown>[]).length;
      const totalDiscountGiven =
        coupon.discountType === 'FIXED'
          ? ((coupon.usedCount as number) || 0) *
            (coupon.discountValue as number)
          : 0;

      return {
        id: coupon.id as number,
        code: coupon.code as string,
        discountType: coupon.discountType as string,
        discountValue: coupon.discountValue as number,
        usedCount: coupon.usedCount as number,
        usageLimit: coupon.usageLimit as number | null,
        perUserLimit: coupon.perUserLimit as number | null,
        isActive: coupon.isActive as boolean,
        validFrom: coupon.validFrom as Date,
        validUntil: coupon.validUntil as Date,
        totalUsages,
        totalDiscountGiven,
      };
    });
  }

  async create(dto: CreateCouponDto) {
    return this.prisma.coupon.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minOrderValue: dto.minOrderValue ?? null,
        maxDiscount: dto.maxDiscount ?? null,
        perUserLimit: dto.perUserLimit ?? null,
        usageLimit: dto.usageLimit ?? null,
        validFrom: new Date(dto.validFrom),
        validUntil: new Date(dto.validUntil),
      },
    });
  }

  async findAll() {
    return this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: number, dto: CreateCouponDto) {
    return this.prisma.coupon.update({
      where: { id },
      data: {
        code: dto.code.trim().toUpperCase(),
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minOrderValue: dto.minOrderValue ?? null,
        maxDiscount: dto.maxDiscount ?? null,
        perUserLimit: dto.perUserLimit ?? null,
        usageLimit: dto.usageLimit ?? null,
        validFrom: new Date(dto.validFrom),
        validUntil: new Date(dto.validUntil),
      },
    });
  }

  async remove(id: number) {
    return this.prisma.coupon.delete({ where: { id } });
  }
}
