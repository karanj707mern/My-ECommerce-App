import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '@/auth/jwt.guard';
import { RolesGuard } from '@/auth/rolesguard';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateReviewCommentDto } from './dto/create-review-comment.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { AuditInterceptor } from '@/audit/audit.interceptor';
import { AuditLog } from '@/audit/audit-logger.decorator';
import { Roles } from '@/auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('reviews')
@Controller('review')
@UseInterceptors(AuditInterceptor)
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('featured')
  getFeaturedReviews() {
    return this.reviewService.getFeaturedReviews();
  }

  @Get('product/:productId')
  getProductReviews(@Param('productId', ParseIntPipe) productId: number) {
    return this.reviewService.getProductReviews(productId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('product/:productId/eligibility')
  getReviewEligibility(
    @Req() req: Request & { user: { id: number } },
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.reviewService.getReviewEligibility(req.user.id, productId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('product/:productId')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create review' })
  @ApiResponse({ status: 201, description: 'Review created' })
  createReview(
    @Req() req: Request & { user: { id: number } },
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewService.createReview(req.user.id, productId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':reviewId/comments')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create review comment' })
  @ApiResponse({ status: 201, description: 'Comment created' })
  createComment(
    @Req() req: Request & { user: { id: number } },
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @Body() dto: CreateReviewCommentDto,
  ) {
    return this.reviewService.createComment(req.user.id, reviewId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/moderate')
  @AuditLog('MODERATE', 'Review')
  moderateReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModerateReviewDto,
  ) {
    return this.reviewService.moderateReview(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('pending')
  getPendingReviews(
    @Query('page', ParseIntPipe) page: number,
    @Query('limit', ParseIntPipe) limit: number,
  ) {
    return this.reviewService.getPendingReviews(page, limit);
  }
}
