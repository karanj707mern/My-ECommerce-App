import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class CouponService {
  constructor(private readonly prisma: PrismaService) {}

  async validate(code: string, orderValue: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code },
    });

    if (!coupon || !coupon.isActive) {
      return { valid: false, message: 'Invalid coupon code' };
    }

    if (new Date() < coupon.validFrom || new Date() > coupon.validUntil) {
      return { valid: false, message: 'Coupon is not valid at this time' };
    }

    if (coupon.minOrderValue && orderValue < coupon.minOrderValue) {
      return { valid: false, message: `Minimum order value is ${coupon.minOrderValue}` };
    }

    return { valid: true, coupon };
  }
}
