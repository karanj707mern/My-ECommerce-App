import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../infrastructure/redis.service';

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly client: ReturnType<RedisService['getClient']>;

  constructor(private readonly prisma: PrismaService, private readonly redisService: RedisService) {
    this.client = this.redisService.getClient();
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(value);

    if (ttlSeconds > 0) {
      await this.client.setex(key, ttlSeconds, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async onModuleDestroy() {
    // Connection lifecycle managed by RedisService
  }
}
