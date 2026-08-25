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
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/rolesguard';
import { BlogService } from './blog.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { StorageService } from '../storage/storage.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
  ApiParam,
} from '@nestjs/swagger';

const allowedImageMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

@ApiTags('blog')
@Controller('blog')
export class BlogController {
  constructor(
    private readonly blogService: BlogService,
    private readonly storageService: StorageService
  ) {}

  @Post('upload-image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(201)
  @ApiOperation({ summary: 'Upload blog cover image (admin)' })
  @ApiResponse({ status: 201, description: 'Image uploaded successfully' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadImage(@Req() req: FastifyRequest) {
    const file = await req.file();
    if (!file) {
      throw new BadRequestException('An image file is required.');
    }

    if (!allowedImageMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPG, PNG, WEBP, AVIF, and GIF images are allowed.');
    }

    const buffer = await file.toBuffer();

    const result = await this.storageService.uploadFile(
      {
        buffer,
        originalname: file.filename,
        mimetype: file.mimetype,
      },
      'blog'
    );

    return {
      imageUrl: result.url,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create blog post (admin)' })
  @ApiResponse({ status: 201, description: 'Blog post created' })
  @ApiBody({ type: CreateBlogPostDto })
  createPost(@Body() dto: CreateBlogPostDto) {
    return this.blogService.createPost(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get published blog posts' })
  @ApiResponse({ status: 200, description: 'Published blog posts retrieved' })
  getPublishedPosts() {
    return this.blogService.getPublishedPosts();
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all blog posts including drafts (admin)' })
  @ApiResponse({ status: 200, description: 'All blog posts retrieved' })
  getAllPosts() {
    return this.blogService.getAllPosts();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get blog post by slug' })
  @ApiResponse({ status: 200, description: 'Blog post retrieved' })
  @ApiParam({ name: 'slug', description: 'Blog post slug' })
  getPostBySlug(@Param('slug') slug: string) {
    return this.blogService.getPostBySlug(slug);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update blog post (admin)' })
  @ApiResponse({ status: 200, description: 'Blog post updated' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  @ApiBody({ type: UpdateBlogPostDto })
  @ApiParam({ name: 'id', description: 'Blog post ID' })
  updatePost(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBlogPostDto) {
    return this.blogService.updatePost(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete blog post (admin)' })
  @ApiResponse({ status: 204, description: 'Blog post deleted' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  @ApiParam({ name: 'id', description: 'Blog post ID' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.blogService.remove(id);
  }
}
