import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { UserService } from './user.service';
import { CaptchaService } from '@/auth/services/captcha.service';

describe('UserService', () => {
  let service: UserService;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
