import { Body, Controller, Delete, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RecentlyViewedService } from './recently-viewed.service';

@ApiTags('analytics')
@Controller('analytics')
export class RecentlyViewedController {
  constructor(private readonly recentlyViewedService: RecentlyViewedService) {}

  @UseGuards(JwtAuthGuard)
  @Post('viewed')
  @ApiOperation({ summary: 'Record a product view' })
  @ApiResponse({ status: 201, description: 'View recorded' })
  recordView(@Req() req: { user: { id: number } }, @Body() dto: { productId: number }) {
    return this.recentlyViewedService.addView(req.user.id, dto.productId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('viewed')
  @ApiOperation({ summary: 'Get recently viewed products' })
  @ApiResponse({ status: 200, description: 'Recently viewed products retrieved' })
  getRecentlyViewed(@Req() req: { user: { id: number } }) {
    return this.recentlyViewedService.getRecentlyViewed(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('viewed')
  @ApiOperation({ summary: 'Clear recently viewed history' })
  @ApiResponse({ status: 200, description: 'History cleared' })
  clearHistory(@Req() req: { user: { id: number } }): Promise<void> {
    return this.recentlyViewedService.clearHistory(req.user.id);
  }
}
