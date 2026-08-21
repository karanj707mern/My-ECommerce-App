import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { PinoLogger } from '@/common/logger/pino.service';

export interface QueryLog {
  query: string;
  duration: number;
  params?: unknown;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly queryLogger: PinoLogger;

  constructor(logger: PinoLogger) {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    });

    this.queryLogger = logger;

    this.$on('query', (e: QueryLog) => {
      this.queryLogger.debug(
        `Query: ${e.query} | Duration: ${e.duration}ms`,
        'Prisma',
      );
    });

    this.$on('info', (e: { message: string }) => {
      this.queryLogger.log(e.message, 'Prisma');
    });

    this.$on('warn', (e: { message: string }) => {
      this.queryLogger.warn(e.message, 'Prisma');
    });

    this.$on('error', (e: { message: string }) => {
      this.queryLogger.error(e.message, undefined, 'Prisma');
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.enableSoftDeleteMiddleware();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  enableSoftDeleteMiddleware() {
    this.$use(async (params: Prisma.MiddlewareParams, next: Prisma.MiddlewareNext) => {
      const { action, args } = params;

      if (
        action === 'findMany' ||
        action === 'findFirst' ||
        action === 'findUnique'
      ) {
        const where =
          (args?.where as Record<string, unknown> | undefined) ?? {};

        if (Object.keys(where).length === 0) {
          params.args = {
            ...args,
            where: { ...where, deletedAt: null },
          };
        } else {
          params.args = {
            ...args,
            where: { ...where, deletedAt: null },
          };
        }
      }

      return next(params);
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  async transactionWithRetry<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    maxRetries = 3,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.$transaction(fn);
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries - 1) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 100 * Math.pow(2, attempt)));
      }
    }

    throw lastError;
  }
}
