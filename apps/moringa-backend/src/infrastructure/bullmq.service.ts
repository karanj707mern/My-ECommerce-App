import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';

export interface BullMQConfig {
  connection: {
    url: string;
    maxRetriesPerRequest?: number;
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

@Injectable()
export class BullMQService implements OnModuleDestroy {
  private readonly queue: Queue<OrderJobData>;
  private readonly worker: Worker<OrderJobData>;
  private readonly connection: Redis;

  constructor(config: BullMQConfig) {
    this.connection = new Redis(config.connection.url, {
      maxRetriesPerRequest: config.connection.maxRetriesPerRequest ?? 3,
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
        const { orderId, userId, action, payload } = job.data;

        try {
          switch (action) {
            case 'send_confirmation':
              console.log(`Sending confirmation for order ${orderId}, user ${userId}`);
              // Integration point: await this.notificationService.sendOrderConfirmation(payload);
              break;
            case 'update_inventory':
              console.log(`Updating inventory for order ${orderId}`);
              // Integration point: await this.inventoryService.updateStock(payload);
              break;
            case 'send_notification':
              console.log(`Sending notification for order ${orderId}, user ${userId}`);
              // Integration point: await this.notificationService.pushNotification(payload);
              break;
            case 'process_payment':
              console.log(`Processing payment for order ${orderId}`);
              // Integration point: await this.paymentService.processPayment(payload);
              break;
            default:
              console.warn(`Unknown action: ${action}`);
          }
        } catch (error) {
          console.error(`Error processing job ${job.id}:`, error);
          throw error;
        }
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
