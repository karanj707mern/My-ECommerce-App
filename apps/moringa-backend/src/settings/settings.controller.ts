import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { SettingsService } from './settings.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('store')
  @ApiOperation({ summary: 'Get store settings' })
  @ApiResponse({ status: 200, description: 'Store settings retrieved' })
  getStoreSettings() {
    return this.settingsService.getStoreSettings();
  }
}
