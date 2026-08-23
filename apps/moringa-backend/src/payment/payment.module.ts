import { Module } from '@nestjs/common';
import { PaymentWebhookController } from './payment-webhook.controller';
import { InfrastructureModule } from '@/infrastructure/infrastructure.module';
import { OrderModule } from '@/order/order.module';

@Module({
  imports: [InfrastructureModule, OrderModule],
  controllers: [PaymentWebhookController],
  providers: [],
})
export class PaymentModule {}
