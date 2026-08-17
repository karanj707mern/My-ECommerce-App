import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { RabbitMqService } from '@/notification/rabbitmq/rabbitmq.service';
import { PrismaService } from '@/prisma/prisma.service';
import Redis from 'ioredis';

interface CheckResult {
  database: { status: string; latencyMs?: number };
  redis: { status: string; latencyMs?: number };
  rabbitmq: { status: string; latencyMs?: number };
}

interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  checks: CheckResult;
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitMqService: RabbitMqService,
  ) {}

  @Get()
  async check(): Promise<HealthResponse> {
    const checks: CheckResult = {
      database: { status: 'down' },
      redis: { status: 'not_configured' },
      rabbitmq: { status: 'down' },
    };

    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'ok', latencyMs: Date.now() - start };
    } catch {
      checks.database = { status: 'down' };
    }

    const redisUrl = process.env.REDIS_URL?.trim();
    const isProduction = process.env.NODE_ENV === 'production';

    if (redisUrl) {
      const client = new Redis(redisUrl, {
        lazyConnect: true,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        ...(isProduction ? { tls: {} } : {}),
        retryStrategy: () => null,
      });

      try {
        const start = Date.now();
        await client.connect();
        await client.ping();
        checks.redis = { status: 'ok', latencyMs: Date.now() - start };
      } catch {
        checks.redis = { status: 'down' };
      } finally {
        void client.quit();
      }
    }

    if (this.rabbitMqService.isConfigured) {
      try {
        const start = Date.now();
        const isConnected = await Promise.race([
          Promise.resolve(this.rabbitMqService.isConnected),
          new Promise<boolean>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 2000),
          ),
        ]);
        checks.rabbitmq = {
          status: isConnected ? 'ok' : 'degraded',
          latencyMs: isConnected ? Date.now() - start : undefined,
        };
      } catch {
        checks.rabbitmq = { status: 'down' };
      }
    } else {
      checks.rabbitmq = { status: 'not_configured' };
    }

    const allHealthy =
      checks.database.status === 'ok' &&
      (checks.redis.status === 'ok' ||
        checks.redis.status === 'not_configured') &&
      (checks.rabbitmq.status === 'ok' ||
        checks.rabbitmq.status === 'not_configured');

    const status: HealthResponse['status'] = allHealthy ? 'ok' : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  @Get('ready')
  async ready(@Res() res: Response): Promise<void> {
    const health = await this.check();

    if (health.status === 'ok') {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not_ready' });
    }
  }

  @Get('live')
  live(@Res() res: Response): void {
    res.status(200).json({ status: 'alive' });
  }
}
