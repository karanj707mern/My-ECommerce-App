import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuditLoggerService } from './audit-logger.service';
import { AuditInterceptor } from './audit.interceptor';
import { AuditController } from './audit.controller';

@Module({
  imports: [PrismaModule],
  providers: [AuditLoggerService, AuditInterceptor],
  controllers: [AuditController],
  exports: [AuditLoggerService, AuditInterceptor],
})
export class AuditModule {}
