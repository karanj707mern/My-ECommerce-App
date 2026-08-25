import { Module } from '@nestjs/common';
import { AuthSharedModule } from '../auth/auth-shared.module';
import { CouponController } from './coupon.controller';
import { CouponService } from './coupon.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesGuard } from '../auth/rolesguard';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuthSharedModule, PrismaModule, AuditModule],
  controllers: [CouponController],
  providers: [CouponService, RolesGuard],
  exports: [CouponService],
})
export class CouponModule {}
