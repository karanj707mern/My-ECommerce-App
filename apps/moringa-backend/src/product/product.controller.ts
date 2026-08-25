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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/rolesguard';
import { UseInterceptors } from '@nestjs/common';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductService } from './product.service';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';

const allowedImageMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
];

@ApiTags('products')
@UseInterceptors(AuditInterceptor)
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post('upload-image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(201)
  @ApiOperation({ summary: 'Upload product image (admin)' })
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
      throw new BadRequestException(
        'Only JPG, PNG, WEBP, AVIF, and GIF images are allowed.',
      );
    }

    const buffer = await file.toBuffer();

    return this.productService.uploadProductImage({
      buffer,
      originalname: file.filename,
      mimetype: file.mimetype,
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create product (admin)' })
  @ApiResponse({ status: 201, description: 'Product created' })
  @ApiBody({ type: CreateProductDto })
  createProduct(@Body() dto: CreateProductDto) {
    return this.productService.createProduct(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({ status: 200, description: 'Products retrieved' })
  getProducts(
    @Query() query: { skip?: number; take?: number },
  ) {
    return this.productService.getProducts(false, query.skip, query.take);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all products including hidden (admin)' })
  @ApiResponse({ status: 200, description: 'All products retrieved' })
  getAdminProducts(
    @Query() query: { skip?: number; take?: number },
  ) {
    return this.productService.getProducts(true, query.skip, query.take);
  }

  @Get('new-arrivals')
  @ApiOperation({ summary: 'Get new arrival products' })
  @ApiResponse({ status: 200, description: 'New arrivals retrieved' })
  getNewArrivals() {
    return this.productService.getNewArrivals();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, description: 'Product retrieved' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  getProduct(@Param('id', ParseIntPipe) id: number) {
    return this.productService.getProductById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update product (admin)' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiBody({ type: UpdateProductDto })
  updateProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.updateProduct(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete product (admin)' })
  @ApiResponse({ status: 204, description: 'Product deleted' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  deleteProduct(@Param('id', ParseIntPipe) id: number) {
    return this.productService.deleteProduct(id);
  }
}
