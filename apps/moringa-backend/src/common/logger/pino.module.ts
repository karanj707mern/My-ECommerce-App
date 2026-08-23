import { Global, Module } from '@nestjs/common';
import { PinoLogger } from './pino.service';
import { PinoInterceptor } from './pino.interceptor';

@Global()
@Module({
  providers: [PinoLogger, PinoInterceptor],
  exports: [PinoLogger, PinoInterceptor],
})
export class PinoModule {}
