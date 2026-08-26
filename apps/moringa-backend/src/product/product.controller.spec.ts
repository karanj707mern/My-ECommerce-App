import { Test, type TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { StorageService } from '@/storage/storage.service';
import { RedisCacheService } from '@/cache/redis-cache.service';
import { AuditInterceptor } from '@/audit/audit.interceptor';
import { AuditLoggerService } from '@/audit/audit-logger.service';
import { TokenRevocationService } from '@/auth/services/token-revocation.service';

describe('ProductController', () => {
  let controller: ProductController;

  const storageServiceMock = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    getSignedUrl: jest.fn(),
  };

  const redisCacheServiceMock = {
    isEnabled: false,
    getJson: jest.fn(),
    setJson: jest.fn(),
  };

  const auditLoggerServiceMock = {
    log: jest.fn(),
  };

  const prismaServiceMock = {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        ProductService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
        {
          provide: StorageService,
          useValue: storageServiceMock,
        },
        {
          provide: RedisCacheService,
          useValue: redisCacheServiceMock,
        },
        {
          provide: AuditLoggerService,
          useValue: auditLoggerServiceMock,
        },
        AuditInterceptor,
        // @UseGuards(JwtAuthGuard, RolesGuard) enhancers resolve at compile
        // time — provide the guard's dependency set explicitly.
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

    controller = module.get<ProductController>(ProductController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
