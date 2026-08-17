import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  getRequestResponse(context: ExecutionContext) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const request = context.switchToHttp().getRequest() as {
      ip?: string;
      ips?: string[];
      user?: { id: number };
      throttler?: { key?: string };
    };

    const key =
      request.user?.id !== undefined
        ? `user:${request.user.id}`
        : request.ip || request.ips?.[0] || 'unknown';

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
