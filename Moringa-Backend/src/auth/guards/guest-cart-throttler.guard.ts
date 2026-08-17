import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class GuestCartThrottlerGuard extends ThrottlerGuard {
  getRequestResponse(context: ExecutionContext) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const request = context.switchToHttp().getRequest() as {
      ip?: string;
      ips?: string[];
      cookies?: { guestCartToken?: string };
      throttler?: { key?: string };
    };
    const key = request.ip || request.ips?.[0] || 'unknown';

    return {
      req: {
        ...request,
        throttler: {
          ...(request.throttler ?? {}),
          key,
        },
      } as never,
      res: context.switchToHttp().getResponse(), // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    };
  }
}
