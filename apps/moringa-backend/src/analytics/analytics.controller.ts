import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/jwt.guard';
import { AnalyticsService } from './analytics.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('sales')
  @ApiOperation({ summary: 'Get sales analytics' })
  @ApiResponse({ status: 200, description: 'Sales stats retrieved' })
  getSales() {
    return this.analyticsService.getSalesStats();
  }
}
