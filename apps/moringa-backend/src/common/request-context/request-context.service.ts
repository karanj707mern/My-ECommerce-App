import { Injectable } from '@nestjs/common';

@Injectable()
export class RequestContextService {
  getRequestId(): string | undefined {
    return undefined;
  }
}
