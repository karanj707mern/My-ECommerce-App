import { RabbitMqModule } from '@/notification/rabbitmq/rabbitmq.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({
  imports: [PrismaModule, RabbitMqModule],
  controllers: [HealthController],
})
export class HealthModule {}
