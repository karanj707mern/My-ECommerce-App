import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const r = req as { ip?: string; connection?: { remoteAddress?: string } };
    return Promise.resolve(`auth:${r.ip || r.connection?.remoteAddress || 'unknown'}`);
  }
}
