import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { PinoLogger } from '../common/logger/pino.service';

interface ErrorPayload {
  statusCode: number;
  message: unknown;
  error?: string;
  timestamp: string;
  path?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    let message: unknown = rawResponse;
    let errorName: string | undefined;

    if (typeof rawResponse === 'string') {
      message = rawResponse;
    } else {
      const structured = rawResponse as Record<string, unknown>;
      message = structured.message ?? rawResponse;
      errorName =
        typeof structured.error === 'string' ? structured.error : undefined;
    }

    const logMessage =
      typeof message === 'string' ? message : JSON.stringify(message);

    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${logMessage}`,
      exception instanceof Error ? exception.stack : undefined,
      'GlobalExceptionFilter',
    );

    // Errors raised after the reply has been handed to Fastify (e.g. inside a
    // stream) cannot be re-sent; log only and return to avoid double-reply.
    if (response.sent) {
      return;
    }

    const payload: ErrorPayload = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };
    if (errorName) {
      payload.error = errorName;
    }

    void response.status(status).send(payload);
  }
}
