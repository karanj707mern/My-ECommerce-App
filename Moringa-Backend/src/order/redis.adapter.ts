import { type INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis, { type Redis as RedisClient } from 'ioredis';
import type { Server, ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);

  private pubClient?: RedisClient;
  private subClient?: RedisClient;
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  private healthCheckInterval?: NodeJS.Timeout;
  private isHealthy = false;
  private readonly healthCheckKey = 'socket.io:health-check';

  constructor(
    app: INestApplicationContext,
    private readonly redisUrl: string,
    private readonly allowedOrigins: string[],
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    if (!this.redisUrl) {
      this.logger.warn(
        'REDIS_URL not configured. Socket.IO running without Redis adapter',
      );
      return;
    }

    const isProduction = process.env.NODE_ENV === 'production';

    try {
      this.pubClient = new Redis(this.redisUrl, {
        lazyConnect: true,
        connectTimeout: 5000,
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        ...(isProduction ? { tls: {} } : {}),
        retryStrategy: (times: number): number | null => {
          if (times > 1) {
            this.logger.error('Redis retry attempts exhausted');
            return null;
          }

          return Math.min(times * 100, 3000);
        },
      });

      this.subClient = this.pubClient.duplicate();

      this.registerRedisEvents(this.pubClient, 'PUB');
      this.registerRedisEvents(this.subClient, 'SUB');

      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);

      this.adapterConstructor = createAdapter(this.pubClient, this.subClient);
      this.isHealthy = true;

      this.logger.log('Socket.IO Redis adapter initialized');
      this.startHealthCheck();
    } catch (error: unknown) {
      this.isHealthy = false;
      const message = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Failed to initialize Redis adapter: ${message}`);

      this.pubClient?.disconnect();
      this.subClient?.disconnect();
      this.pubClient = undefined;
      this.subClient = undefined;

      throw error;
    }
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, {
      ...options,

      cors: {
        origin: (
          origin: string | undefined,
          callback: (err: Error | null, allow: boolean) => void,
        ) => {
          if (!origin) {
            callback(null, true);
            return;
          }

          const normalizedOrigin = origin.replace(/\/$/, '');
          const isAllowed = this.allowedOrigins.some((allowed) => {
            const normalizedAllowed = allowed.replace(/\/$/, '');

            if (normalizedAllowed === normalizedOrigin) {
              return true;
            }

            if (!normalizedAllowed.includes('*')) {
              return false;
            }

            const pattern = normalizedAllowed
              .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
              .replace(/\\\*/g, '.*');

            return new RegExp(`^${pattern}$`).test(normalizedOrigin);
          });

          if (isAllowed) {
            callback(null, true);
            return;
          }

          this.logger.warn(`Blocked Socket.IO origin: ${origin}`);

          callback(new Error('Origin not allowed by CORS'), false);
        },

        credentials: true,
        methods: ['GET', 'POST'],
      },

      transports: ['websocket'],
      allowEIO3: false,
    }) as Server;

    if (this.adapterConstructor) {
      server.adapter(
        this.adapterConstructor as Parameters<typeof server.adapter>[0],
      );

      this.logger.log('Redis adapter attached to Socket.IO server');
    } else {
      this.logger.warn('Socket.IO running without Redis adapter');
    }

    return server;
  }

  private registerRedisEvents(client: RedisClient, type: 'PUB' | 'SUB'): void {
    client.on('connect', () => {
      this.logger.log(`Redis ${type} client connected`);
    });

    client.on('ready', () => {
      this.logger.log(`Redis ${type} client ready`);
      this.isHealthy = true;
    });

    client.on('reconnecting', () => {
      this.logger.warn(`Redis ${type} client reconnecting`);
      this.isHealthy = false;
    });

    client.on('close', () => {
      this.logger.warn(`Redis ${type} client connection closed`);
      this.isHealthy = false;
    });

    client.on('error', (err: Error) => {
      this.logger.error(`Redis ${type} client error: ${err.message}`);
      this.isHealthy = false;
    });

    client.on('end', () => {
      this.logger.warn(`Redis ${type} client connection ended`);
      this.isHealthy = false;
    });
  }

  private startHealthCheck(): void {
    if (!this.pubClient) {
      return;
    }

    this.healthCheckInterval = setInterval(() => {
      void this.healthCheck();
    }, 30000);
  }

  private async healthCheck(): Promise<void> {
    if (!this.pubClient) {
      return;
    }

    try {
      const result = await this.pubClient.ping();
      this.isHealthy = result === 'PONG';
    } catch {
      this.isHealthy = false;
    }
  }

  async close(): Promise<void> {
    const disconnectPromises: Promise<unknown>[] = [];

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    try {
      if (this.pubClient) {
        disconnectPromises.push(this.pubClient.quit());
      }

      if (this.subClient) {
        disconnectPromises.push(this.subClient.quit());
      }

      await Promise.allSettled(disconnectPromises);

      this.isHealthy = false;
      this.logger.log('Redis connections closed gracefully');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Redis shutdown error: ${message}`);

      this.pubClient?.disconnect();
      this.subClient?.disconnect();
      this.isHealthy = false;
    }
  }

  get connectionHealth(): boolean {
    return this.isHealthy;
  }
}
