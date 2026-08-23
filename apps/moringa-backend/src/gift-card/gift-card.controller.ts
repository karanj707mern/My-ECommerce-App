import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  HttpCode,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/jwt.guard';
import { RolesGuard } from '@/auth/rolesguard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { GiftCardService } from './gift-card.service';
import { CreateGiftCardDto } from './dto/create-gift-card.dto';
import { UpdateGiftCardDto } from './dto/update-gift-card.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('gift-cards')
@Controller('gift-card')
export class GiftCardController {
  constructor(private readonly giftCardService: GiftCardService) {}

  @Post('redeem')
  @HttpCode(200)
  @ApiOperation({ summary: 'Redeem a gift card' })
  @ApiResponse({ status: 200, description: 'Gift card redeemed' })
  redeem(@Body('code') code: string) {
    return this.giftCardService.redeem(code, 0);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Check gift card balance' })
  @ApiResponse({ status: 200, description: 'Gift card balance retrieved' })
  balance(@Query('code') code: string) {
    return this.giftCardService.getBalance(code);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get()
  @ApiOperation({ summary: 'Get all gift cards (admin)' })
  @ApiResponse({ status: 200, description: 'Gift cards retrieved' })
  findAll() {
    return this.giftCardService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get(':id')
  @ApiOperation({ summary: 'Get gift card by ID (admin)' })
  @ApiResponse({ status: 200, description: 'Gift card retrieved' })
  @ApiResponse({ status: 404, description: 'Gift card not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.giftCardService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create gift card (admin)' })
  @ApiResponse({ status: 201, description: 'Gift card created' })
  @ApiBody({ type: CreateGiftCardDto })
  create(@Body() dto: CreateGiftCardDto) {
    return this.giftCardService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  @ApiOperation({ summary: 'Update gift card (admin)' })
  @ApiResponse({ status: 200, description: 'Gift card updated' })
  @ApiResponse({ status: 404, description: 'Gift card not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGiftCardDto,
  ) {
    return this.giftCardService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete gift card (admin)' })
  @ApiResponse({ status: 204, description: 'Gift card deleted' })
  @ApiResponse({ status: 404, description: 'Gift card not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.giftCardService.remove(id);
  }
}
