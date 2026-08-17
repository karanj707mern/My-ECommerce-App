import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly client: Redis | null;
  private readonly redisUrl: string;
  private readonly defaultTtlSeconds: number;

  constructor(private readonly configService: ConfigService) {
    this.redisUrl = this.configService.get<string>('redis.url', '');
    this.defaultTtlSeconds = this.configService.get<number>(
      'redis.cacheTtlSeconds',
      300,
    );

    if (!this.redisUrl) {
      this.client = null;
      this.logger.warn('REDIS_URL is not set. Redis cache is disabled.');
      return;
    }

    this.client = this.createClient();

    this.client.on('error', (error) => {
      this.logger.error(`Redis cache error: ${error.message}`);
    });

    this.client.on('connect', () => {
      this.logger.log('Connected to Redis cache');
    });

    this.client.on('ready', () => {
      this.logger.log('Redis cache is ready');
    });
  }

  createClient(): Redis {
    const isProduction = process.env.NODE_ENV === 'production';

    return new Redis(this.redisUrl, {
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      ...(isProduction ? { tls: {} } : {}),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });
  }

  get url() {
    return this.redisUrl;
  }

  get isEnabled() {
    return Boolean(this.client);
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (!this.client) {
      return null;
    }

    const value = await this.client.get(key);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.warn(
        `Failed to parse cached JSON for key "${key}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  async setJson(
    key: string,
    value: unknown,
    ttlSeconds = this.defaultTtlSeconds,
  ) {
    if (!this.client) {
      return;
    }

    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async del(key: string) {
    if (!this.client) {
      return;
    }

    await this.client.del(key);
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
    }
  }
}
