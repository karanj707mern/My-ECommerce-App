import { Module } from '@nestjs/common';
import { PinoLogger } from './pino.service';
import { PinoInterceptor } from './pino.interceptor';

@Module({
  providers: [PinoLogger, PinoInterceptor],
  exports: [PinoLogger, PinoInterceptor],
})
export class PinoModule {}
