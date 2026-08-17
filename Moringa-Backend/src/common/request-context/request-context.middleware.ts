import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import {
  RequestContext,
  requestContextStore,
} from '@/common/request-context/request-context.service';

interface AuthenticatedUser {
  id: number;
  email: string;
  role: string;
}

export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const user = req.user as AuthenticatedUser | undefined;
    const context: RequestContext = {
      requestId:
        (req.headers['x-request-id'] as string) ||
        `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      userId: user?.id,
      ip: req.ip,
      userAgent: req.get('user-agent') ?? undefined,
    };

    requestContextStore.run(context, () => {
      next();
    });
  }
}
