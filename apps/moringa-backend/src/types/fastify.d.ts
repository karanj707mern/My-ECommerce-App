import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    /**
     * Verified credential payload attached by JwtAuthGuard (and
     * OptionalAuthGuard when a valid token is present). Absent for
     * anonymous requests and @Public() routes.
     */
    user?: {
      id: number;
      email: string;
      role: string;
    };
  }
}
