import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { AnalyticsModule } from '@/analytics/analytics.module';
import { RedisCacheModule } from '@/cache/redis-cache.module';

@Module({
  imports: [AnalyticsModule, RedisCacheModule],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}
