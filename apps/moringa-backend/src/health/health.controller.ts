import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { RabbitMqService } from '../notification/rabbitmq/rabbitmq.service';
import { PrismaService } from '../prisma/prisma.service';
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

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitMqService: RabbitMqService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
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

    if (redisUrl) {
      // TLS only when the URL scheme explicitly requires it (rediss://);
      // forcing tls:{} under NODE_ENV=production breaks plain-redis providers.
      const isTlsUrl = redisUrl.startsWith('rediss://');
      const client = new Redis(redisUrl, {
        lazyConnect: true,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        ...(isTlsUrl ? { tls: {} } : {}),
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
        // quit() rejects when the client never reached READY state; fall back
        // to a forced disconnect so the probe can never crash the process.
        try {
          await client.quit();
        } catch {
          client.disconnect();
        }
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
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async ready(@Res() reply: FastifyReply): Promise<FastifyReply> {
    const health = await this.check();

    if (health.status === 'ok') {
      return reply.status(200).send({ status: 'ready' });
    }
    return reply.status(503).send({ status: 'not_ready' });
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  live(@Res() reply: FastifyReply): FastifyReply {
    return reply.status(200).send({ status: 'alive' });
  }
}
