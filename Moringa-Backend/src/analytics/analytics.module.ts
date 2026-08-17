import { Module } from '@nestjs/common';
import { RecentlyViewedController } from './recently-viewed.controller';
import { RecentlyViewedService } from './recently-viewed.service';
import { AbandonedCartService } from './abandoned-cart.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { RedisCacheModule } from '@/cache/redis-cache.module';
import { CronService } from './cron.service';

@Module({
  imports: [PrismaModule, RedisCacheModule],
  controllers: [RecentlyViewedController],
  providers: [RecentlyViewedService, AbandonedCartService, CronService],
  exports: [RecentlyViewedService, AbandonedCartService],
})
export class AnalyticsModule {}
