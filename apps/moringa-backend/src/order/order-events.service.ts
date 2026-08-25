import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Subscription, Subject } from 'rxjs';
import { RedisService } from '../infrastructure/redis.service';
import { BullMQService } from '../infrastructure/bullmq.service';
import { RabbitMQService } from '../infrastructure/rabbitmq.service';

export interface OrderEventMessage {
  type: 'order.created' | 'order.updated' | 'order.cancelled' | 'order.paid';
  orderId: number;
  userId: number;
  status: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

/**
 * Callback shape consumed by the OrderGateway broadcast pipeline.
 */
export interface OrderUpdateNotification {
  userId: number;
  message: OrderEventMessage;
}

@Injectable()
export class OrderEventsService implements OnModuleDestroy {
  private readonly logger = new Logger(OrderEventsService.name);
  private readonly LAST_USER_EVENT_PREFIX = 'order:last:user:';
  private readonly LAST_ADMIN_EVENT_PREFIX = 'order:last:admin:';
  /**
   * In-process event stream consumed by the WebSocket gateway. Cross-instance
   * fan-out is handled by the Socket.IO Redis adapter; RabbitMQ consumers feed
   * events raised by OTHER services back into this stream (see onModuleInit).
   */
  private readonly updates$ = new Subject<OrderUpdateNotification>();
  private rabbitSubscription?: { unsubscribe: () => void };

  constructor(
    private readonly redisService: RedisService,
    private readonly bullMQService: BullMQService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  onModuleInit(): void {
    // Consume order events published by other service instances/domains so the
    // gateway stream stays consistent across the deployment.
    if (!this.rabbitMQService.isConfigured) {
      return;
    }

    void this.rabbitMQService
      .consume('orderEvents', async (payload) => {
        const data = payload.data as {
          userId?: number;
          orderId?: number;
          status?: string;
        };

        if (!data?.userId || !data?.orderId) {
          return;
        }

        this.updates$.next({
          userId: data.userId,
          message: {
            type: payload.type as OrderEventMessage['type'],
            orderId: data.orderId,
            userId: data.userId,
            status: data.status ?? 'UNKNOWN',
            timestamp: payload.timestamp,
            payload: payload.data,
          },
        });
      })
      .then(() => {
        this.logger.log('RabbitMQ order.* consumer registered');
      })
      .catch((error) => {
        this.logger.warn(
          `RabbitMQ consumer registration skipped: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
  }

  onModuleDestroy(): void {
    this.updates$.complete();
    this.rabbitSubscription?.unsubscribe();
  }

  async emitOrderCreated(event: Omit<OrderEventMessage, 'timestamp'>): Promise<void> {
    const message: OrderEventMessage = {
      ...event,
      timestamp: Date.now(),
    };

    // Store last event for WebSocket gateway cache
    await this.redisService
      .getClient()
      .setex(`${this.LAST_USER_EVENT_PREFIX}${event.userId}`, 3600, JSON.stringify(message));

    if (event.status === 'PENDING' || event.status === 'PAID') {
      await this.redisService
        .getClient()
        .setex(`${this.LAST_ADMIN_EVENT_PREFIX}${event.orderId}`, 3600, JSON.stringify(message));
    }

    // Enqueue background jobs via BullMQ
    await this.bullMQService.enqueue({
      orderId: event.orderId,
      userId: event.userId,
      action: 'send_confirmation',
      payload: message.payload,
      idempotencyKey: `order:${event.orderId}:created`,
    });

    await this.bullMQService.enqueue({
      orderId: event.orderId,
      userId: event.userId,
      action: 'send_notification',
      payload: { type: 'ORDER_PLACED', orderId: event.orderId },
      idempotencyKey: `order:${event.orderId}:notification`,
    });

    // Publish cross-service event via RabbitMQ
    await this.rabbitMQService.publish({
      type: 'order.created',
      data: { ...message.payload, userId: event.userId, orderId: event.orderId, status: event.status },
      timestamp: message.timestamp,
      idempotencyKey: `order:${event.orderId}:rabbit`,
    });

    this.updates$.next({ userId: event.userId, message });
  }

  async emitOrderUpdated(event: Omit<OrderEventMessage, 'timestamp'>): Promise<void> {
    const message: OrderEventMessage = {
      ...event,
      timestamp: Date.now(),
    };

    await this.redisService
      .getClient()
      .setex(`${this.LAST_USER_EVENT_PREFIX}${event.userId}`, 3600, JSON.stringify(message));

    await this.bullMQService.enqueue({
      orderId: event.orderId,
      userId: event.userId,
      action: 'send_notification',
      payload: { type: 'ORDER_STATUS_UPDATED', orderId: event.orderId, status: event.status },
      idempotencyKey: `order:${event.orderId}:status`,
    });

    await this.rabbitMQService.publish({
      type: 'order.updated',
      data: { ...message.payload, userId: event.userId, orderId: event.orderId, status: event.status },
      timestamp: message.timestamp,
      idempotencyKey: `order:${event.orderId}:updated`,
    });

    this.updates$.next({ userId: event.userId, message });
  }

  async emitOrderCancelled(event: Omit<OrderEventMessage, 'timestamp'>): Promise<void> {
    const message: OrderEventMessage = {
      ...event,
      timestamp: Date.now(),
    };

    await this.redisService
      .getClient()
      .setex(`${this.LAST_USER_EVENT_PREFIX}${event.userId}`, 3600, JSON.stringify(message));

    await this.bullMQService.enqueue({
      orderId: event.orderId,
      userId: event.userId,
      action: 'send_notification',
      payload: { type: 'ORDER_CANCELLED', orderId: event.orderId },
      idempotencyKey: `order:${event.orderId}:cancelled`,
    });

    await this.rabbitMQService.publish({
      type: 'order.cancelled',
      data: { ...message.payload, userId: event.userId, orderId: event.orderId, status: event.status },
      timestamp: message.timestamp,
      idempotencyKey: `order:${event.orderId}:cancelled:rabbit`,
    });

    this.updates$.next({ userId: event.userId, message });
  }

  /**
   * Stream of order updates for the WebSocket gateway. Returns an RxJS
   * Subscription so callers can unsubscribe on shutdown.
   */
  subscribeOrderUpdates() {
    return this.updates$.subscribe();
  }

  /**
   * Subscribe with a callback (gateway-friendly). Returns an unsubscribe handle.
   */
  onUpdate(callback: (update: OrderUpdateNotification) => void): { unsubscribe: () => void } {
    const subscription = this.updates$.subscribe(callback);
    return { unsubscribe: () => subscription.unsubscribe() };
  }

  async getLastOrderEvent(userId: number): Promise<OrderEventMessage | null> {
    const raw = await this.redisService
      .getClient()
      .get(`${this.LAST_USER_EVENT_PREFIX}${userId}`);

    if (!raw) return null;

    try {
      return JSON.parse(raw) as OrderEventMessage;
    } catch {
      return null;
    }
  }

  async getLastAdminOrderEvent(): Promise<OrderEventMessage | null> {
    // Get the most recent admin-order event across all orders
    const keys = await this.redisService.getClient().keys(`${this.LAST_ADMIN_EVENT_PREFIX}*`);
    if (keys.length === 0) return null;

    const latestKey = keys.sort().pop();
    if (!latestKey) return null;

    const raw = await this.redisService.getClient().get(latestKey);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as OrderEventMessage;
    } catch {
      return null;
    }
  }
}
