import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    /** Populated by CookieStateMiddleware; drained by CookieInterceptor. */
    cookieState?: import('./cookie-state').CookieState;
  }
}
