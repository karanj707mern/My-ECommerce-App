import { Controller, Get } from '@nestjs/common';
import { HeroService } from './hero.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('hero')
@Controller('hero')
export class HeroController {
  constructor(private readonly heroService: HeroService) {}

  @Get()
  @ApiOperation({ summary: 'Get active hero images' })
  @ApiResponse({ status: 200, description: 'Hero images retrieved' })
  findAll(): unknown {
    return this.heroService.findAll();
  }
}
