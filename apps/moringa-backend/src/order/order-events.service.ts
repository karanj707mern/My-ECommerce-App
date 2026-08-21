import { Injectable } from '@nestjs/common';
import { RedisService } from '@/infrastructure/redis.service';
import { BullMQService } from '@/infrastructure/bullmq.service';
import { RabbitMQService } from '@/infrastructure/rabbitmq.service';

export interface OrderEventMessage {
  type: 'order.created' | 'order.updated' | 'order.cancelled' | 'order.paid';
  orderId: number;
  userId: number;
  status: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

@Injectable()
export class OrderEventsService {
  private readonly LAST_USER_EVENT_PREFIX = 'order:last:user:';
  private readonly LAST_ADMIN_EVENT_PREFIX = 'order:last:admin:';

  constructor(
    private readonly redisService: RedisService,
    private readonly bullMQService: BullMQService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

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
      data: message.payload,
      timestamp: message.timestamp,
      idempotencyKey: `order:${event.orderId}:rabbit`,
    });
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
      data: message.payload,
      timestamp: message.timestamp,
      idempotencyKey: `order:${event.orderId}:updated`,
    });
  }

  subscribeOrderUpdates() {
    // Returns an observable-like subscription interface
    // For Socket.IO integration, the gateway will call this
    return {
      subscribe: (callback: (event: OrderEventMessage) => void) => {
        // In production, this would integrate with RxJS Subject or EventEmitter
        console.log('Subscribed to order updates');
        return { unsubscribe: () => console.log('Unsubscribed from order updates') };
      },
    };
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
