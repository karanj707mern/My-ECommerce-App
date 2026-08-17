import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { RedisCacheService } from '@/cache/redis-cache.service';
import { StorageService } from '@/storage/storage.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProductController],
  providers: [ProductService, RedisCacheService, StorageService],
  exports: [ProductService],
})
export class ProductModule {}
