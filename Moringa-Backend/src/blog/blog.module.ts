import { Module } from '@nestjs/common';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { RedisCacheModule } from '@/cache/redis-cache.module';
import { RolesGuard } from '@/auth/rolesguard';
import { StorageModule } from '@/storage/storage.module';

@Module({
  imports: [PrismaModule, RedisCacheModule, StorageModule],
  controllers: [BlogController],
  providers: [BlogService, RolesGuard],
  exports: [BlogService],
})
export class BlogModule {}
