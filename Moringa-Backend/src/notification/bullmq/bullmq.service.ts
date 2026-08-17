import { PinoLogger } from '@/common/logger/pino.service';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

interface NotificationJobData {
  notificationId: number;
}

@Injectable()
export class BullMqService implements OnModuleInit, OnModuleDestroy {
  private readonly queueName = 'notifications';
  private queue?: Queue;
  private worker?: Worker<NotificationJobData>;
  private handler?: (notificationId: number) => Promise<void>;
  private redisClient?: Redis;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {}

  get isConfigured(): boolean {
    return Boolean(this.configService.get<string>('redis.url', ''));
  }

  setHandler(handler: (notificationId: number) => Promise<void>): void {
    this.handler = handler;
  }

  async onModuleInit() {
    if (!this.isConfigured) {
      this.logger.warn(
        'BullMQ not configured. Notification delivery will use in-process queue.',
      );
      return Promise.resolve();
    }

    const redisUrl = this.configService.get<string>('redis.url', '');
    const isProduction = process.env.NODE_ENV === 'production';

    this.redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      ...(isProduction ? { tls: {} } : {}),
    });

    this.queue = new Queue(this.queueName, {
      connection: this.redisClient,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: false,
        removeOnFail: false,
      },
    });

    this.worker = new Worker(
      this.queueName,
      async (job: Job<NotificationJobData>) => {
        if (this.handler) {
          await this.handler(job.data.notificationId);
        }
      },
      {
        connection: this.redisClient,
        concurrency: 5,
        limiter: { max: 10, duration: 1000 },
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Notification job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `Notification job ${job?.id} failed`,
        err instanceof Error ? err.stack : err,
      );
    });

    this.queue.on('error', (error) => {
      this.logger.error(
        'BullMQ queue error',
        error instanceof Error ? error.stack : String(error),
      );
    });

    this.worker.on('error', (error) => {
      this.logger.error(
        'BullMQ worker error',
        error instanceof Error ? error.stack : String(error),
      );
    });

    this.logger.log('BullMQ connected and worker started');
  }

  async onModuleDestroy() {
    try {
      await this.worker?.close();
      await this.queue?.close();
      await this.redisClient?.quit();
    } catch (error) {
      this.logger.error(
        'Error closing BullMQ connection',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async addJob(notificationId: number): Promise<void> {
    if (!this.queue) {
      return Promise.resolve();
    }

    try {
      await this.queue.add('process', { notificationId });
    } catch (error) {
      this.logger.error(
        'Failed to add BullMQ job',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
