import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { ExecutionContext } from '@nestjs/common';
import { ProductModule } from './product/product.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { OrderModule } from './order/order.module';
import { SettingsModule } from './settings/settings.module';
import { ReviewModule } from './review/review.module';
import { BlogModule } from './blog/blog.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { CouponModule } from './coupon/coupon.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import { AuditModule } from './audit/audit.module';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import appConfig from './config/app.config';
import { validateEnv } from './config/env.validation';
import { PinoModule } from './common/logger/pino.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { HeroModule } from './hero/hero.module';
import { NewArrivalModule } from './new-arrival/new-arrival.module';
import { GiftCardModule } from './gift-card/gift-card.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate: validateEnv,
      envFilePath: ['.env', `.env.${process.env.NODE_ENV ?? 'development'}`],
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          limit: 100,
          ttl: 60,
        },
      ],
      skipIf: (context: ExecutionContext) => {
        const route = context.getHandler();
        const controller = context.getClass ? context.getClass() : null;
        const controllerName = controller?.name || '';
        const handlerName = route?.name || '';
        const isHealth = controllerName === 'HealthController';
        const isPublicProduct =
          controllerName === 'ProductController' &&
          handlerName === 'getFeaturedProducts';
        return isHealth || isPublicProduct;
      },
    }),
    ScheduleModule.forRoot(),
    PinoModule,
    PrismaModule,
    AuthModule,
    UserModule,
    ProductModule,
    CartModule,
    OrderModule,
    SettingsModule,
    ReviewModule,
    BlogModule,
    WishlistModule,
    CouponModule,
    AdminModule,
    HealthModule,
    AuditModule,
    AnalyticsModule,
    HeroModule,
    NewArrivalModule,
    GiftCardModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
