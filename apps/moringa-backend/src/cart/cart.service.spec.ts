import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../cache/redis-cache.service';
import { AbandonedCartService } from '../analytics/abandoned-cart.service';

/**
 * Unit tests for CartService.
 *
 * Every external collaborator (Prisma, Redis cache, abandoned-cart analytics) is
 * replaced with a hand-rolled `jest.fn()` double so the tests exercise ONLY the
 * service's own orchestration logic: dedup-on-create, ownership-scoped removal,
 * and error paths. No database, Redis, or network is touched.
 */
describe('CartService', () => {
  let service: CartService;
  let prisma: {
    cartItem: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    product: { findUnique: jest.Mock };
  };
  let abandonedCart: { createFromCart: jest.Mock };
  let cache: RedisCacheService;

  beforeEach(async () => {
    prisma = {
      cartItem: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      product: { findUnique: jest.fn() },
    };
    abandonedCart = { createFromCart: jest.fn() };
    cache = {} as RedisCacheService; // unused by CartService but required by the ctor

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: prisma },
        { provide: AbandonedCartService, useValue: abandonedCart },
        { provide: RedisCacheService, useValue: cache },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  it('is constructed with its collaborators', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a line item when the user does not already have that product', async () => {
      prisma.cartItem.findUnique.mockResolvedValue(null);
      prisma.cartItem.create.mockResolvedValue({ id: 9, userId: 1, productId: 42, quantity: 1 });

      const result = await service.create(1, { productId: 42 });

      expect(prisma.cartItem.findUnique).toHaveBeenCalledWith({
        where: { userId_productId: { userId: 1, productId: 42 } },
      });
      expect(prisma.cartItem.create).toHaveBeenCalledWith({
        data: { userId: 1, productId: 42, quantity: 1 },
      });
      expect(result).toMatchObject({ id: 9, quantity: 1 });
      // Must NOT have incremented a non-existent existing item.
      expect(prisma.cartItem.update).not.toHaveBeenCalled();
    });

    it('increments quantity when the user already has the same product in cart', async () => {
      prisma.cartItem.findUnique.mockResolvedValue({ id: 5, userId: 1, productId: 42, quantity: 2 });
      prisma.cartItem.update.mockResolvedValue({ id: 5, quantity: 4 });

      const result = await service.create(1, { productId: 42, quantity: 2 });

      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { quantity: 4 },
      });
      // Must NOT have created a duplicate line.
      expect(prisma.cartItem.create).not.toHaveBeenCalled();
      expect(result).toMatchObject({ id: 5, quantity: 4 });
    });

    it('defaults quantity to 1 when omitted', async () => {
      prisma.cartItem.findUnique.mockResolvedValue(null);
      prisma.cartItem.create.mockResolvedValue({ id: 1, quantity: 1 });

      await service.create(1, { productId: 7 });

      expect(prisma.cartItem.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ quantity: 1 }) }),
      );
    });
  });

  describe('findAll', () => {
    it('returns the user cart items with denormalized product summary, newest first', async () => {
      const rows = [
        { id: 2, product: { id: 10, name: 'B', price: 100, image: null, stock: 5, slug: 'b' } },
        { id: 1, product: { id: 9, name: 'A', price: 200, image: null, stock: 3, slug: 'a' } },
      ];
      prisma.cartItem.findMany.mockResolvedValue(rows);

      const result = await service.findAll(1);

      expect(prisma.cartItem.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        include: {
          product: {
            select: { id: true, name: true, price: true, image: true, stock: true, slug: true },
          },
        },
        orderBy: { id: 'desc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].product.name).toBe('B');
    });
  });

  describe('remove', () => {
    it('removes an item the user owns and records it for abandoned-cart recovery', async () => {
      prisma.cartItem.findFirst.mockResolvedValue({ id: 8, userId: 1, productId: 42, quantity: 3 });
      prisma.cartItem.delete.mockResolvedValue({ id: 8 });

      const result = await service.remove(1, 8);

      expect(prisma.cartItem.findFirst).toHaveBeenCalledWith({ where: { id: 8, userId: 1 } });
      expect(abandonedCart.createFromCart).toHaveBeenCalledWith(1, undefined, [
        { productId: 42, quantity: 3 },
      ]);
      expect(prisma.cartItem.delete).toHaveBeenCalledWith({ where: { id: 8 } });
      expect(result).toEqual({ message: 'Item removed' });
    });

    it('throws when the item does not exist or belongs to another user', async () => {
      prisma.cartItem.findFirst.mockResolvedValue(null);

      await expect(service.remove(1, 999)).rejects.toThrow('Cart item not found');
      expect(prisma.cartItem.delete).not.toHaveBeenCalled();
      expect(abandonedCart.createFromCart).not.toHaveBeenCalled();
    });
  });
});
