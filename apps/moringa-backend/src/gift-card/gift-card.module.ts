import { Module } from '@nestjs/common';
import { AuthSharedModule } from '../auth/auth-shared.module';
import { GiftCardService } from './gift-card.service';
import { GiftCardController } from './gift-card.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AuthSharedModule, PrismaModule],
  controllers: [GiftCardController],
  providers: [GiftCardService],
  exports: [GiftCardService],
})
export class GiftCardModule {}
