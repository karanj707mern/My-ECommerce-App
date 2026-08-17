import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phoneNumber: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        avatar: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
        addresses: {
          orderBy: [
            { isDefault: 'desc' as const },
            { updatedAt: 'desc' as const },
          ],
        },
      },
    });
  }
}
