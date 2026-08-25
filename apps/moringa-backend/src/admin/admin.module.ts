import { Module } from '@nestjs/common';
import { AuthSharedModule } from '../auth/auth-shared.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesGuard } from '../auth/rolesguard';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuthSharedModule, PrismaModule, AuditModule],
  controllers: [AdminController],
  providers: [AdminService, RolesGuard],
  exports: [AdminService],
})
export class AdminModule {}
