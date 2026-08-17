import { Controller, Get } from '@nestjs/common';
import { NewArrivalService } from './new-arrival.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('new-arrivals')
@Controller('new-arrivals')
export class NewArrivalController {
  constructor(private readonly newArrivalService: NewArrivalService) {}

  @Get()
  @ApiOperation({ summary: 'Get new arrival products' })
  @ApiResponse({ status: 200, description: 'New arrivals retrieved' })
  findAll() {
    return this.newArrivalService.findAll();
  }
}
