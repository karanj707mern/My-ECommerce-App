import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { tap } from 'rxjs/operators';
import { PinoLogger } from './pino.service';

/**
 * Structural HTTP access logging: one line per completed request with
 * method, URL and server-side duration. Pairs with the request-id
 * correlation emitted by RequestContextService.
 */
@Injectable()
export class PinoInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<{ method?: string; url?: string }>();
    const method = request.method ?? 'UNKNOWN';
    const url = request.url ?? '';
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(`${method} ${url} ${Date.now() - now}ms`, 'HTTP');
        },
        error: (error: unknown) => {
          this.logger.warn(
            `${method} ${url} ${Date.now() - now}ms failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
            'HTTP'
          );
        },
      })
    );
  }
}
