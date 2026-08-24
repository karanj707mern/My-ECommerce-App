import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisCacheService } from '@/cache/redis-cache.service';
import { SessionService } from './services/session.service';
import { DeviceInfoService } from './services/device-info.service';
import { EmailVerificationService } from './email-verification.service';
import { NotificationService } from '@/notification/notification.service';
import { TokenRevocationService } from './services/token-revocation.service';
import { UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: Record<string, jest.Mock>;
    session: Record<string, jest.Mock>;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      session: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn(), verifyAsync: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        {
          provide: RedisCacheService,
          useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
        },
        { provide: SessionService, useValue: { create: jest.fn() } },
        { provide: DeviceInfoService, useValue: { parse: jest.fn() } },
        {
          provide: EmailVerificationService,
          useValue: { sendVerificationEmail: jest.fn() },
        },
        { provide: NotificationService, useValue: { emit: jest.fn() } },
        {
          provide: TokenRevocationService,
          useValue: { revoke: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifyEmail', () => {
    it('verifies email with a valid token', async () => {
      const user = {
        id: 1,
        emailVerifyToken: crypto
          .createHash('sha256')
          .update('valid-token')
          .digest('hex'),
        emailVerifyTokenExpiresAt: new Date(Date.now() + 3600_000),
      };
      prisma.user.findFirst.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue({ ...user, isEmailVerified: true });

      const result = await service.verifyEmail({ token: 'valid-token' });

      expect(result.message).toBe('Email verified successfully');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ isEmailVerified: true }),
        }),
      );
    });

    it('rejects an expired token', async () => {
      const user = {
        id: 1,
        emailVerifyToken: crypto
          .createHash('sha256')
          .update('expired-token')
          .digest('hex'),
        emailVerifyTokenExpiresAt: new Date(Date.now() - 1000),
      };
      prisma.user.findFirst.mockResolvedValue(user);

      await expect(
        service.verifyEmail({ token: 'expired-token' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an unknown token', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.verifyEmail({ token: 'unknown' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('resendVerification', () => {
    it('sends verification email to an unverified user', async () => {
      const user = {
        id: 1,
        email: 'user@example.com',
        name: 'User',
        isEmailVerified: false,
        emailVerifyLastSentAt: null,
      };
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue(user);

      const result = await service.resendVerification({
        email: 'user@example.com',
      });

      expect(result.message).toBe('Verification email sent');
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('skips already-verified users', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'user@example.com',
        isEmailVerified: true,
      });

      const result = await service.resendVerification({
        email: 'user@example.com',
      });

      expect(result.message).toBe('If account exists, email will be sent');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('throttles rapid resend requests', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'user@example.com',
        isEmailVerified: false,
        emailVerifyLastSentAt: new Date(Date.now() - 30_000),
      });

      const result = await service.resendVerification({
        email: 'user@example.com',
      });

      expect(result.message).toBe(
        'Please wait before requesting another verification email',
      );
    });
  });

  describe('logout', () => {
    it('clears sessions and refresh token for a user', async () => {
      prisma.session.findMany.mockResolvedValue([{ id: 10 }, { id: 11 }]);
      prisma.session.deleteMany.mockResolvedValue({ count: 2 });
      prisma.user.update.mockResolvedValue({ id: 1 });

      const result = await service.logout(1);

      expect(result.message).toBe('Logged out successfully');
      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { refreshToken: null, refreshTokenExpiresAt: null },
        }),
      );
    });
  });
});
