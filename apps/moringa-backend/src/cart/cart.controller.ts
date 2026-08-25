import { Controller, Get, Post, Delete, Body, Req, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CartService } from './cart.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201, description: 'Item added to cart' })
  async create(@Req() req: { user: { id: number } }, @Body() dto: { productId: number; quantity?: number }): Promise<unknown> {
    return this.cartService.create(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get user cart' })
  @ApiResponse({ status: 200, description: 'Cart retrieved' })
  async findAll(@Req() req: { user: { id: number } }): Promise<unknown> {
    return this.cartService.findAll(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Remove cart item' })
  @ApiResponse({ status: 204, description: 'Item removed' })
  async remove(@Req() req: { user: { id: number } }, @Param('id') id: string): Promise<unknown> {
    return this.cartService.remove(req.user.id, Number(id));
  }
}
