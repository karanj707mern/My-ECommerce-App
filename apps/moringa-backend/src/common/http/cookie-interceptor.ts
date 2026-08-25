import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { CookieSerializeOptions } from '@fastify/cookie';
import { CookieState } from './cookie-state';
import './cookie-types';

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
    // Lazy-create: guarantees a queue exists regardless of middleware
    // ordering or request-object rewrapping by the platform adapter.
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    req.cookieState ??= new CookieState();
    const { cookieState } = req;

    return next.handle().pipe(
      tap(() => {
        const { toSet, toClear } = cookieState.consume();
        for (const { name, value, options } of toSet) {
          res.cookie(name, value, options);
        }
        for (const { name, options } of toClear) {
          res.clearCookie(name, options);
        }
      })
    );
  }
}
