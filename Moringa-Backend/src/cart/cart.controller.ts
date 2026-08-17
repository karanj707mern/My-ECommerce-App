import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  ParseIntPipe,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '@/auth/jwt.guard';
import { OptionalAuthGuard } from '@/auth/optional-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { CartService } from './cart.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { MergeGuestCartDto } from './dto/merge-guest-cart.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GuestToken } from '@/common/decorators/guest-token.decorator';

@ApiTags('cart')
@Controller('cart')
@UseGuards(OptionalAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Throttle({ default: { limit: 30, ttl: 60 } })
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create cart' })
  @ApiResponse({ status: 201, description: 'Cart created' })
  async create(
    @Req() req: Request & { user?: { id: number } },
    @Body() createCartDto: CreateCartDto,
    @GuestToken() guestToken?: string,
  ) {
    const userId = req.user?.id;
    return this.cartService.create(userId, createCartDto, guestToken);
  }

  @Throttle({ default: { limit: 50, ttl: 60 } })
  @Get()
  @ApiOperation({ summary: 'Get user cart' })
  @ApiResponse({ status: 200, description: 'Cart retrieved' })
  async findAll(
    @Req() req: Request & { user?: { id: number } },
    @GuestToken() guestToken?: string,
  ) {
    const userId = req.user?.id;
    return this.cartService.findAll(userId, guestToken);
  }

  @Throttle({ default: { limit: 30, ttl: 60 } })
  @HttpCode(200)
  @Post('guest')
  async createGuestCart(
    @Req() req: Request & { user?: { id: number } },
    @Body() dto: Record<string, unknown> | undefined,
    @Res() res: Response,
    @GuestToken() guestToken?: string,
  ) {
    if (req.user?.id) {
      return res.json({
        token: guestToken,
        cart: await this.cartService.findAll(req.user.id),
      });
    }

    const items = Array.isArray(
      (dto as { items?: unknown[] } | undefined)?.items,
    )
      ? ((dto as { items?: unknown[] }).items as {
          productId: number;
          quantity: number;
        }[])
      : undefined;
    const result = await this.cartService.createGuestCart(items, guestToken);
    return res.json({
      token: result.token,
      cart: result.cart,
    });
  }

  @Throttle({ default: { limit: 50, ttl: 60 } })
  @Get(['guest', 'guest/:token'])
  getGuestCart(
    @Req() req: Request,
    @Param('token') token?: string,
    @GuestToken() guestToken?: string,
  ) {
    const actualToken = token || guestToken;
    if (!actualToken) {
      throw new BadRequestException('Guest cart token is required');
    }
    return this.cartService.getGuestCart(actualToken);
  }

  @Throttle({ default: { limit: 50, ttl: 60 } })
  @Get(':id')
  @ApiOperation({ summary: 'Get cart item by ID' })
  @ApiResponse({ status: 200, description: 'Cart item retrieved' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async findOne(
    @Req() req: Request & { user?: { id: number } },
    @Param('id', ParseIntPipe) id: number,
    @GuestToken() guestToken?: string,
  ) {
    const userId = req.user?.id;
    return this.cartService.findOne(userId, id, guestToken);
  }

  @Throttle({ default: { limit: 30, ttl: 60 } })
  @Patch(':id')
  @ApiOperation({ summary: 'Update cart item' })
  @ApiResponse({ status: 200, description: 'Cart item updated' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async update(
    @Req() req: Request & { user?: { id: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCartDto: UpdateCartDto,
    @GuestToken() guestToken?: string,
  ) {
    const userId = req.user?.id;
    return this.cartService.update(userId, id, updateCartDto, guestToken);
  }

  @Throttle({ default: { limit: 30, ttl: 60 } })
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove cart item' })
  @ApiResponse({ status: 204, description: 'Cart item removed' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async remove(
    @Req() req: Request & { user?: { id: number } },
    @Param('id', ParseIntPipe) id: number,
    @GuestToken() guestToken?: string,
  ) {
    const userId = req.user?.id;
    return this.cartService.remove(userId, id, guestToken);
  }

  @Throttle({ default: { limit: 20, ttl: 60 } })
  @Delete()
  @HttpCode(204)
  @ApiOperation({ summary: 'Clear cart' })
  @ApiResponse({ status: 204, description: 'Cart cleared' })
  async clear(
    @Req() req: Request & { user?: { id: number } },
    @GuestToken() guestToken?: string,
  ) {
    const userId = req.user?.id;
    return this.cartService.clear(userId, guestToken);
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60 } })
  @Post('guest/merge')
  mergeGuestCart(
    @Req()
    req: Request & {
      user: { id: number };
    },
    @Body() dto: MergeGuestCartDto,
    @GuestToken() guestToken?: string,
  ) {
    const token = dto.token || guestToken;
    if (!token) {
      throw new BadRequestException('Guest cart token is required');
    }
    return this.cartService.mergeGuestCart(req.user.id, token);
  }

  @Throttle({ default: { limit: 15, ttl: 60 } })
  @Delete(['guest', 'guest/:token'])
  deleteGuestCart(
    @Req() req: Request,
    @Param('token') token?: string,
    @GuestToken() guestToken?: string,
  ) {
    const actualToken = token || guestToken;
    if (!actualToken) {
      throw new BadRequestException('Guest cart token is required');
    }
    return this.cartService.deleteGuestCart(actualToken);
  }
}
