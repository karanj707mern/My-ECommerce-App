import { Test, type TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CaptchaService } from '@/auth/services/captcha.service';
import { DeviceInfoService } from '@/auth/services/device-info.service';
import { TokenRevocationService } from '@/auth/services/token-revocation.service';

describe('UserController', () => {
  let controller: UserController;

  const prismaServiceMock = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const captchaServiceMock = {
    generateCaptcha: jest.fn(),
    verifyCaptcha: jest.fn(),
  };

  const deviceInfoServiceMock = {
    extractDeviceInfo: jest.fn().mockReturnValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
        {
          provide: CaptchaService,
          useValue: captchaServiceMock,
        },
        {
          provide: DeviceInfoService,
          useValue: deviceInfoServiceMock,
        },
        // @UseGuards(JwtAuthGuard) enhancers resolve at compile time.
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        {
          provide: TokenRevocationService,
          useValue: { revoke: jest.fn(), isRevoked: jest.fn().mockResolvedValue(false) },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
