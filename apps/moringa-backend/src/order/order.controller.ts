import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/jwt.guard';
import { OrderService } from './order.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('orders')
@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Create order' })
  @ApiResponse({ status: 201, description: 'Order created' })
  async create(@Req() req: { user: { id: number } }, @Body() dto: Record<string, unknown>) {
    return this.orderService.create(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get user orders' })
  @ApiResponse({ status: 200, description: 'Orders retrieved' })
  async findAll(@Req() req: { user: { id: number } }) {
    return this.orderService.findByUserId(req.user.id);
  }
}
