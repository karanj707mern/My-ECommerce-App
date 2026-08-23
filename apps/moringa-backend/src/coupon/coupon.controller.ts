import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  Param,
  Patch,
  Delete,
  HttpCode,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/jwt.guard';
import { RolesGuard } from '@/auth/rolesguard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { AuditInterceptor } from '@/audit/audit.interceptor';
import { AuditLog } from '@/audit/audit-logger.decorator';
import { CouponService } from './coupon.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('coupons')
@Controller('coupon')
@UseInterceptors(AuditInterceptor)
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Post('validate')
  validate(
    @Body()
    body: {
      code: string;
      orderValue: number;
      userId?: number;
    },
  ) {
    return this.couponService.validateForUser(
      body.code,
      body.orderValue,
      body.userId ?? 0,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get()
  findAll() {
    return this.couponService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('analytics')
  getAnalytics() {
    return this.couponService.getCouponAnalytics();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  @HttpCode(201)
  @AuditLog('CREATE', 'Coupon')
  @ApiOperation({ summary: 'Create coupon' })
  @ApiResponse({ status: 201, description: 'Coupon created' })
  create(@Body() dto: CreateCouponDto) {
    return this.couponService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  @AuditLog('UPDATE', 'Coupon')
  @ApiOperation({ summary: 'Update coupon' })
  @ApiResponse({ status: 200, description: 'Coupon updated' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateCouponDto) {
    return this.couponService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(204)
  @AuditLog('DELETE', 'Coupon')
  @ApiOperation({ summary: 'Delete coupon' })
  @ApiResponse({ status: 204, description: 'Coupon deleted' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.couponService.remove(id);
  }
}
