import { Module } from '@nestjs/common';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { RedisCacheModule } from '@/cache/redis-cache.module';
import { RolesGuard } from '@/auth/rolesguard';

@Module({
  imports: [PrismaModule, RedisCacheModule],
  controllers: [WishlistController],
  providers: [WishlistService, RolesGuard],
})
export class WishlistModule {}
