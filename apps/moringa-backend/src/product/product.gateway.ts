import { Controller } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';

@Controller()
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // Re-export all methods from the actual controller
  async createProduct(dto: any) {
    return this.productService.createProduct(dto);
  }

  async getProducts(includeInactive?: boolean, skip?: number, take?: number) {
    return this.productService.getProducts(includeInactive, skip, take);
  }

  async getNewArrivals(limit?: number) {
    return this.productService.getNewArrivals(limit);
  }

  async getProductById(id: number) {
    return this.productService.getProductById(id);
  }

  async updateProduct(id: number, dto: any) {
    return this.productService.updateProduct(id, dto);
  }

  async deleteProduct(id: number) {
    return this.productService.deleteProduct(id);
  }
}
