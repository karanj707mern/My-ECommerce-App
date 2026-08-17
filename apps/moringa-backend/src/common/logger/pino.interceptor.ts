import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { PinoLogger } from './pino.service';

@Injectable()
export class PinoInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const now = Date.now();

    return next.handle().pipe(
      // tap({
      //   next: (response) => {
      //     const responseTime = Date.now() - now;
      //     this.logger.log(
      //       `${method} ${url} ${responseTime}ms`,
      //       'HTTP',
      //     );
      //   },
      // }),
    );
  }
}
