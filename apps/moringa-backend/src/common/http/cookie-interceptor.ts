import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { CookieSetOptions } from 'fastify';
import { CookieState } from './cookie-state';

/**
 * Drains the request-scoped {@link CookieState} and applies every queued
 * set/clear operation to the real response.
 *
 * Runs after the controller handler has produced its typed return value but
 * before NestJS writes the response body, so cookies (Set-Cookie headers) are
 * attached without the controller ever touching the raw response object.
 */
@Injectable()
export class CookieInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const res = context.switchToHttp().getResponse<FastifyReply>();
    const cookieState = context
      .switchToHttp()
      .getRequest<{ cookieState?: CookieState }>().cookieState;

    return next.handle().pipe(
      tap(() => {
        if (!cookieState) {
          return;
        }
        const { toSet, toClear } = cookieState.consume();
        for (const { name, value, options } of toSet) {
          res.cookie(name, value, options as CookieSetOptions);
        }
        for (const { name, options } of toClear) {
          res.clearCookie(name, options as CookieSetOptions);
        }
      }),
    );
  }
}
