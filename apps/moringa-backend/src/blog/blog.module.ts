import { Module } from '@nestjs/common';
import { AuthSharedModule } from '@/auth/auth-shared.module';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { InfrastructureModule } from '@/infrastructure/infrastructure.module';
import { RedisCacheService } from '@/cache/redis-cache.service';
import { StorageService } from '@/storage/storage.service';

@Module({
  imports: [AuthSharedModule, PrismaModule, InfrastructureModule],
  controllers: [BlogController],
  providers: [BlogService, RedisCacheService, StorageService],
  exports: [BlogService],
})
export class BlogModule {}
