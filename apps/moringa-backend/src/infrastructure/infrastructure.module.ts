import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import { BullMQService } from './bullmq.service';
import { RabbitMQService } from './rabbitmq.service';
import { PrismaService } from './prisma.service';
import { PinoModule } from '../common/logger/pino.module';

@Module({
  imports: [ConfigModule, PinoModule],
  providers: [
    {
      provide: 'REDIS_CONFIG',
      useFactory: (configService: ConfigService) => ({
        url: configService.get<string>('app.redisUrl', 'redis://localhost:6379'),
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        keepAlive: 30000,
        commandTimeout: 5000,
      }),
      inject: [ConfigService],
    },
    {
      provide: 'BULLMQ_CONFIG',
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('app.redisUrl', 'redis://localhost:6379'),
          // BullMQ uses blocking commands; this MUST be null per BullMQ requirements
          maxRetriesPerRequest: null,
        },
        defaultJobOptions: {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: { count: 100, age: 24 * 3600 },
          removeOnFail: { age: 7 * 24 * 3600 },
        },
      }),
      inject: [ConfigService],
    },
    {
      provide: 'RABBITMQ_CONFIG',
      useFactory: (configService: ConfigService) => ({
        url: configService.get<string>('app.rabbitmqUrl', 'amqp://localhost:5672'),
        exchangeName: 'moringa-events',
        queues: {
          orderEvents: 'order-events-queue',
          notifications: 'notification-events-queue',
          analytics: 'analytics-events-queue',
        },
      }),
      inject: [ConfigService],
    },
    RedisService,
    BullMQService,
    RabbitMQService,
    PrismaService,
  ],
  exports: [RedisService, BullMQService, RabbitMQService, PrismaService],
})
export class InfrastructureModule implements OnModuleInit {
  constructor(
    private readonly redisService: RedisService,
    private readonly bullMQService: BullMQService,
    private readonly rabbitMQService: RabbitMQService,
    private readonly prismaService: PrismaService,
  ) {}

  async onModuleInit() {
    const redisPing = await this.redisService.getClient().ping();
    console.log(`Redis health check: ${redisPing}`);

    const dbHealthy = await this.prismaService.healthCheck();
    console.log(`Database health check: ${dbHealthy}`);
  }
}
