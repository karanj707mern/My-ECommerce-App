import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { PrismaModule } from '@/prisma/prisma.module';
import { RedisCacheService } from '@/cache/redis-cache.service';
import { SessionService } from './services/session.service';
import { EmailVerificationService } from './email-verification.service';
import { NotificationService } from '@/notification/notification.service';
import { StorageService } from '@/storage/storage.service';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('app.jwtSecret', 'your-secret-key'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    SessionService,
    EmailVerificationService,
    NotificationService,
    StorageService,
    RedisCacheService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
