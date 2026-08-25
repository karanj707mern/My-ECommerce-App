import { Module } from '@nestjs/common';
import { AuthSharedModule } from '../auth/auth-shared.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { RedisCacheService } from '../cache/redis-cache.service';
import { AbandonedCartService } from '../analytics/abandoned-cart.service';

@Module({
  imports: [
    AuthSharedModule,PrismaModule, InfrastructureModule],
  controllers: [CartController],
  providers: [CartService, RedisCacheService, AbandonedCartService],
  exports: [CartService],
})
export class CartModule {}
