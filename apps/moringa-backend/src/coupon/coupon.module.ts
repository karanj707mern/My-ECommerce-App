import { Module } from '@nestjs/common';
import { AuthSharedModule } from '@/auth/auth-shared.module';
import { CouponController } from './coupon.controller';
import { CouponService } from './coupon.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [
    AuthSharedModule,PrismaModule],
  controllers: [CouponController],
  providers: [CouponService],
  exports: [CouponService],
})
export class CouponModule {}
