import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { ProductService } from './product.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from '../cache/redis-cache.service';
import { StorageService } from '../storage/storage.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

/**
 * Unit tests for ProductService.
 *
 * Exercises the service's real logic — payload normalization, unique-constraint
 * translation, cache read-through, and not-found guards — against jest-mocked
 * collaborators. No database, Redis, or storage backend is touched.
 */
describe('ProductService', () => {
  let service: ProductService;
  let prisma: {
    product: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let cache: { getJson: jest.Mock; setJson: jest.Mock; del: jest.Mock };
  let storage: { uploadFile: jest.Mock };

  beforeEach(async () => {
    prisma = {
      product: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    cache = { getJson: jest.fn(), setJson: jest.fn(), del: jest.fn() };
    storage = { uploadFile: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisCacheService, useValue: cache },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  it('is constructed with its collaborators', () => {
    expect(service).toBeDefined();
  });

  describe('normalizeCreateProductPayload', () => {
    it('trims string fields, lowercases slug, uppercases SKU', async () => {
      prisma.product.create.mockResolvedValue({ id: 1 });

      await service.createProduct({
        name: '  Moringa Powder  ',
        slug: '  Moringa-Powder ',
        sku: ' mrk-001 ',
        description: '  fresh ',
        image: '  img.jpg ',
        price: 100,
        stock: 10,
      });

      const created = prisma.product.create.mock.calls[0][0];
      expect(created.data).toMatchObject({
        name: 'Moringa Powder',
        slug: 'moringa-powder',
        sku: 'MRK-001',
        description: 'fresh',
        image: 'img.jpg',
      });
    });

    it('normalizes tags to a deduplicated, trimmed, lowercase set', async () => {
      prisma.product.create.mockResolvedValue({ id: 1 });

      await service.createProduct({
        name: 'A',
        slug: 'a',
        sku: 'a',
        description: 'd',
        image: 'i',
        price: 100,
        stock: 10,
        tags: ['  Wellness ', 'wellness', '  ', 'ORGANIC', 'organic'],
      });

      const tags = prisma.product.create.mock.calls[0][0].data.tags;
      expect(tags).toEqual(['wellness', 'organic']);
    });

    it('applies defaults for optional boolean/numeric fields', async () => {
      prisma.product.create.mockResolvedValue({ id: 1 });

      await service.createProduct({
        name: 'A',
        slug: 'a',
        sku: 'a',
        description: 'd',
        image: 'i',
        price: 100,
        stock: 10,
      });

      expect(prisma.product.create.mock.calls[0][0].data).toMatchObject({
        isActive: true,
        isNewArrival: false,
        brand: null,
        weightGrams: null,
        compareAtPrice: null,
      });
    });
  });

  describe('createProduct', () => {
    it('creates a product and invalidates the product caches', async () => {
      prisma.product.create.mockResolvedValue({ id: 7, name: 'X' });
      cache.del.mockResolvedValue(undefined);

      const result = await service.createProduct({
        name: 'X',
        slug: 'x',
        sku: 'x',
        description: 'd',
        image: 'i',
        price: 100,
        stock: 10,
      });

      expect(result).toMatchObject({ id: 7 });
      // Cache invalidation must touch the list/new-arrival keys.
      expect(cache.del).toHaveBeenCalledWith('products:active');
      expect(cache.del).toHaveBeenCalledWith('products:all');
      expect(cache.del).toHaveBeenCalledWith('products:new-arrivals:8');
      expect(cache.del).toHaveBeenCalledWith('product:7');
      expect(cache.del).toHaveBeenCalledWith('product:7:all');
    });

    it('translates a Prisma unique-constraint violation into ConflictException', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: 'test',
      });
      prisma.product.create.mockRejectedValue(prismaError);

      await expect(
        service.createProduct({ name: 'X', slug: 'x', sku: 'x', description: 'd', image: 'i', price: 100, stock: 10 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rethrows non-unique Prisma errors unchanged', async () => {
      const generic = new Error('DB down');
      prisma.product.create.mockRejectedValue(generic);

      await expect(
        service.createProduct({ name: 'X', slug: 'x', sku: 'x', description: 'd', image: 'i', price: 100, stock: 10 }),
      ).rejects.toBe(generic);
    });
  });

  describe('getProducts', () => {
    it('returns cached products on a cache hit without querying the DB', async () => {
      const cached = [{ id: 1, name: 'Cached' }];
      cache.getJson.mockResolvedValue(cached);

      const result = await service.getProducts(false, 0, 10);

      expect(result).toBe(cached);
      expect(prisma.product.findMany).not.toHaveBeenCalled();
      expect(cache.setJson).not.toHaveBeenCalled();
    });

    it('fetches from DB, caps take at 50, and populates the cache on a miss', async () => {
      cache.getJson.mockResolvedValue(null);
      prisma.product.findMany.mockResolvedValue([{ id: 2 }]);

      const result = await service.getProducts(false, 10, 999);

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
        skip: 10,
        take: 50,
      });
      expect(cache.setJson).toHaveBeenCalledWith('products:active:10:50', [{ id: 2 }], 300);
      expect(result).toEqual([{ id: 2 }]);
    });

    it('omits the isActive filter when includeInactive is true', async () => {
      cache.getJson.mockResolvedValue(null);
      prisma.product.findMany.mockResolvedValue([]);

      await service.getProducts(true);

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });
  });

  describe('getNewArrivals', () => {
    it('caches and returns only active new-arrival products', async () => {
      cache.getJson.mockResolvedValue(null);
      prisma.product.findMany.mockResolvedValue([{ id: 5 }]);

      const result = await service.getNewArrivals(8);

      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { isActive: true, isNewArrival: true },
        orderBy: { createdAt: 'desc' },
        take: 8,
      });
      expect(cache.setJson).toHaveBeenCalledWith('products:new-arrivals:8', [{ id: 5 }], 300);
      expect(result).toEqual([{ id: 5 }]);
    });
  });

  describe('getProductById', () => {
    it('returns a cached product on a cache hit', async () => {
      cache.getJson.mockResolvedValue({ id: 3, name: 'Cached' });

      const result = await service.getProductById(3);

      expect(result).toEqual({ id: 3, name: 'Cached' });
      expect(prisma.product.findUnique).not.toHaveBeenCalled();
    });

    it('finds an active product by id on a cache miss', async () => {
      cache.getJson.mockResolvedValue(null);
      prisma.product.findUnique.mockResolvedValue({ id: 3, name: 'Found' });

      const result = await service.getProductById(3);

      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 3, isActive: true },
      });
      expect(cache.setJson).toHaveBeenCalledWith('product:3', { id: 3, name: 'Found' }, 300);
      expect(result).toEqual({ id: 3, name: 'Found' });
    });

    it('throws NotFoundException when the product does not exist', async () => {
      cache.getJson.mockResolvedValue(null);
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.getProductById(999)).rejects.toBeInstanceOf(NotFoundException);
      expect(cache.setJson).not.toHaveBeenCalled();
    });

    it('bypasses the isActive filter when includeInactive is true', async () => {
      cache.getJson.mockResolvedValue(null);
      prisma.product.findUnique.mockResolvedValue({ id: 9 });

      await service.getProductById(9, true);

      expect(prisma.product.findUnique).toHaveBeenCalledWith({ where: { id: 9 } });
    });
  });

  describe('updateProduct', () => {
    it('updates an existing product and invalidates caches', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 4 });
      prisma.product.update.mockResolvedValue({ id: 4, name: 'Updated' });

      const result = await service.updateProduct(4, { name: 'Updated' });

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 4 },
        data: expect.objectContaining({ name: 'Updated' }),
      });
      expect(cache.del).toHaveBeenCalledWith('products:active');
      expect(result).toMatchObject({ id: 4, name: 'Updated' });
    });

    it('throws NotFoundException when updating a missing product', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.updateProduct(4, { name: 'X' })).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('translates a unique-constraint violation on update into ConflictException', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 4 });
      prisma.product.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(service.updateProduct(4, { slug: 'dup' })).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('deleteProduct', () => {
    it('deletes the product and invalidates caches', async () => {
      prisma.product.delete.mockResolvedValue({ id: 6 });

      const result = await service.deleteProduct(6);

      expect(prisma.product.delete).toHaveBeenCalledWith({ where: { id: 6 } });
      expect(cache.del).toHaveBeenCalledWith('product:6');
      expect(cache.del).toHaveBeenCalledWith('product:6:all');
      expect(result).toMatchObject({ id: 6 });
    });
  });

  describe('uploadProductImage', () => {
    it('delegates to the storage service and returns the stored url', async () => {
      storage.uploadFile.mockResolvedValue({ url: 'https://cdn.example.com/p.jpg' });

      const result = await service.uploadProductImage({
        buffer: Buffer.from('x'),
        originalname: 'p.jpg',
        mimetype: 'image/jpeg',
      });

      expect(storage.uploadFile).toHaveBeenCalledTimes(1);
      expect(storage.uploadFile.mock.calls[0][1]).toBe('products');
      expect(storage.uploadFile.mock.calls[0][2]).toBe('product');
      expect(storage.uploadFile.mock.calls[0][0]).toMatchObject({
        originalname: 'p.jpg',
        mimetype: 'image/jpeg',
      });
      expect(storage.uploadFile.mock.calls[0][0].buffer).toBeInstanceOf(Buffer);
      expect(result).toEqual({ url: 'https://cdn.example.com/p.jpg' });
    });
  });
});
