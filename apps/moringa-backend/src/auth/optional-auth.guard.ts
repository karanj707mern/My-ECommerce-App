import { Injectable, ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt.guard';

/**
 * Guard variant for endpoints usable both anonymously and authenticated
 * (e.g. guest carts): verification failures degrade to anonymous instead of
 * rejecting the request.
 */
@Injectable()
export class OptionalAuthGuard extends JwtAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return await super.canActivate(context);
    } catch {
      return true;
    }
  }
}
