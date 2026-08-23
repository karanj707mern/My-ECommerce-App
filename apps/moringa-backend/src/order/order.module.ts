import { Module, OnModuleInit } from '@nestjs/common';
import { AuthSharedModule } from '@/auth/auth-shared.module';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderProcessor } from './order.processor';
import { OrderEventsService } from './order-events.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { InfrastructureModule } from '@/infrastructure/infrastructure.module';
import { BullMQService } from '@/infrastructure/bullmq.service';

@Module({
  imports: [AuthSharedModule, PrismaModule, InfrastructureModule],
  controllers: [OrderController],
  providers: [OrderService, OrderProcessor, OrderEventsService],
  exports: [OrderService, OrderEventsService],
})
export class OrderModule implements OnModuleInit {
  constructor(
    private readonly bullMQService: BullMQService,
    private readonly orderProcessor: OrderProcessor,
  ) {}

  /**
   * Wire the domain processor into the BullMQ worker so queued order jobs
   * (send_confirmation, update_inventory, send_notification, process_payment)
   * execute against the real implementation instead of being skipped.
   */
  onModuleInit(): void {
    const actions = [
      'send_confirmation',
      'update_inventory',
      'send_notification',
      'process_payment',
    ] as const;

    for (const action of actions) {
      this.bullMQService.registerProcessor(action, (data, job) =>
        this.orderProcessor.process(job),
      );
    }
  }
}
