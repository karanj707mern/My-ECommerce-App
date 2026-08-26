import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PinoLogger } from '../common/logger/pino.service';

export interface QueryLog {
  query: string;
  duration: number;
  params?: unknown;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly queryLogger: PinoLogger;

  constructor(logger: PinoLogger) {
    const connectionString =
      process.env.DATABASE_URL ?? 'postgresql://moringa:moringa@localhost:5432/moringa';

    // Prisma 7 requires a driver adapter (the Rust query engine was removed).
    super({
      adapter: new PrismaPg({ connectionString }),
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    });

    this.queryLogger = logger;

    type QueryEventHandler = (event: Prisma.QueryEvent) => void;
    type LogEventHandler = (event: Prisma.LogEvent) => void;

    (this.$on as unknown as (e: 'query', cb: QueryEventHandler) => void)('query', (e) => {
      this.queryLogger.debug(`Query: ${e.query} | Duration: ${e.duration}ms`, 'Prisma');
    });

    (this.$on as unknown as (e: 'info', cb: LogEventHandler) => void)('info', (e) => {
      this.queryLogger.log(e.message, 'Prisma');
    });

    (this.$on as unknown as (e: 'warn', cb: LogEventHandler) => void)('warn', (e) => {
      this.queryLogger.warn(e.message, 'Prisma');
    });

    (this.$on as unknown as (e: 'error', cb: LogEventHandler) => void)('error', (e) => {
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

  /**
   * Automatic soft-delete filtering via the Prisma Client Extensions API.
   * ($use middleware was removed in Prisma 6; $extends.query is the replacement.)
   * The extended model delegates are copied onto this instance so every
   * consumer of PrismaService transparently reads non-deleted rows only.
   * The filter is applied ONLY to models whose schema declares `deletedAt`.
   */
  enableSoftDeleteMiddleware(): void {
    const softDeleteModels = this.resolveSoftDeleteModels();

    const xprisma = this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const softDeleteReadOps = ['findMany', 'findFirst', 'count', 'aggregate', 'groupBy'];

            if (model && softDeleteModels.has(model) && softDeleteReadOps.includes(operation)) {
              const currentArgs = (args ?? {}) as Record<string, unknown>;
              const where = (currentArgs.where ?? {}) as Record<string, unknown>;

              if (where.deletedAt === undefined) {
                currentArgs.where = { ...where, deletedAt: null };
                args = currentArgs;
              }
            }

            return query(args);
          },
        },
      },
    });

    Object.assign(this, xprisma);
  }

  /**
   * Scan prisma/schema.prisma once and collect model names that declare a
   * `deletedAt` column, so soft-delete filtering never touches models without
   * the field (e.g. Session).
   */
  private resolveSoftDeleteModels(): Set<string> {
    const models = new Set<string>();

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs') as { readFileSync: (p: string, e: string) => string };
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path') as { join: (...p: string[]) => string };

      const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      const modelBlocks = schema.split(/(?=^model\s)/m);

      for (const block of modelBlocks) {
        const nameMatch = block.match(/^model\s+(\w+)/m);
        if (nameMatch && /deletedAt/i.test(block)) {
          models.add(nameMatch[1]);
        }
      }
    } catch {
      // If the schema cannot be read, disable filtering rather than breaking queries.
    }

    return models;
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
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.$transaction(fn);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxRetries - 1) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 100 * Math.pow(2, attempt)));
      }
    }

    throw lastError ?? new Error('Transaction failed after retries');
  }
}
