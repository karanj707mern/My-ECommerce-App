import { Injectable, NestMiddleware } from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { CookieState } from './cookie-state';

// Augment FastifyRequest so downstream code sees cookieState as a known field.
declare module 'fastify' {
  interface FastifyRequest {
    cookieState?: CookieState;
  }
}

/**
 * Attaches a request-scoped {@link CookieState} to every incoming request.
 *
 * Controllers queue cookie operations onto `req.cookieState`; the global
 * {@link CookieInterceptor} drains that queue after the handler returns.
 * Keeping this in middleware (rather than per-controller decorator) means no
 * controller ever needs `@Res()` just to set a cookie.
 */
@Injectable()
export class CookieStateMiddleware implements NestMiddleware {
  use(req: FastifyRequest, _res: FastifyReply, next: () => void): void {
    req.cookieState = new CookieState();
    next();
  }
}
