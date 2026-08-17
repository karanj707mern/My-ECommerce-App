import { Controller, Get, Param } from '@nestjs/common';
import { ReviewService } from './review.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('reviews')
@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get reviews for a product' })
  @ApiResponse({ status: 200, description: 'Reviews retrieved' })
  findByProduct(@Param('productId') productId: string) {
    return this.reviewService.findByProduct(Number(productId));
  }
}
