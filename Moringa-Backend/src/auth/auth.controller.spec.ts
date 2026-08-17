import { Test, type TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailVerificationService } from './email-verification.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { NotificationService } from '@/notification/notification.service';
import { RedisCacheService } from '@/cache/redis-cache.service';
import { StorageService } from '@/storage/storage.service';
import { AuthThrottlerGuard } from './guards/auth-throttler.guard';
import { AuthCookiesService } from './services/auth-cookies.service';
import { DeviceInfoService } from './services/device-info.service';
import { SessionService } from './services/session.service';
import { CaptchaService } from './services/captcha.service';

describe('AuthController', () => {
  let controller: AuthController;

  const prismaServiceMock = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const jwtServiceMock = {
    sign: jest.fn(),
  };

  const emailVerificationServiceMock = {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  };

  const configServiceMock = {
    get: jest.fn(),
  };

  const notificationServiceMock = {
    isEmailConfigured: false,
    queue: jest.fn(),
  };

  const redisCacheServiceMock = {
    isEnabled: false,
    getJson: jest.fn(),
    setJson: jest.fn(),
  };

  const storageServiceMock = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    getSignedUrl: jest.fn(),
  };

  const authCookiesServiceMock = {
    setAuthCookies: jest.fn(),
    clearAuthCookies: jest.fn(),
    setCsrfCookie: jest.fn(),
    clearCsrfCookie: jest.fn(),
  };

  const captchaServiceMock = {
    generateCaptcha: jest.fn(),
    verifyCaptcha: jest.fn(),
  };

  const deviceInfoServiceMock = {
    extractDeviceInfo: jest.fn(),
  };

  const sessionServiceMock = {
    createSession: jest.fn(),
    listSessions: jest.fn(),
    revokeSession: jest.fn(),
    findSessionByRefreshToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
        {
          provide: EmailVerificationService,
          useValue: emailVerificationServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
        {
          provide: NotificationService,
          useValue: notificationServiceMock,
        },
        {
          provide: RedisCacheService,
          useValue: redisCacheServiceMock,
        },
        {
          provide: StorageService,
          useValue: storageServiceMock,
        },
        {
          provide: AuthCookiesService,
          useValue: authCookiesServiceMock,
        },
        {
          provide: CaptchaService,
          useValue: captchaServiceMock,
        },
        {
          provide: DeviceInfoService,
          useValue: deviceInfoServiceMock,
        },
        {
          provide: SessionService,
          useValue: sessionServiceMock,
        },
      ],
    })
      .overrideGuard(AuthThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
