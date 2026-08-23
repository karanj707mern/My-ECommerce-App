import { Module } from '@nestjs/common';
import { PaymentWebhookController } from './payment-webhook.controller';
import { InfrastructureModule } from '@/infrastructure/infrastructure.module';

@Module({
  imports: [InfrastructureModule],
  controllers: [PaymentWebhookController],
  providers: [],
})
export class PaymentModule {}
