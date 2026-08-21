import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { PinoLogger } from '../common/logger/pino.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{
      status?: (code: number) => { json: (payload: unknown) => void };
    }>();
    const request = ctx.getRequest<{
      method?: string;
      url?: string;
    }>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorMessage =
      typeof message === 'string'
        ? message
        : (message as Record<string, unknown>)?.message || 'Internal server error';

    this.logger.error(
      `${request.method ?? ''} ${request.url ?? ''} - ${status} - ${String(errorMessage)}`,
      undefined,
      'GlobalExceptionFilter',
    );

    response.status?.(status).json?.({
      statusCode: status,
      message: errorMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
