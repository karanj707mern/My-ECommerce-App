import { Module } from '@nestjs/common';
import { PinoLogger } from './pino.service';
import { PinoInterceptor } from './pino.interceptor';
import { RequestContextService } from '@/common/request-context/request-context.service';

@Module({
  providers: [PinoLogger, PinoInterceptor, RequestContextService],
  exports: [PinoLogger, PinoInterceptor, RequestContextService],
})
export class PinoModule {}
