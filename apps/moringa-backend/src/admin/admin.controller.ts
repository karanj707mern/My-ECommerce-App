import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/rolesguard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminService, type AdminOverview } from './admin.service';
import { AuditInterceptor } from '../audit/audit.interceptor';

@ApiTags('admin')
@Controller('admin')
@UseInterceptors(AuditInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get admin overview' })
  @ApiResponse({ status: 200, description: 'Admin overview retrieved' })
  getOverview(): Promise<AdminOverview> {
    return this.adminService.getOverview();
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard stats' })
  @ApiResponse({ status: 200, description: 'Dashboard stats retrieved' })
  getDashboard() {
    return this.adminService.getDashboardStats();
  }
}
