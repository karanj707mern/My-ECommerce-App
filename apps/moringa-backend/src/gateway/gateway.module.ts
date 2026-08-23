import { Module } from '@nestjs/common';
import { AuthSharedModule } from '@/auth/auth-shared.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { OrderModule } from '@/order/order.module';
import { OrderGateway } from './order.gateway';

@Module({
  imports: [AuthSharedModule, PrismaModule, OrderModule],
  providers: [OrderGateway],
  exports: [OrderGateway],
})
export class GatewayModule {}
