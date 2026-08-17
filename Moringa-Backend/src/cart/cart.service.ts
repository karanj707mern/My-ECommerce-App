import * as crypto from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisCacheService } from '@/cache/redis-cache.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCartDto } from './dto/create-cart.dto';
import { GuestCartItemDto } from './dto/guest-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { AbandonedCartService } from '@/analytics/abandoned-cart.service';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly abandonedCartService: AbandonedCartService,
    private readonly cache: RedisCacheService,
  ) {}

  private generateGuestToken(): string {
    return crypto.randomUUID();
  }

  private getGuestCartExpiryThreshold(): Date {
    return new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  }

  private validateQuantityAgainstStock(
    product: { name: string; stock: number },
    quantity: number,
  ) {
    if (product.stock <= 0) {
      throw new BadRequestException(
        `${product.name} is currently out of stock.`,
      );
    }

    if (quantity > product.stock) {
      throw new BadRequestException(
        `${product.name} has only ${product.stock} item(s) available right now.`,
      );
    }
  }

  private async ensureCustomerAccount(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === 'ADMIN') {
      throw new BadRequestException('Admin accounts cannot use the cart.');
    }
  }

  async create(
    userId: number | undefined,
    createCartDto: CreateCartDto,
    guestToken?: string,
  ) {
    if (userId === undefined && !guestToken) {
      throw new BadRequestException('Guest token required');
    }

    if (userId !== undefined) {
      await this.ensureCustomerAccount(userId);
    }

    const { productId, quantity = 1 } = createCartDto;

    if (quantity < 1) {
      throw new BadRequestException('Quantity must be at least 1');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (userId !== undefined) {
      const existingCartItem = await this.prisma.cartItem.findUnique({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
      });

      const nextQuantity = (existingCartItem?.quantity ?? 0) + quantity;
      this.validateQuantityAgainstStock(product, nextQuantity);

      await this.prisma.cartItem.upsert({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
        update: {
          quantity: nextQuantity,
        },
        create: {
          userId,
          productId,
          quantity,
        },
      });

      await this.cache.del(`cart:user:${userId}`);

      return this.findAll(userId);
    }

    const existingCartItem = await this.prisma.cartItem.findFirst({
      where: {
        guestCartToken: guestToken!,
        productId,
      },
    });

    const nextQuantity = (existingCartItem?.quantity ?? 0) + quantity;
    this.validateQuantityAgainstStock(product, nextQuantity);

    if (existingCartItem) {
      await this.prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: { quantity: nextQuantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          productId,
          quantity,
          guestCartToken: guestToken!,
        },
      });
    }

    await this.cache.del(`cart:guest:${guestToken}`);

    return this.getGuestCart(guestToken);
  }

  async findAll(userId: number | undefined, guestToken?: string) {
    if (userId === undefined && !guestToken) {
      throw new BadRequestException('Guest token required');
    }

    const cacheKey =
      userId !== undefined ? `cart:user:${userId}` : `cart:guest:${guestToken}`;
    const cached =
      await this.cache.getJson<Record<string, unknown>[]>(cacheKey);
    if (cached) {
      return cached;
    }

    if (userId !== undefined) {
      await this.ensureCustomerAccount(userId);
      const result = await this.prisma.cartItem.findMany({
        where: { userId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              image: true,
              stock: true,
              slug: true,
            },
          },
        },
        orderBy: { id: 'desc' },
      });
      await this.cache.setJson(cacheKey, result, 300);
      return result;
    }

    const result = await this.prisma.cartItem.findMany({
      where: {
        guestCartToken: guestToken!,
        createdAt: { gt: this.getGuestCartExpiryThreshold() },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            image: true,
            stock: true,
            slug: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    });
    await this.cache.setJson(cacheKey, result, 300);
    return result;
  }

  async findOne(userId: number | undefined, id: number, guestToken?: string) {
    if (userId === undefined && !guestToken) {
      throw new BadRequestException('Guest token required');
    }

    if (userId !== undefined) {
      await this.ensureCustomerAccount(userId);
    }

    const whereClause =
      userId !== undefined
        ? { id, userId }
        : { id, guestCartToken: guestToken };

    const cartItem = await this.prisma.cartItem.findFirst({
      where: whereClause,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            image: true,
            stock: true,
            slug: true,
          },
        },
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    return cartItem;
  }

  async update(
    userId: number | undefined,
    id: number,
    updateCartDto: UpdateCartDto,
    guestToken?: string,
  ) {
    if (userId === undefined && !guestToken) {
      throw new BadRequestException('Guest token required');
    }

    if (userId !== undefined) {
      await this.ensureCustomerAccount(userId);
    }

    const whereClause =
      userId !== undefined
        ? { id, userId }
        : { id, guestCartToken: guestToken };

    const existingCartItem = await this.prisma.cartItem.findFirst({
      where: whereClause,
      include: {
        product: {
          select: {
            name: true,
            stock: true,
          },
        },
      },
    });

    if (!existingCartItem) {
      throw new NotFoundException('Cart item not found');
    }

    if (updateCartDto.quantity < 1) {
      await this.prisma.cartItem.delete({
        where: { id: existingCartItem.id },
      });

      return userId !== undefined
        ? this.findAll(userId)
        : this.getGuestCart(guestToken);
    }

    this.validateQuantityAgainstStock(
      existingCartItem.product,
      updateCartDto.quantity,
    );

    await this.prisma.cartItem.update({
      where: { id: existingCartItem.id },
      data: { quantity: updateCartDto.quantity },
    });

    await this.cache.del(`cart:user:${userId}`);
    await this.cache.del(`cart:guest:${guestToken}`);

    return userId !== undefined
      ? this.findAll(userId)
      : this.getGuestCart(guestToken);
  }

  async remove(userId: number | undefined, id: number, guestToken?: string) {
    if (userId === undefined && !guestToken) {
      throw new BadRequestException('Guest token required');
    }

    if (userId !== undefined) {
      await this.ensureCustomerAccount(userId);
    }

    const whereClause =
      userId !== undefined
        ? { id, userId }
        : { id, guestCartToken: guestToken };

    const existingCartItem = await this.prisma.cartItem.findFirst({
      where: whereClause,
    });

    if (!existingCartItem) {
      throw new NotFoundException('Cart item not found');
    }

    if (userId !== undefined) {
      await this.abandonedCartService.createFromCart(userId, undefined, [
        {
          productId: existingCartItem.productId,
          quantity: existingCartItem.quantity,
        },
      ]);
    }

    await this.prisma.cartItem.delete({
      where: { id: existingCartItem.id },
    });

    await this.cache.del(`cart:user:${userId}`);
    await this.cache.del(`cart:guest:${guestToken}`);

    return userId !== undefined
      ? this.findAll(userId)
      : this.getGuestCart(guestToken);
  }

  async clear(userId: number | undefined, guestToken?: string) {
    if (userId === undefined && !guestToken) {
      throw new BadRequestException('Guest token required');
    }

    if (userId !== undefined) {
      await this.ensureCustomerAccount(userId);
      const cartItems = await this.prisma.cartItem.findMany({
        where: { userId },
        select: { productId: true, quantity: true },
      });

      if (cartItems.length > 0) {
        await this.abandonedCartService.createFromCart(
          userId,
          undefined,
          cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        );
      }

      await this.prisma.cartItem.deleteMany({
        where: { userId },
      });

      await this.cache.del(`cart:user:${userId}`);

      return [];
    }

    const guestItems = await this.prisma.cartItem.findMany({
      where: {
        guestCartToken: guestToken!,
        createdAt: { gt: this.getGuestCartExpiryThreshold() },
      },
      select: { productId: true, quantity: true },
    });

    if (guestItems.length > 0) {
      await this.abandonedCartService.createFromCart(
        undefined,
        guestToken,
        guestItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      );
    }

    await this.prisma.cartItem.deleteMany({
      where: {
        guestCartToken: guestToken!,
        createdAt: { gt: this.getGuestCartExpiryThreshold() },
      },
    });

    await this.cache.del(`cart:guest:${guestToken}`);

    return [];
  }

  async createGuestCart(
    items: GuestCartItemDto[] = [],
    existingToken?: string,
  ) {
    const token = existingToken || this.generateGuestToken();

    for (const item of items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }

      const existing = await this.prisma.cartItem.findFirst({
        where: {
          guestCartToken: token,
          productId: item.productId,
        },
      });

      const nextQuantity = (existing?.quantity ?? 0) + item.quantity;
      this.validateQuantityAgainstStock(product, nextQuantity);

      if (existing) {
        await this.prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: nextQuantity },
        });
      } else {
        await this.prisma.cartItem.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            guestCartToken: token,
          },
        });
      }
    }

    return { token, cart: await this.getGuestCart(token) };
  }

  async getGuestCart(token?: string) {
    if (!token) {
      throw new BadRequestException('Guest token required');
    }

    const cacheKey = `cart:guest:${token}`;
    const cached =
      await this.cache.getJson<Record<string, unknown>[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.prisma.cartItem.findMany({
      where: {
        guestCartToken: token,
        createdAt: { gt: this.getGuestCartExpiryThreshold() },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            image: true,
            stock: true,
            slug: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    });
    await this.cache.setJson(cacheKey, result, 300);
    return result;
  }

  async mergeGuestCart(userId: number, token: string) {
    await this.ensureCustomerAccount(userId);

    const guestItems = await this.prisma.cartItem.findMany({
      where: {
        guestCartToken: token,
        createdAt: { gt: this.getGuestCartExpiryThreshold() },
      },
    });

    await this.prisma.$transaction(async (tx) => {
      for (const guestItem of guestItems) {
        const product = await tx.product.findUnique({
          where: { id: guestItem.productId },
        });

        if (!product) {
          continue;
        }

        const existingItem = await tx.cartItem.findUnique({
          where: {
            userId_productId: {
              userId,
              productId: guestItem.productId,
            },
          },
        });

        const nextQuantity = (existingItem?.quantity ?? 0) + guestItem.quantity;
        this.validateQuantityAgainstStock(product, nextQuantity);

        if (existingItem) {
          await tx.cartItem.update({
            where: { id: existingItem.id },
            data: { quantity: nextQuantity },
          });
        } else {
          await tx.cartItem.create({
            data: {
              userId,
              productId: guestItem.productId,
              quantity: guestItem.quantity,
            },
          });
        }
      }

      await tx.cartItem.deleteMany({
        where: {
          guestCartToken: token,
          createdAt: { gt: this.getGuestCartExpiryThreshold() },
        },
      });
    });

    await this.cache.del(`cart:user:${userId}`);
    await this.cache.del(`cart:guest:${token}`);

    return this.findAll(userId);
  }

  async deleteGuestCart(token: string) {
    if (!token) {
      throw new BadRequestException('Guest token required');
    }

    const guestItems = await this.prisma.cartItem.findMany({
      where: {
        guestCartToken: token,
        createdAt: { gt: this.getGuestCartExpiryThreshold() },
      },
      select: { productId: true, quantity: true },
    });

    if (guestItems.length > 0) {
      await this.abandonedCartService.createFromCart(
        undefined,
        token,
        guestItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      );
    }

    await this.prisma.cartItem.deleteMany({
      where: {
        guestCartToken: token,
        createdAt: { gt: this.getGuestCartExpiryThreshold() },
      },
    });

    await this.cache.del(`cart:guest:${token}`);
  }
}
