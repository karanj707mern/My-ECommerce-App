import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt.guard';
import { RolesGuard } from './rolesguard';
import { AuthThrottlerGuard } from './guards/auth-throttler.guard';
import { TokenRevocationService } from './services/token-revocation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';

/**
 * Shared auth primitives for feature modules.
 *
 * NestJS instantiates class-referenced enhancers (@UseGuards(JwtAuthGuard))
 * using the injector of the consuming module, so every module that applies
 * auth guards must be able to resolve the guard's entire dependency chain.
 * This module bundles that chain (JwtModule, token revocation, guards) into a
 * single importable unit, avoiding repetitive wiring across feature modules
 * and sidestepping circular imports with AuthModule.
 */
@Module({
  imports: [
    PrismaModule,
    InfrastructureModule,
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('app.jwtSecret'),
        signOptions: {
          expiresIn: '15m',
        },
      }),
    }),
  ],
  providers: [TokenRevocationService, JwtAuthGuard, RolesGuard, AuthThrottlerGuard],
  exports: [
    JwtModule,
    TokenRevocationService,
    JwtAuthGuard,
    RolesGuard,
    AuthThrottlerGuard,
  ],
})
export class AuthSharedModule {}
