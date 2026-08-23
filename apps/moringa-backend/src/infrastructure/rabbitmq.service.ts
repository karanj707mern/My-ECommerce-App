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
  private channel: amqp.Channel | null = null;
  private readonly config: RabbitMQConfig;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(@Inject('RABBITMQ_CONFIG') config: RabbitMQConfig) {
    this.config = config;

    // Do not attempt connection when RabbitMQ is not provisioned (e.g. local
    // dev without the broker); publish/consume calls are guarded as well.
    if (!config.url) {
      return;
    }

    this.connect();
  }

  /** True when a broker URL was provided at construction time. */
  get isConfigured(): boolean {
    return Boolean(this.config.url);
  }

  private async connect() {
    if (!this.config.url) {
      return;
    }

    try {
      this.connection = await amqp.connect(this.config.url);
      this.channel = await this.connection.createChannel();

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
        'order.*',
      );
      await this.channel.bindQueue(
        this.config.queues.notifications,
        this.config.exchangeName,
        'notification.*',
      );
      await this.channel.bindQueue(
        this.config.queues.analytics,
        this.config.exchangeName,
        'analytics.*',
      );

      console.log('RabbitMQ connected and queues declared');
    } catch (error) {
      console.error('RabbitMQ connection failed:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      console.log('Attempting to reconnect to RabbitMQ...');
      this.connect();
    }, 5000);
  }

  async publish(payload: MessagePayload): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    const routingKey = payload.type.replace(/\./g, '_');
    const message = Buffer.from(JSON.stringify(payload));

    const published = this.channel.publish(
      this.config.exchangeName,
      routingKey,
      message,
      {
        persistent: true,
        contentType: 'application/json',
        messageId: payload.idempotencyKey,
        timestamp: payload.timestamp,
      },
    );

    if (!published) {
      throw new Error('Failed to publish message to RabbitMQ');
    }
  }

  async consume(
    queueName: string,
    onMessage: (payload: MessagePayload) => Promise<void>,
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    await this.channel.consume(queueName, async (msg) => {
      if (!msg) return;

      try {
        const payload: MessagePayload = JSON.parse(msg.content.toString());
        await onMessage(payload);
        this.channel!.ack(msg);
      } catch (error) {
        console.error('Error processing RabbitMQ message:', error);
        this.channel!.nack(msg, false, false);
      }
    });
  }

  async onModuleDestroy() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    try {
      if (this.connection) {
        await this.connection.close();
      }
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error);
    }
  }
}
