import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GuestToken = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.cookies?.['guest_token'] || request.headers?.['x-guest-token'];
  },
);
