import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/jwt.guard';
import { GiftCardService } from './gift-card.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('gift-cards')
@Controller('gift-cards')
export class GiftCardController {
  constructor(private readonly giftCardService: GiftCardService) {}

  @UseGuards(JwtAuthGuard)
  @Post('validate')
  @ApiOperation({ summary: 'Validate gift card' })
  @ApiResponse({ status: 200, description: 'Gift card validated' })
  validate(@Body() dto: { code: string }) {
    return this.giftCardService.validate(dto.code);
  }
}
