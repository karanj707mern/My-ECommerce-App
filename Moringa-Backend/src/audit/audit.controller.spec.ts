import { Test, type TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '@/auth/jwt.guard';
import { AuditController } from './audit.controller';
import { PrismaService } from '@/prisma/prisma.service';

describe('AuditController', () => {
  let controller: AuditController;

  const prismaServiceMock = {
    adminAuditLog: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuditController>(AuditController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
