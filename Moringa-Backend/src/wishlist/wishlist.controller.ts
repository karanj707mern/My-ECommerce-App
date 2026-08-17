import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import type { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '@/auth/jwt.guard';
import { GuestToken } from '@/common/decorators/guest-token.decorator';

@ApiTags('wishlist')
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Throttle({ default: { limit: 50, ttl: 60 } })
  @Get()
  @ApiOperation({ summary: 'Get user wishlist' })
  @ApiResponse({ status: 200, description: 'Wishlist retrieved' })
  async findAll(
    @Req() req: Request & { user?: { id: number } },
    @GuestToken() guestToken?: string,
  ) {
    const userId = req.user?.id;
    return this.wishlistService.findAll(userId, guestToken);
  }

  @Throttle({ default: { limit: 20, ttl: 60 } })
  @HttpCode(200)
  @Post('guest-token')
  createGuestWishlist(
    @Req() req: Request & { user?: { id: number } },
    @Res() res: Response,
    @GuestToken() guestToken?: string,
  ) {
    return res.json({ token: guestToken });
  }

  @Throttle({ default: { limit: 30, ttl: 60 } })
  @Post(':productId')
  @HttpCode(201)
  @ApiOperation({ summary: 'Add product to wishlist' })
  @ApiResponse({ status: 201, description: 'Product added to wishlist' })
  async add(
    @Req() req: Request & { user?: { id: number } },
    @Param('productId', ParseIntPipe) productId: number,
    @GuestToken() guestToken?: string,
  ) {
    const userId = req.user?.id;
    return this.wishlistService.add(userId, productId, guestToken);
  }

  @Throttle({ default: { limit: 30, ttl: 60 } })
  @Delete(':productId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove product from wishlist' })
  @ApiResponse({ status: 204, description: 'Product removed from wishlist' })
  async remove(
    @Req() req: Request & { user?: { id: number } },
    @Param('productId', ParseIntPipe) productId: number,
    @GuestToken() guestToken?: string,
  ) {
    const userId = req.user?.id;
    return this.wishlistService.remove(userId, productId, guestToken);
  }

  @Throttle({ default: { limit: 50, ttl: 60 } })
  @Get(['guest-token', 'guest-token/:token'])
  getGuestWishlist(
    @Req() req: Request,
    @Param('token') token?: string,
    @GuestToken() guestToken?: string,
  ) {
    const actualToken = token || guestToken;
    if (!actualToken) {
      throw new BadRequestException('Guest wishlist token is required');
    }
    return this.wishlistService.findAll(undefined, actualToken);
  }

  @Throttle({ default: { limit: 15, ttl: 60 } })
  @Delete(['guest-token', 'guest-token/:token'])
  deleteGuestWishlist(
    @Req() req: Request,
    @Param('token') token?: string,
    @GuestToken() guestToken?: string,
  ) {
    const actualToken = token || guestToken;
    if (!actualToken) {
      throw new BadRequestException('Guest wishlist token is required');
    }
    return this.wishlistService
      .clearGuestWishlist(actualToken)
      .then(() => ({}));
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60 } })
  @Post('guest/merge')
  mergeGuestWishlist(
    @Req()
    req: Request & {
      user: { id: number };
    },
    @Body() body: { token?: string },
    @GuestToken() guestToken?: string,
  ) {
    const token = body.token || guestToken;
    if (!token) {
      throw new BadRequestException('Guest wishlist token is required');
    }
    return this.wishlistService.mergeGuestWishlist(req.user.id, token);
  }
}
