import { Module } from '@nestjs/common';
import { BullMqService } from './bullmq.service';
import { PinoModule } from '@/common/logger/pino.module';

@Module({
  imports: [PinoModule],
  providers: [BullMqService],
  exports: [BullMqService],
})
export class BullMqModule {}
