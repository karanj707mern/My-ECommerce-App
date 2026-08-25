import { Module } from '@nestjs/common';
import { AuthSharedModule } from '../auth/auth-shared.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { RecentlyViewedController } from './recently-viewed.controller';
import { RecentlyViewedService } from './recently-viewed.service';
import { RedisCacheService } from '../cache/redis-cache.service';
import { AbandonedCartService } from './abandoned-cart.service';
import { CronService } from './cron.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';

@Module({
  imports: [AuthSharedModule, PrismaModule, InfrastructureModule],
  controllers: [AnalyticsController, RecentlyViewedController],
  providers: [
    AnalyticsService,
    RecentlyViewedService,
    RedisCacheService,
    AbandonedCartService,
    CronService,
  ],
  exports: [AnalyticsService, RecentlyViewedService, AbandonedCartService],
})
export class AnalyticsModule {}
