import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: number) {
    return this.prisma.wishlist.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async add(userId: number, productId: number) {
    return this.prisma.wishlist.create({
      data: { userId, productId },
      include: { product: true },
    });
  }

  async remove(userId: number, productId: number) {
    await this.prisma.wishlist.delete({
      where: { userId_productId: { userId, productId } },
    });
    return { message: 'Item removed from wishlist' };
  }
}
