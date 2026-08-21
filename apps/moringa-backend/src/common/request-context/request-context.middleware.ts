import { Injectable, NestMiddleware } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PinoLogger } from '../logger/pino.service';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly logger: PinoLogger) {}

  use(req: Record<string, unknown>, _res: unknown, next: () => void) {
    const requestId = uuidv4();
    (req as unknown as { requestId?: string }).requestId = requestId;
    next();
  }
}
