import { Test, type TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { AbandonedCartService } from '@/analytics/abandoned-cart.service';
import { RedisCacheService } from '@/cache/redis-cache.service';
import { TokenRevocationService } from '@/auth/services/token-revocation.service';

describe('CartController', () => {
  let controller: CartController;

  const prismaServiceMock = {
    cartItem: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const abandonedCartServiceMock = {
    createFromCart: jest.fn(),
    getRecoverableCarts: jest.fn(),
    markRecovered: jest.fn(),
    cleanupExpired: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        CartService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
        {
          provide: AbandonedCartService,
          useValue: abandonedCartServiceMock,
        },
        {
          provide: RedisCacheService,
          useValue: {
            getJson: jest.fn(),
            setJson: jest.fn(),
            del: jest.fn(),
            isEnabled: false,
          },
        },
        // Method-level @UseGuards(JwtAuthGuard) enhancers are resolved during
        // module compilation — the guard's full dependency set must be present.
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

    controller = module.get<CartController>(CartController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
