import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { GuestTokenRequest } from '../interfaces/request.interface';

export const GuestToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<GuestTokenRequest>();

    return request.guestToken;
  },
);
