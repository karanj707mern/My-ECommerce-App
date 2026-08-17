import { PinoLogger } from '@/common/logger/pino.service';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createConnection } from 'net';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMqService implements OnModuleInit, OnModuleDestroy {
  private readonly queueName = 'notifications';
  private readonly queueDlx = 'notifications.dlx';
  private readonly exchangeName = 'notifications.exchange';
  private readonly connectionUrl: string;
  private channelModel?: amqp.ChannelModel;
  private channel?: amqp.Channel;
  private consuming = false;
  private connected = false;
  private retryCount = 0;
  private readonly maxRetries = 10;
  private retryTimer?: NodeJS.Timeout;
  private healthCheckTimer?: NodeJS.Timeout;
  private readonly baseRetryDelayMs = 1000;
  private readonly maxRetryDelayMs = 30000;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.connectionUrl = this.buildConnectionUrl();
  }

  private buildConnectionUrl(): string {
    const explicitUrl = this.configService.get<string>('rabbitmq.url', '');

    if (explicitUrl.trim()) {
      return explicitUrl.trim();
    }

    const host = this.configService.get<string>('rabbitmq.host', '');
    const port = this.configService.get<number>('rabbitmq.port', 5672);
    const username = this.configService.get<string>('rabbitmq.user', 'guest');
    const password = this.configService.get<string>('rabbitmq.pass', 'guest');
    const vhost = this.configService.get<string>('rabbitmq.vhost', '/');

    const encodedVhost = vhost === '/' ? '' : `/${encodeURIComponent(vhost)}`;

    return `amqp://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}${encodedVhost}`;
  }

  get isConfigured(): boolean {
    const explicitUrl = this.configService
      .get<string>('rabbitmq.url', '')
      .trim();

    if (explicitUrl) {
      return true;
    }

    return Boolean(this.configService.get<string>('rabbitmq.host', ''));
  }

  get isConnected(): boolean {
    return this.connected;
  }

  get connectionStatus(): 'connected' | 'disconnected' | 'connecting' {
    if (this.connected) {
      return 'connected';
    }

    if (this.retryTimer) {
      return 'connecting';
    }

    return 'disconnected';
  }

  onModuleInit() {
    if (!this.isConfigured) {
      this.logger.warn(
        'RabbitMQ not configured. Notification delivery will use in-process queue.',
      );
      return;
    }

    setImmediate(() => {
      this.connectWithRetry().catch((error) => {
        this.logger.error(
          'RabbitMQ background connection failed',
          error instanceof Error ? error.stack : String(error),
        );
      });
    });
  }

  private async connectWithRetry(): Promise<void> {
    while (this.retryCount < this.maxRetries) {
      try {
        await this.waitForRabbitMQReady();
        await this.establishConnection();
        this.startHealthCheck();
        return;
      } catch (error) {
        this.retryCount += 1;
        this.connected = false;
        this.channel = undefined;
        this.channelModel = undefined;

        this.logger.error(
          `Failed to connect to RabbitMQ (attempt ${this.retryCount}/${this.maxRetries})`,
          error instanceof Error ? error.stack : String(error),
        );

        if (this.retryCount >= this.maxRetries) {
          this.logger.error(
            'RabbitMQ connection failed after maximum retries. Notification delivery will use in-process queue.',
          );
          return;
        }

        const delay = this.calculateBackoff(this.retryCount);

        this.logger.log(
          `Retrying RabbitMQ connection in ${delay}ms (attempt ${this.retryCount + 1}/${this.maxRetries})`,
        );

        await this.sleep(delay);
      }
    }
  }

  private calculateBackoff(retryCount: number): number {
    const exponentialDelay = this.baseRetryDelayMs * 2 ** retryCount;
    const jitter = Math.random() * 1000;

    return Math.min(exponentialDelay + jitter, this.maxRetryDelayMs);
  }

  private async establishConnection(): Promise<void> {
    this.channelModel = await amqp.connect(this.connectionUrl);
    this.channel = await this.channelModel.createChannel();

    await this.channel.assertExchange(this.exchangeName, 'fanout', {
      durable: true,
    });

    await this.channel.assertQueue(this.queueName, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': this.queueDlx,
        'x-dead-letter-routing-key': 'notifications.failed',
      },
    });

    await this.channel.assertExchange(this.queueDlx, 'fanout', {
      durable: true,
    });

    await this.channel.assertQueue(this.queueDlx, { durable: true });
    await this.channel.bindQueue(this.queueDlx, this.queueDlx, '');

    await this.channel.bindQueue(
      this.queueName,
      this.exchangeName,
      'notification',
    );

    this.channelModel?.on('error', (error: Error) => {
      this.logger.error(`RabbitMQ connection error: ${error.message}`);
      this.connected = false;
      this.scheduleReconnect();
    });

    this.channelModel?.on('close', () => {
      this.logger.warn('RabbitMQ connection closed');
      this.connected = false;
      this.scheduleReconnect();
    });

    this.channel?.on('error', (error: Error) => {
      this.logger.error(`RabbitMQ channel error: ${error.message}`);
    });

    this.channelModel?.on('blocked', (reason: string) => {
      this.logger.warn(`RabbitMQ connection blocked: ${reason}`);
    });

    this.channelModel?.on('unblocked', () => {
      this.logger.log('RabbitMQ connection unblocked');
    });

    this.connected = true;
    this.retryCount = 0;
    this.logger.log('RabbitMQ connected and queues declared');
  }

  private scheduleReconnect(): void {
    if (this.retryTimer) {
      return;
    }

    if (this.retryCount >= this.maxRetries) {
      this.logger.error('RabbitMQ reconnection failed after maximum retries');
      return;
    }

    this.retryCount += 1;
    const delay = this.calculateBackoff(this.retryCount);

    this.logger.log(`Scheduling RabbitMQ reconnection in ${delay}ms`);

    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined;

      if (this.connected) {
        return;
      }

      this.establishConnection()
        .then(() => this.startHealthCheck())
        .catch((error) => {
          this.logger.error(
            'RabbitMQ reconnection failed',
            error instanceof Error ? error.stack : String(error),
          );
        });
    }, delay);
  }

  private startHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(() => {
      if (!this.channel) {
        return;
      }

      this.channel
        .checkQueue(this.queueName)
        .then(() => {})
        .catch((error) => {
          this.logger.warn(
            'RabbitMQ health check failed',
            error instanceof Error ? error.message : String(error),
          );
          this.connected = false;
          this.scheduleReconnect();
        });
    }, 30000);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async waitForRabbitMQReady(): Promise<void> {
    const connectionUrl = new URL(this.connectionUrl);
    const host = connectionUrl.hostname;
    const port =
      Number(connectionUrl.port) ||
      (connectionUrl.protocol === 'amqps:' ? 5671 : 5672);

    this.logger.log(`Waiting for RabbitMQ at ${host}:${port} to be ready...`);

    const maxAttempts = 30;
    const attemptDelayMs = 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await new Promise<void>((resolve, reject) => {
          const socket = createConnection(port, host);

          socket.setTimeout(2000);

          socket.once('connect', () => {
            socket.destroy();
            resolve();
          });

          socket.once('error', (error: Error) => {
            reject(error);
          });

          socket.once('timeout', () => {
            socket.destroy();
            reject(new Error('Connection timeout'));
          });
        });

        this.logger.log(`RabbitMQ is ready (attempt ${attempt})`);
        return;
      } catch {
        if (attempt < maxAttempts) {
          await this.sleep(attemptDelayMs);
        }
      }
    }

    throw new Error(
      `RabbitMQ at ${host}:${port} did not become ready after ${maxAttempts} attempts`,
    );
  }

  async onModuleDestroy() {
    try {
      this.connected = false;
      this.consuming = false;

      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = undefined;
      }

      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer);
        this.healthCheckTimer = undefined;
      }

      if (this.channel) {
        try {
          await this.channel.cancel('notification-consumer');
        } catch {
          // Consumer may not exist
        }

        await this.channel.close();
      }

      await this.channelModel?.close();
      this.logger.log('RabbitMQ connection closed gracefully');
    } catch (error) {
      this.logger.error(
        'Error closing RabbitMQ connection',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async publish<T>(payload: T): Promise<void> {
    if (!this.channel || !this.connected) {
      return Promise.resolve();
    }

    const message = Buffer.from(JSON.stringify(payload));

    return new Promise((resolve) => {
      try {
        const sent = this.channel!.publish(
          this.exchangeName,
          'notification',
          message,
          {
            persistent: true,
            contentType: 'application/json',
            deliveryMode: 2,
          },
        );

        if (!sent) {
          this.channel!.once('drain', () => {
            resolve();
          });
        } else {
          resolve();
        }
      } catch (error) {
        this.logger.error(
          'Failed to publish to RabbitMQ',
          error instanceof Error ? error.stack : String(error),
        );
        resolve();
      }
    });
  }

  async registerConsumer(
    handler: (message: amqp.ConsumeMessage) => Promise<void>,
  ): Promise<void> {
    if (!this.channel) {
      this.logger.warn('Skipping RabbitMQ consumer: channel not available');
      return;
    }

    this.consuming = true;

    await this.channel.consume(
      this.queueName,
      (msg) => {
        if (!msg) {
          return;
        }

        handler(msg)
          .then(() => {
            if (this.channel) {
              this.channel!.ack(msg); // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion
            }
          })
          .catch((error) => {
            this.logger.error(
              'RabbitMQ consumer handler error',
              error instanceof Error ? error.stack : String(error),
            );

            if (!this.consuming) {
              if (this.channel) {
                this.channel!.nack(msg, false, true); // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion
              }
            } else {
              if (this.channel) {
                this.channel!.nack(msg, false, false); // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion
              }
            }
          });
      },
      { noAck: false },
    );

    this.logger.log('RabbitMQ consumer registered');
  }
}
