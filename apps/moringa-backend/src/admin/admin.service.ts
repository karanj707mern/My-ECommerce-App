import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const [ordersCount, productsCount, usersCount] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.product.count(),
      this.prisma.user.count(),
    ]);

    return {
      ordersCount,
      productsCount,
      usersCount,
    };
  }
}
