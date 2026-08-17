import { Module } from '@nestjs/common';
import { RedisCacheModule } from '@/cache/redis-cache.module';
import { RolesGuard } from '@/auth/rolesguard';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule, RedisCacheModule],
  controllers: [SettingsController],
  providers: [SettingsService, RolesGuard],
})
export class SettingsModule {}
