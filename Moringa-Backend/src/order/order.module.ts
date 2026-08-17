import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { RedisCacheModule } from '@/cache/redis-cache.module';
import { NotificationModule } from '@/notification/notification.module';
import { CouponModule } from '@/coupon/coupon.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { RolesGuard } from '@/auth/rolesguard';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { OrderNotificationService } from './order-notification.service';
import { OrderEventsService } from './order-events.service';
import { OrderGateway } from './order.gateway';

@Module({
  imports: [
    AuthModule,
    RedisCacheModule,
    NotificationModule,
    CouponModule,
    PrismaModule,
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    RolesGuard,
    OrderNotificationService,
    OrderEventsService,
    OrderGateway,
  ],
})
export class OrderModule {}
