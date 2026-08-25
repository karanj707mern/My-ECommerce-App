import { Controller, Get, Post, Delete, Body, Req, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { WishlistService } from './wishlist.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('wishlist')
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get user wishlist' })
  @ApiResponse({ status: 200, description: 'Wishlist retrieved' })
  findAll(@Req() req: { user: { id: number } }) {
    return this.wishlistService.findByUserId(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':productId')
  @ApiOperation({ summary: 'Add item to wishlist' })
  @ApiResponse({ status: 201, description: 'Item added to wishlist' })
  add(@Req() req: { user: { id: number } }, @Param('productId') productId: string) {
    return this.wishlistService.add(req.user.id, Number(productId));
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':productId')
  @ApiOperation({ summary: 'Remove item from wishlist' })
  @ApiResponse({ status: 204, description: 'Item removed' })
  remove(@Req() req: { user: { id: number } }, @Param('productId') productId: string) {
    return this.wishlistService.remove(req.user.id, Number(productId));
  }
}
