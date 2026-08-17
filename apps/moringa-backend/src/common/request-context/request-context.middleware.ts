import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { PinoLogger } from '../logger/pino.service';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly logger: PinoLogger) {}

  use(req: Request, res: Response, next: NextFunction) {
    const requestId = uuidv4();
    (req as unknown as { requestId?: string }).requestId = requestId;
    res.set('x-request-id', requestId);
    next();
  }
}
