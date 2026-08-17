import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AbandonedCartService } from './abandoned-cart.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AbandonedCartService],
  exports: [AnalyticsService, AbandonedCartService],
})
export class AnalyticsModule {}
