import { Module } from '@nestjs/common';
import { PaymentWebhookController } from './payment-webhook.controller';
import { OrderQueueService } from '@/infrastructure/bullmq.service';

@Module({
  imports: [],
  controllers: [PaymentWebhookController],
  providers: [OrderQueueService],
  exports: [OrderQueueService],
})
export class PaymentModule {}
