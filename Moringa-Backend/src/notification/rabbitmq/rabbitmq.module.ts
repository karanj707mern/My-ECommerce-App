import { Module } from '@nestjs/common';
import { RabbitMqService } from './rabbitmq.service';
import { PinoModule } from '@/common/logger/pino.module';

@Module({
  imports: [PinoModule],
  providers: [RabbitMqService],
  exports: [RabbitMqService],
})
export class RabbitMqModule {}
