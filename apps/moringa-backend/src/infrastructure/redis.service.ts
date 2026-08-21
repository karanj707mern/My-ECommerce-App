import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

export interface RedisConfig {
  url: string;
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
  keepAlive?: number;
  commandTimeout?: number;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly pubSub: Redis;

  constructor(config: RedisConfig) {
    const {
      url,
      maxRetriesPerRequest = 3,
      enableReadyCheck = true,
      keepAlive = 30000,
      commandTimeout = 5000,
    } = config;

    this.client = new Redis(url, {
      maxRetriesPerRequest,
      enableReadyCheck,
      keepAlive,
      commandTimeout,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.pubSub = new Redis(url, {
      maxRetriesPerRequest,
      enableReadyCheck,
      keepAlive,
    });

    this.client.on('connect', () => {
      console.log('Redis client connected');
    });

    this.client.on('error', (err) => {
      console.error('Redis client error:', err);
    });

    this.pubSub.on('connect', () => {
      console.log('Redis pub/sub connected');
    });

    this.pubSub.on('error', (err) => {
      console.error('Redis pub/sub error:', err);
    });
  }

  getClient(): Redis {
    return this.client;
  }

  getPubSub(): Redis {
    return this.pubSub;
  }

  async onModuleDestroy() {
    await this.client.quit();
    await this.pubSub.quit();
  }
}
