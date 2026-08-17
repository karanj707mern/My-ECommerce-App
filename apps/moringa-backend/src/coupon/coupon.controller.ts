import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/jwt.guard';
import { CouponService } from './coupon.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('coupons')
@Controller('coupon')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @UseGuards(JwtAuthGuard)
  @Post('validate')
  @ApiOperation({ summary: 'Validate coupon code' })
  @ApiResponse({ status: 200, description: 'Coupon validated' })
  validate(@Body() dto: { code: string; orderValue: number }) {
    return this.couponService.validate(dto.code, dto.orderValue);
  }
}
