import { Module } from '@nestjs/common';
import { AuthSharedModule } from '@/auth/auth-shared.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AbandonedCartService } from './abandoned-cart.service';
import { CronService } from './cron.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [
    AuthSharedModule,PrismaModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AbandonedCartService, CronService],
  exports: [AnalyticsService, AbandonedCartService],
})
export class AnalyticsModule {}
