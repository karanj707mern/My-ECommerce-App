import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '@/auth/jwt.guard';
import { RecentlyViewedService } from './recently-viewed.service';

@Controller('analytics')
export class RecentlyViewedController {
  constructor(private readonly recentlyViewedService: RecentlyViewedService) {}

  @UseGuards(JwtAuthGuard)
  @Post('viewed')
  recordView(
    @Req() req: Request & { user: { id: number } },
    @Body('productId') productId: number,
  ) {
    return this.recentlyViewedService.addView(req.user.id, productId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('viewed')
  getRecentlyViewed(@Req() req: Request & { user: { id: number } }) {
    return this.recentlyViewedService.getRecentlyViewed(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('viewed')
  clearHistory(@Req() req: Request & { user: { id: number } }) {
    return this.recentlyViewedService.clearHistory(req.user.id);
  }
}
