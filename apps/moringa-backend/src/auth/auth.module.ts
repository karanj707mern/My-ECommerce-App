import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from '@/auth/jwt.guard';
import { AuthThrottlerGuard } from '@/auth/guards/auth-throttler.guard';
import { PrismaModule } from '@/prisma/prisma.module';
import { RedisCacheService } from '@/cache/redis-cache.service';
import { SessionService } from './services/session.service';
import { DeviceInfoService } from './services/device-info.service';
import { EmailVerificationService } from './email-verification.service';
import { CaptchaModule } from './captcha.module';
import { AuthCookiesService } from './services/auth-cookies.service';
import { TokenRevocationService } from './services/token-revocation.service';
import { InfrastructureModule } from '@/infrastructure/infrastructure.module';
import { EncryptionModule } from '@/common/encryption/encryption.module';

@Module({
  imports: [
    PrismaModule,
    InfrastructureModule,
    EncryptionModule,
    ConfigModule,
    CaptchaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('app.jwtSecret'),
        signOptions: {
          expiresIn: '15m',
        },
      }),
    }),
    PassportModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    AuthThrottlerGuard,
    RedisCacheService,
    SessionService,
    DeviceInfoService,
    EmailVerificationService,
    AuthCookiesService,
    TokenRevocationService,
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard, AuthThrottlerGuard],
})
export class AuthModule {}
