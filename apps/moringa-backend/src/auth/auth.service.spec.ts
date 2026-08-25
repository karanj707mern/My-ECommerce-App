import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import crypto from 'crypto';
import { AuthService } from './auth.service';
import { AuthProvider } from '@prisma/client';
import type { ConfigService } from '@nestjs/config';
import type { NotificationService } from '@/notification/notification.service';
import { SessionService } from './services/session.service';
import { DeviceInfoService } from './services/device-info.service';

describe('AuthService', () => {
  let service: AuthService;

  const prisma = {
    $transaction: jest.fn(),
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    session: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    notificationPreference: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    userAddress: {
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    recentlyViewed: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    abandonedCart: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  } as any;

  const jwtServiceMock = {
    signAsync: jest.fn().mockResolvedValue('signed-token'),
    verifyAsync: jest.fn(),
  };

  const emailVerificationService = {
    buildVerificationUrl: jest.fn(),
    buildPasswordResetUrl: jest.fn(),
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    sendLoginAlert: jest.fn(),
    sendWelcome: jest.fn(),
    sendEmailVerified: jest.fn(),
    sendProfileUpdated: jest.fn(),
    sendAddressAdded: jest.fn(),
    sendAddressUpdated: jest.fn(),
    sendAddressDeleted: jest.fn(),
    sendReviewPosted: jest.fn(),
    sendCommentPosted: jest.fn(),
    sendBlogPosted: jest.fn(),
    sendBlogUpdated: jest.fn(),
    sendBlogDeleted: jest.fn(),
    sendNewUserRegistered: jest.fn(),
    sendLowStock: jest.fn(),
    sendSupportIssueCreated: jest.fn(),
    sendSupportIssueUpdated: jest.fn(),
  } as any;

  const configServiceMock = {
    get: jest.fn(),
  } as unknown as jest.Mocked<ConfigService>;

  const notificationServiceMock: Partial<NotificationService> = {
    isEmailConfigured: false,
    queue: jest.fn(),
  };

  const redisCacheServiceMock = {
    getJson: jest.fn(),
    setJson: jest.fn(),
    del: jest.fn(),
    isEnabled: true,
  };

  const sessionServiceMock = {
    createSession: jest.fn(),
    listSessions: jest.fn(),
    revokeSession: jest.fn(),
    findSessionByRefreshToken: jest.fn(),
  };

  const deviceInfoServiceMock = {
    extractDeviceInfo: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new AuthService(
      prisma,
      jwtServiceMock as unknown as JwtService,
      emailVerificationService,
      configServiceMock,
      notificationServiceMock as NotificationService,
      redisCacheServiceMock as any,
      sessionServiceMock as unknown as SessionService,
      deviceInfoServiceMock as unknown as DeviceInfoService,
    );
  });

  // ---------------------------------------------------------------------------
  // REGISTER
  // ---------------------------------------------------------------------------

  it('registers local users as unverified', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    prisma.user.create.mockResolvedValue({
      id: 1,
      name: 'New User',
      email: 'new@example.com',
    });

    emailVerificationService.sendVerificationEmail.mockResolvedValue(
      'http://localhost:5173/auth?mode=verify-email&token=test',
    );

    const result = await service.register({
      name: 'New User',
      email: 'New@Example.com',
      password: 'password123',
      captchaId: 'test-captcha-id',
      captchaInput: 'test-captcha-input',
    });

    expect(result).toEqual({
      message:
        'User registered successfully. Verify your email before logging in.',
      requiresEmailVerification: true,
      verificationUrl:
        'http://localhost:5173/auth?mode=verify-email&token=test',
    });

    expect(prisma.user.create).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // LOGIN
  // ---------------------------------------------------------------------------

  it('logs in verified local users', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);

    prisma.user.findUnique
      .mockResolvedValueOnce({
        id: 1,
        email: 'test@example.com',
        password: hashedPassword,
        role: 'USER',
        authProvider: AuthProvider.LOCAL,
        isEmailVerified: true,
      })
      .mockResolvedValueOnce({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'USER',
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        addresses: [],
      });

    prisma.user.update.mockResolvedValue({});

    const result = await service.login({
      email: 'test@example.com',
      password: 'password123',
      captchaId: 'test-captcha-id',
      captchaInput: 'test-captcha-input',
    });

    expect(result).toHaveProperty('accessToken');

    expect(result).toHaveProperty('refreshToken');
  });

  it('does not allow login before email verification', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);

    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      password: hashedPassword,
      role: 'USER',
      authProvider: AuthProvider.LOCAL,
      isEmailVerified: false,
      emailVerifyLastSentAt: null,
    });

    prisma.user.update.mockResolvedValue({});

    emailVerificationService.sendVerificationEmail.mockResolvedValue(
      'verification-link',
    );

    await expect(
      service.login({
        email: 'test@example.com',
        password: 'password123',
        captchaId: 'test-captcha-id',
        captchaInput: 'test-captcha-input',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  // ---------------------------------------------------------------------------
  // GOOGLE AUTH
  // ---------------------------------------------------------------------------

  it('does not let Google sign-in verify an unverified password account', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => ({
        sub: 'google-sub',
        email: 'new@example.com',
        email_verified: 'true',
        aud: 'google-client-id',
        iss: 'accounts.google.com',
        name: 'New User',
      }),
    });

    configServiceMock.get.mockImplementation((key: string) =>
      key === 'app.googleClientId' ? 'google-client-id' : undefined,
    );

    prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 1,
      email: 'new@example.com',
      isEmailVerified: false,
      authProvider: AuthProvider.LOCAL,
      emailVerifyLastSentAt: null,
    });

    prisma.user.update.mockResolvedValue({
      id: 1,
    });

    emailVerificationService.sendVerificationEmail.mockResolvedValue(
      'verification-link',
    );

    await expect(
      service.googleAuth({
        credential: 'token',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('creates a new Google account if no account exists', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => ({
        sub: 'google-sub',
        email: 'google@example.com',
        email_verified: 'true',
        aud: 'google-client-id',
        iss: 'accounts.google.com',
        name: 'Google User',
      }),
    });

    configServiceMock.get.mockImplementation((key: string) =>
      key === 'app.googleClientId' ? 'google-client-id' : undefined,
    );

    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 2,
        name: 'Google User',
        email: 'google@example.com',
        role: 'USER',
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        addresses: [],
      });

    prisma.user.create.mockResolvedValue({
      id: 2,
      email: 'google@example.com',
    });

    prisma.user.update.mockResolvedValue({});

    const result = await service.googleAuth({
      credential: 'token',
    });

    expect(result).toHaveProperty('accessToken');

    expect(result).toHaveProperty('refreshToken');
  });

  // ---------------------------------------------------------------------------
  // REFRESH TOKEN
  // ---------------------------------------------------------------------------

  it('refreshes access token', async () => {
    jwtServiceMock.verifyAsync.mockResolvedValue({
      id: 1,
    });

    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      role: 'USER',
      refreshToken: crypto
        .createHash('sha256')
        .update('refresh-token')
        .digest('hex'),
      refreshTokenExpiresAt: new Date(Date.now() + 100000),
    });
    sessionServiceMock.findSessionByRefreshToken.mockResolvedValue({
      id: 'session-id',
    });
    prisma.session.update.mockResolvedValue({});
    prisma.user.update.mockResolvedValue({});

    const result = await service.refreshAccessToken('refresh-token');

    expect(result).toHaveProperty('accessToken');

    expect(result).toHaveProperty('refreshToken');
  });

  // ---------------------------------------------------------------------------
  // VERIFY EMAIL
  // ---------------------------------------------------------------------------

  it('verifies email successfully', async () => {
    const token = 'plain-token';

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    prisma.user.findFirst!.mockResolvedValue({
      id: 1,
      emailVerifyToken: hashedToken,
      emailVerifyTokenExpiresAt: new Date(Date.now() + 100000),
    });

    prisma.user.update!.mockResolvedValue({});
    prisma.session.deleteMany.mockResolvedValue({ count: 1 });

    const result = await service.verifyEmail({
      token,
    });

    expect(result.message).toContain('Email verified successfully');
  });

  // ---------------------------------------------------------------------------
  // FORGOT PASSWORD
  // ---------------------------------------------------------------------------

  it('sends forgot password email', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      authProvider: AuthProvider.LOCAL,
    });

    prisma.user.update.mockResolvedValue({});

    emailVerificationService.sendPasswordResetEmail.mockResolvedValue(
      'reset-link',
    );

    const result = await service.forgotPassword({
      email: 'test@example.com',
    });

    expect(result.message).toContain('reset link will be sent');
  });

  // ---------------------------------------------------------------------------
  // RESET PASSWORD
  // ---------------------------------------------------------------------------

  it('resets password successfully', async () => {
    const token = 'reset-token';

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    prisma.user.findFirst!.mockResolvedValue({
      id: 1,
      passwordResetToken: hashedToken,
      passwordResetTokenExpiresAt: new Date(Date.now() + 100000),
    });

    prisma.user.update!.mockResolvedValue({});

    const result = await service.resetPassword({
      token,
      password: 'newpassword123',
    });

    expect(result.message).toContain('Password reset successful');
  });

  // ---------------------------------------------------------------------------
  // REGRESSION: Session refresh after revoke
  // ---------------------------------------------------------------------------

  it('rejects refresh token after session is revoked', async () => {
    jwtServiceMock.verifyAsync.mockResolvedValue({ id: 1 });

    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      role: 'USER',
      refreshToken: crypto
        .createHash('sha256')
        .update('refresh-token')
        .digest('hex'),
      refreshTokenExpiresAt: new Date(Date.now() + 100000),
    });
    sessionServiceMock.findSessionByRefreshToken.mockResolvedValue(null);
    prisma.session.update.mockResolvedValue({});
    prisma.user.update.mockResolvedValue({});

    await expect(
      service.refreshAccessToken('refresh-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  // ---------------------------------------------------------------------------
  // REGRESSION: Password change invalidates all sessions
  // ---------------------------------------------------------------------------

  it('invalidates all sessions after password change', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const newHashedPassword = await bcrypt.hash('newpassword123', 10);

    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      password: hashedPassword,
      role: 'USER',
    });
    prisma.session.deleteMany.mockResolvedValue({ count: 1 });
    prisma.user.update.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      password: newHashedPassword,
      refreshToken: null,
      refreshTokenExpiresAt: null,
      role: 'USER',
    });

    prisma.$transaction.mockImplementation(async (callback) => {
      const tx = {
        session: { deleteMany: prisma.session.deleteMany },
        user: { update: prisma.user.update },
      };
      return callback(tx);
    });

    const result = await service.changePassword(1, {
      currentPassword: 'password123',
      newPassword: 'newpassword123',
    });

    expect(result.message).toContain('Password updated successfully');
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: 1 },
    });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({
          refreshToken: null,
          refreshTokenExpiresAt: null,
        }),
      }),
    );
  });

  // ---------------------------------------------------------------------------
  // REGRESSION: Address IDOR
  // ---------------------------------------------------------------------------

  it('prevents USER from updating another user address (IDOR)', async () => {
    prisma.userAddress.findFirst.mockImplementation(
      ({ where }: { where: { userId: number; id: number } }) => {
        if (where.userId === 1 && where.id === 1) {
          return {
            id: 1,
            userId: 1,
            label: 'Home',
            recipientName: 'Alice',
            phoneNumber: '1234567890',
            addressLine1: '123 Main St',
            city: 'City',
            state: 'State',
            postalCode: '12345',
            country: 'Country',
            isDefault: true,
          };
        }
        return null;
      },
    );

    await expect(
      service.updateAddress(2, 1, { label: 'Work' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('prevents USER from removing another user address (IDOR)', async () => {
    prisma.userAddress.findFirst.mockImplementation(
      ({ where }: { where: { userId: number; id: number } }) => {
        if (where.userId === 1 && where.id === 1) {
          return {
            id: 1,
            userId: 1,
            label: 'Home',
            recipientName: 'Alice',
            phoneNumber: '1234567890',
            addressLine1: '123 Main St',
            city: 'City',
            state: 'State',
            postalCode: '12345',
            country: 'Country',
            isDefault: true,
          };
        }
        return null;
      },
    );

    await expect(service.removeAddress(2, 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
