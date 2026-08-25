import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const ip =
      (req as { ip?: string; connection?: { remoteAddress?: string } }).ip ||
      (req as { connection?: { remoteAddress?: string } }).connection?.remoteAddress ||
      'unknown';
    return `auth:${ip}`;
  }
}
