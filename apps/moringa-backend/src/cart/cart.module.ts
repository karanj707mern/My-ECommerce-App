import { Injectable } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { RedisCacheService } from '@/cache/redis-cache.service';
import { AbandonedCartService } from '@/analytics/abandoned-cart.service';

@Module({
  imports: [PrismaModule],
  controllers: [CartController],
  providers: [CartService, RedisCacheService, AbandonedCartService],
  exports: [CartService],
})
export class CartModule {}
