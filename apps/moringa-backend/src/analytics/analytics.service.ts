import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  getSalesStats() {
    return {
      totalSales: 0,
      totalOrders: 0,
    };
  }
}
