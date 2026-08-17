import { Module } from '@nestjs/common';
import { RedisCacheModule } from '@/cache/redis-cache.module';
import { RolesGuard } from '@/auth/rolesguard';
import { ProductController } from './product.controller';
import { ProductGateway } from './product.gateway';
import { ProductService } from './product.service';
import { StorageModule } from '@/storage/storage.module';
import { AuditModule } from '@/audit/audit.module';

@Module({
  imports: [RedisCacheModule, StorageModule, AuditModule],
  controllers: [ProductController],
  providers: [ProductService, RolesGuard, ProductGateway],
})
export class ProductModule {}
