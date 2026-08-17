import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProduct(productId: number) {
    return this.prisma.review.findMany({
      where: { productId, status: 'APPROVED' },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
