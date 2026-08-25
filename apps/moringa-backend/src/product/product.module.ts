import { Module } from '@nestjs/common';
import { AuthSharedModule } from '../auth/auth-shared.module';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { AuditModule } from '../audit/audit.module';
import { RedisCacheService } from '../cache/redis-cache.service';
import { StorageService } from '../storage/storage.service';

@Module({
  imports: [AuthSharedModule, PrismaModule, InfrastructureModule, AuditModule],
  controllers: [ProductController],
  providers: [ProductService, RedisCacheService, StorageService],
  exports: [ProductService],
})
export class ProductModule {}
