import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';

export interface RabbitMQConfig {
  url: string;
  exchangeName: string;
  queues: {
    orderEvents: string;
    notifications: string;
    analytics: string;
  };
}

export interface MessagePayload {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
  idempotencyKey: string;
}

@Injectable()
export class RabbitMQService implements OnModuleDestroy {
  private connection: amqp.ChannelModel | null = null;
  private connected = false;
  private channel: amqp.Channel | null = null;
  private readonly config: RabbitMQConfig;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  /** Set once onModuleDestroy runs — permanently disables (re)connection. */
  private destroyed = false;

  constructor(@Inject('RABBITMQ_CONFIG') config: RabbitMQConfig) {
    this.config = config;

    // Do not attempt connection when RabbitMQ is not provisioned (e.g. local
    // dev without the broker); publish/consume calls are guarded as well.
    if (!config.url) {
      return;
    }

    void this.connect();
  }

  /** True when a broker URL was provided at construction time. */
  get isConfigured(): boolean {
    return Boolean(this.config.url);
  }

  /**
   * Canonical queue names resolved from configuration. Consumers MUST use
   * these instead of string literals — a literal that drifts from the
   * declared topology makes the broker close the channel with 404
   * NOT_FOUND on consume.
   */
  get queues(): RabbitMQConfig['queues'] {
    return this.config.queues;
  }

  private async connect() {
    if (!this.config.url || this.destroyed) {
      return;
    }

    try {
      this.connection = await amqp.connect(this.config.url);

      // amqplib emits 'error' on connection/channel for broker-side failures
      // (topology mismatch, vhost loss, heartbeat timeout). An unhandled
      // 'error' event CRASHES the Node process — handlers must exist even if
      // they only log and mark the link down.
      this.connection.on('error', (err) => {
        console.error('RabbitMQ connection error:', err);
        this.connected = false;
        this.scheduleReconnect();
      });
      this.connection.on('close', () => {
        this.connected = false;
      });

      this.channel = await this.connection.createChannel();
      this.channel.on('error', (err) => {
        console.error('RabbitMQ channel error:', err);
        this.connected = false;
      });
      this.channel.on('close', () => {
        this.connected = false;
      });

      // Declare exchange as durable
      await this.channel.assertExchange(this.config.exchangeName, 'topic', { durable: true });

      // Declare durable queues
      await this.channel.assertQueue(this.config.queues.orderEvents, { durable: true });
      await this.channel.assertQueue(this.config.queues.notifications, { durable: true });
      await this.channel.assertQueue(this.config.queues.analytics, { durable: true });

      // Bind queues to exchange
      await this.channel.bindQueue(
        this.config.queues.orderEvents,
        this.config.exchangeName,
        'order.*'
      );
      await this.channel.bindQueue(
        this.config.queues.notifications,
        this.config.exchangeName,
        'notification.*'
      );
      await this.channel.bindQueue(
        this.config.queues.analytics,
        this.config.exchangeName,
        'analytics.*'
      );

      this.connected = true;
      console.log('RabbitMQ connected and queues declared');
    } catch (error) {
      console.error('RabbitMQ connection failed:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    // A pending reconnect timer must never fire after shutdown — it would
    // reopen sockets during app.close() and pin the event loop open.
    if (this.destroyed) {
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      if (this.destroyed) {
        return;
      }
      console.log('Attempting to reconnect to RabbitMQ...');
      void this.connect();
    }, 5000);
  }

  publish(payload: MessagePayload): Promise<void> {
    // Graceful no-op when RabbitMQ is not provisioned (or the channel is down):
    // event-driven fan-out is an enhancement, never a hard dependency. Callers
    // (order events, notifications) must not crash on a missing broker.
    if (!this.config.url || !this.channel || !this.connected) {
      return Promise.resolve();
    }

    const routingKey = payload.type.replace(/\./g, '_');
    const message = Buffer.from(JSON.stringify(payload));

    const published = this.channel.publish(this.config.exchangeName, routingKey, message, {
      persistent: true,
      contentType: 'application/json',
      messageId: payload.idempotencyKey,
      timestamp: payload.timestamp,
    });

    if (!published) {
      return Promise.reject(new Error('Failed to publish message to RabbitMQ'));
    }
    return Promise.resolve();
  }

  async consume(
    queueName: string,
    onMessage: (payload: MessagePayload) => void | Promise<void>
  ): Promise<void> {
    // No broker → no consumer; callers already degrade gracefully.
    if (!this.config.url || !this.channel) {
      return;
    }

    // Idempotent re-declaration: guarantees the consumer's queue exists with
    // matching durability, so a name drift can never 404-close the channel
    // and take the process down at boot.
    await this.channel.assertQueue(queueName, { durable: true });

    await this.channel.consume(queueName, (msg) => {
      if (!msg) return;

      void (async () => {
        try {
          const payload = JSON.parse(msg.content.toString()) as MessagePayload;
          await onMessage(payload);
          this.channel!.ack(msg);
        } catch (error) {
          console.error('Error processing RabbitMQ message:', error);
          this.channel!.nack(msg, false, false);
        }
      })();
    });
  }

  async onModuleDestroy() {
    this.destroyed = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    try {
      if (this.connection) {
        await this.connection.close();
      }
    } catch (error) {
      // Closing an already-closed broker link is expected during shutdown
      // races; the socket teardown below still completes.
      console.error('Error closing RabbitMQ connection:', error);
    }
  }
}
