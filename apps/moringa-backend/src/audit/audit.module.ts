import { Module } from '@nestjs/common';
import { AuthSharedModule } from '@/auth/auth-shared.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuditLoggerService } from './audit-logger.service';
import { AuditService } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';
import { AuditController } from './audit.controller';

@Module({
  imports: [PrismaModule, AuthSharedModule],
  providers: [AuditLoggerService, AuditService, AuditInterceptor],
  controllers: [AuditController],
  exports: [AuditLoggerService, AuditService, AuditInterceptor],
})
export class AuditModule {}
