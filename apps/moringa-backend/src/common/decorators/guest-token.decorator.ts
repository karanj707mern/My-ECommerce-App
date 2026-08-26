import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

export const GuestToken = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();
    const header = request.headers['x-guest-token'];
    const headerValue = Array.isArray(header) ? header[0] : header;
    return request.cookies?.guest_token ?? headerValue ?? undefined;
  }
);
