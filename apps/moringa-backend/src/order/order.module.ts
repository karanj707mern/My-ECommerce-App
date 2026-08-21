import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderProcessor } from './order.processor';
import { OrderEventsService } from './order-events.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { InfrastructureModule } from '@/infrastructure/infrastructure.module';

@Module({
  imports: [PrismaModule, InfrastructureModule],
  controllers: [OrderController],
  providers: [OrderService, OrderProcessor, OrderEventsService],
  exports: [OrderService, OrderEventsService],
})
export class OrderModule {}
