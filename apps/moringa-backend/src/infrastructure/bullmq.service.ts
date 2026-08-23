import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';

export interface BullMQConfig {
  connection: {
    url: string;
    // Must be null for BullMQ (it relies on blocking Redis commands)
    maxRetriesPerRequest?: number | null;
  };
  defaultJobOptions?: {
    attempts?: number;
    backoff?: {
      type: 'exponential' | 'linear';
      delay: number;
    };
    removeOnComplete?: { count: number; age: number } | boolean;
    removeOnFail?: { age: number } | boolean;
  };
}

export interface OrderJobData {
  orderId: number;
  userId: number;
  action: 'send_confirmation' | 'update_inventory' | 'send_notification' | 'process_payment';
  payload: Record<string, unknown>;
  idempotencyKey: string;
}

export type OrderJobHandler = (
  data: OrderJobData,
  job: Job<OrderJobData>,
) => Promise<void>;

@Injectable()
export class BullMQService implements OnModuleDestroy {
  private readonly queue: Queue<OrderJobData>;
  private readonly worker: Worker<OrderJobData>;
  private readonly connection: Redis;
  /**
   * Action → handler registry. Feature modules register handlers at init time
   * (see OrderModule) so the infrastructure layer stays decoupled from
   * business modules while jobs still dispatch to real implementations.
   */
  private readonly processors = new Map<string, OrderJobHandler>();

  constructor(@Inject('BULLMQ_CONFIG') config: BullMQConfig) {
    this.connection = new Redis(config.connection.url, {
      maxRetriesPerRequest: config.connection.maxRetriesPerRequest ?? null,
    });

    this.queue = new Queue<OrderJobData>('order-events', {
      connection: this.connection,
      defaultJobOptions: {
        attempts: config.defaultJobOptions?.attempts ?? 5,
        backoff: {
          type: config.defaultJobOptions?.backoff?.type ?? 'exponential',
          delay: config.defaultJobOptions?.backoff?.delay ?? 1000,
        },
        removeOnComplete: config.defaultJobOptions?.removeOnComplete ?? { count: 100, age: 24 * 3600 },
        removeOnFail: config.defaultJobOptions?.removeOnFail ?? { age: 7 * 24 * 3600 },
      },
    });

    this.worker = new Worker<OrderJobData>(
      'order-events',
      async (job: Job<OrderJobData>) => {
        const { action } = job.data;
        const handler = this.processors.get(action);

        if (!handler) {
          // Unknown/unwired actions are acknowledged with a warning so they do
          // not retry forever and poison the queue.
          console.warn(
            `[BullMQ] no processor registered for action "${action}" — job ${job.id} skipped`,
          );
          return;
        }

        await handler(job.data, job);
      },
      {
        connection: this.connection,
        concurrency: 10,
        removeOnComplete: { count: 100, age: 24 * 3600 },
        removeOnFail: { age: 7 * 24 * 3600 },
      },
    );

    this.worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err);
    });

    this.worker.on('error', (err) => {
      console.error('BullMQ worker error:', err);
    });
  }

  /**
   * Register the business handler for a job action (e.g. 'send_confirmation').
   * Later registrations for the same action override earlier ones.
   */
  registerProcessor(action: string, handler: OrderJobHandler): void {
    this.processors.set(action, handler);
  }

  async enqueue(data: OrderJobData): Promise<void> {
    await this.queue.add(
      'order-event',
      data,
      {
        jobId: `order:${data.orderId}:${data.action}:${data.idempotencyKey}`,
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  async getJob(jobId: string): Promise<Job<OrderJobData> | undefined> {
    return await this.queue.getJob(jobId);
  }

  async onModuleDestroy() {
    await this.worker.close();
    await this.queue.close();
    await this.connection.quit();
  }
}
