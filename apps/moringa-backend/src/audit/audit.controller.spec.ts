import { Test, type TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '@/auth/jwt.guard';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('AuditController', () => {
  let controller: AuditController;

  const prismaServiceMock = {
    adminAuditLog: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        AuditService,
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

  it('should return audit logs via AuditService', async () => {
    const created = { id: 1, action: 'view_logs' };
    prismaServiceMock.adminAuditLog.create.mockResolvedValue(created);

    const result = await controller.getLogs();

    expect(result).toEqual(created);
    expect(prismaServiceMock.adminAuditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 0,
        action: 'view_logs',
        entityType: 'audit',
        entityId: undefined,
      },
    });
  });
});
