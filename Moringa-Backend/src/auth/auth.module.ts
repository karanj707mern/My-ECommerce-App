import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthCookiesService } from './services/auth-cookies.service';
import { DeviceInfoService } from './services/device-info.service';
import { SessionService } from './services/session.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { OptionalAuthGuard } from './optional-auth.guard';
import { EmailVerificationService } from './email-verification.service';
import { NotificationModule } from '@/notification/notification.module';
import { EmailTemplatesModule } from '@/common/email-templates/email-templates.module';
import { RedisCacheModule } from '@/cache/redis-cache.module';
import { StorageModule } from '@/storage/storage.module';
import { CaptchaModule } from './captcha.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    NotificationModule,
    EmailTemplatesModule,
    RedisCacheModule,
    StorageModule,
    CaptchaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const jwtSecret = config.get<string>('app.jwtSecret');

        if (!jwtSecret) {
          throw new Error('JWT_SECRET not found');
        }

        return {
          secret: jwtSecret,
          signOptions: { expiresIn: '1h' },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    EmailVerificationService,
    AuthCookiesService,
    DeviceInfoService,
    OptionalAuthGuard,
    SessionService,
  ],
  exports: [
    JwtModule,
    EmailVerificationService,
    OptionalAuthGuard,
    SessionService,
    DeviceInfoService,
  ],
})
export class AuthModule {}
