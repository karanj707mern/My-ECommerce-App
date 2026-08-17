import { Controller, Get } from '@nestjs/common';
import { StorageService } from './storage.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get('health')
  @ApiOperation({ summary: 'Storage health check' })
  @ApiResponse({ status: 200, description: 'Storage is healthy' })
  health() {
    return { status: 'ok' };
  }
}
