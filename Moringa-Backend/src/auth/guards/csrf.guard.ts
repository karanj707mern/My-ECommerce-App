import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { cookies?: Record<string, string> }>();
    const csrfHeader = request.headers['x-csrf-token'];
    const csrfCookie = request.cookies?.['csrf-token'];

    if (!csrfCookie) {
      return true;
    }

    if (!csrfHeader || csrfHeader !== csrfCookie) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    return true;
  }
}
