import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { AbandonedCartService } from '@/analytics/abandoned-cart.service';
import { RedisCacheService } from '@/cache/redis-cache.service';
import { CartService } from './cart.service';

describe('CartService', () => {
  let service: CartService;

  const abandonedCartServiceMock = {
    createFromCart: jest.fn(),
    getRecoverableCarts: jest.fn(),
    markRecovered: jest.fn(),
    cleanupExpired: jest.fn(),
  };

  const mockProduct = {
    id: 1,
    name: 'Test Product',
    stock: 10,
  };

  const prismaServiceMock = {
    user: {
      findUnique: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    cartItem: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaServiceMock.user.findUnique.mockResolvedValue({
      id: 1,
      role: 'USER',
    });
    prismaServiceMock.product.findUnique.mockResolvedValue(mockProduct);

    const module: TestingModule = await Test.createTestingModule({
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
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Guest cart regression', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      prismaServiceMock.user.findUnique.mockResolvedValue({
        id: 1,
        role: 'USER',
      });
      prismaServiceMock.product.findUnique.mockResolvedValue(mockProduct);
    });

    it('does not return expired guest cart items', async () => {
      const expiredDate = new Date(Date.now() - 366 * 24 * 60 * 60 * 1000);

      prismaServiceMock.cartItem.findMany.mockImplementation((args: any) => {
        const where = args?.where || {};
        const allItems = [
          {
            id: 1,
            productId: 1,
            quantity: 1,
            guestCartToken: 'valid-token',
            createdAt: expiredDate,
            product: mockProduct,
          },
        ];

        if (where.createdAt?.gt) {
          return allItems.filter(
            (item) => new Date(item.createdAt) > new Date(where.createdAt.gt),
          );
        }

        return allItems;
      });

      const result = await service.getGuestCart('valid-token');

      expect(result).toEqual([]);
    });

    it('returns non-expired guest cart items', async () => {
      const recentDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

      prismaServiceMock.cartItem.findMany.mockImplementation((args: any) => {
        const where = args?.where || {};
        const allItems = [
          {
            id: 1,
            productId: 1,
            quantity: 1,
            guestCartToken: 'valid-token',
            createdAt: recentDate,
            product: mockProduct,
          },
        ];

        if (where.createdAt?.gt) {
          return allItems.filter(
            (item) => new Date(item.createdAt) > new Date(where.createdAt.gt),
          );
        }

        return allItems;
      });

      const result = await service.getGuestCart('valid-token');

      expect(result).toHaveLength(1);
      expect(result[0].guestCartToken).toBe('valid-token');
    });
  });
});
