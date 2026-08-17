import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class GiftCardService {
  constructor(private readonly prisma: PrismaService) {}

  async validate(code: string) {
    const giftCard = await this.prisma.giftCard.findUnique({
      where: { code },
    });

    if (!giftCard || !giftCard.isActive) {
      return { valid: false, message: 'Invalid gift card' };
    }

    if (giftCard.expiresAt && new Date() > giftCard.expiresAt) {
      return { valid: false, message: 'Gift card has expired' };
    }

    return {
      valid: true,
      remainingAmount: giftCard.remainingAmount,
      currency: giftCard.currency,
    };
  }
}
