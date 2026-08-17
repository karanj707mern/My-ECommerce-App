import { Injectable, LoggerService } from '@nestjs/common';
import pino from 'pino';

@Injectable()
export class PinoLogger implements LoggerService {
  private readonly logger: pino.Logger;

  constructor() {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const environment = process.env.NODE_ENV || 'development';

    this.logger = pino(
      {
        level: isDevelopment ? 'debug' : 'info',
        base: { env: environment },
      },
      isDevelopment
        ? pino.transport({
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
              messageFormat: '[{env}] {msg}',
            },
          })
        : undefined,
    );

    this.logger.info(
      { logger: 'PinoLogger', event: 'logger_initialized' },
      'Logger initialized',
    );
  }

  debug(message: string, context?: string, data?: unknown) {
    this.logWithContext('debug', message, context, data);
  }

  log(message: string, context?: string, data?: unknown) {
    this.logWithContext('info', message, context, data);
  }

  warn(message: string, context?: string, data?: unknown) {
    this.logWithContext('warn', message, context, data);
  }

  error(message: string, trace?: string, context?: string, data?: unknown) {
    const logData = data ? { ...data, trace } : { trace };
    this.logWithContext('error', message, context, logData);
  }

  verbose(message: string, context?: string, data?: unknown) {
    this.logWithContext('trace', message, context, data);
  }

  setContext(context: string) {
    // Nest calls this; we log context per message instead
    void context;
  }

  private logWithContext(
    level: 'debug' | 'info' | 'warn' | 'error' | 'trace',
    message: string,
    context?: string,
    data?: unknown,
  ) {
    const ctx = context || 'App';
    const payload = data ? { ctx, ...data } : { ctx };
    this.logger[level](payload, message);
  }
}
