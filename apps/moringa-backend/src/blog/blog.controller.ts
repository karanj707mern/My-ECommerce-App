import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/jwt.guard';
import { BlogService } from './blog.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  @ApiOperation({ summary: 'Get all published blog posts' })
  @ApiResponse({ status: 200, description: 'Blog posts retrieved' })
  findAll(@Query('skip') skip?: string, @Query('take') take?: string) {
    return this.blogService.findAll(Number(skip) || 0, Number(take) || 20);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get blog post by slug' })
  @ApiResponse({ status: 200, description: 'Blog post retrieved' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  findBySlug(@Param('slug') slug: string) {
    return this.blogService.findBySlug(slug);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured blog posts' })
  @ApiResponse({ status: 200, description: 'Featured posts retrieved' })
  findFeatured() {
    return this.blogService.findFeatured();
  }
}
