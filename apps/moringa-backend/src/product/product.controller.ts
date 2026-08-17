import { Controller, Get, Param } from '@nestjs/common';
import { ProductService } from './product.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('products')
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({ status: 200, description: 'Products retrieved' })
  getProducts() {
    return this.productService.getProducts(false, 0, 50);
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
  getProduct(@Param('id') id: string) {
    return this.productService.getProductById(Number(id));
  }
}
