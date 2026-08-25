import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RabbitMqModule } from '../notification/rabbitmq/rabbitmq.module';

@Module({
  imports: [PrismaModule, RabbitMqModule],
  controllers: [HealthController],
})
export class HealthModule {}
