import { Module } from '@nestjs/common';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { AuthModule } from '@/auth/auth.module';
import { RedisCacheModule } from '@/cache/redis-cache.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { RolesGuard } from '@/auth/rolesguard';
import { AuditModule } from '@/audit/audit.module';

@Module({
  imports: [AuthModule, RedisCacheModule, PrismaModule, AuditModule],
  controllers: [ReviewController],
  providers: [ReviewService, RolesGuard],
})
export class ReviewModule {}
