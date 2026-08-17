import { Module } from '@nestjs/common';
import { HeroController } from './hero.controller';
import { HeroService } from './hero.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { RedisCacheModule } from '@/cache/redis-cache.module';
import { StorageModule } from '@/storage/storage.module';

@Module({
  imports: [PrismaModule, RedisCacheModule, StorageModule],
  controllers: [HeroController],
  providers: [HeroService],
  exports: [HeroService],
})
export class HeroModule {}
