import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { PinoLogger } from './pino.service';
import { RequestContextService } from '@/common/request-context/request-context.service';

interface AuthenticatedUser {
  id: number;
  email: string;
  role: string;
}

@Injectable()
export class PinoInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: PinoLogger,
    private readonly requestContextService: RequestContextService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = request;
    const startTime = Date.now();
    const requestId =
      this.requestContextService.getRequestId() ||
      `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const requestLog = {
      requestId,
      method,
      url,
      ip,
      userAgent: request.get('user-agent'),
      userId: (request.user as AuthenticatedUser | undefined)?.id,
      contentType: request.get('content-type'),
      contentLength: request.get('content-length'),
    };

    this.logger.log(`Incoming Request: ${method} ${url}`, 'HTTP', requestLog);

    const res = context.switchToHttp().getResponse<Response>();
    res.setHeader('x-request-id', requestId);

    return next.handle().pipe(
      tap({
        next: () => {
          const statusCode = res.statusCode;
          const duration = Date.now() - startTime;

          const responseLog = {
            requestId,
            method,
            url,
            statusCode,
            duration: `${duration}ms`,
            ip,
            userId: (request.user as AuthenticatedUser | undefined)?.id,
            responseSize: res.get('content-length'),
          };

          if (statusCode >= 500) {
            this.logger.error(
              `${method} ${url} - ${statusCode} (${duration}ms)`,
              undefined,
              'HTTP',
              responseLog,
            );
          } else if (statusCode >= 400) {
            this.logger.warn(
              `${method} ${url} - ${statusCode} (${duration}ms)`,
              'HTTP',
              responseLog,
            );
          } else {
            this.logger.log(
              `${method} ${url} - ${statusCode} (${duration}ms)`,
              'HTTP',
              responseLog,
            );
          }
        },
        error: (err) => {
          const duration = Date.now() - startTime;
          const typedError =
            err instanceof Error ? err : new Error(String(err));
          const errorLog = {
            requestId,
            method,
            url,
            error: typedError.message,
            stack: typedError.stack,
            duration: `${duration}ms`,
            ip,
            userId: (request.user as AuthenticatedUser | undefined)?.id,
          };

          this.logger.error(
            `Request failed: ${method} ${url} - ${typedError.message}`,
            typedError.stack,
            'HTTP',
            errorLog,
          );
        },
      }),
    );
  }
}
