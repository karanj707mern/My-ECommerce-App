import { Module } from '@nestjs/common';
import { CouponController } from './coupon.controller';
import { CouponService } from './coupon.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { RolesGuard } from '@/auth/rolesguard';
import { AuditModule } from '@/audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [CouponController],
  providers: [CouponService, RolesGuard],
  exports: [CouponService],
})
export class CouponModule {}
