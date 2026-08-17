import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: Record<string, unknown>) {
    return this.prisma.order.create({
      data: {
        userId,
        ...dto,
      } as never,
    });
  }

  async findByUserId(userId: number) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
