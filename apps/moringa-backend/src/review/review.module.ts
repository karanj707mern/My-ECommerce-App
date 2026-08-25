import { Module } from '@nestjs/common';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { AuthSharedModule } from '../auth/auth-shared.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../auth/rolesguard';
import { AuditModule } from '../audit/audit.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { RedisCacheService } from '../cache/redis-cache.service';

@Module({
  imports: [AuthModule, AuthSharedModule, PrismaModule, AuditModule, InfrastructureModule],
  controllers: [ReviewController],
  providers: [ReviewService, RolesGuard, RedisCacheService],
  exports: [ReviewService],
})
export class ReviewModule {}
