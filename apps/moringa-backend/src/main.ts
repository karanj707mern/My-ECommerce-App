import { ConfigService } from '@nestjs/config';
import { createApp } from './app.create';
import { PinoLogger } from './common/logger/pino.service';

/**
 * Production entrypoint. All assembly logic lives in `app.create.ts` so that
 * integration tests and this bootstrap share one code path — a test passing
 * here means the exact production pipeline passed.
 */
async function bootstrap(): Promise<void> {
  const { app } = await createApp();

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 5000);

  app.enableShutdownHooks();
  await app.listen(port, '0.0.0.0');

  const logger = app.get(PinoLogger);
  logger.log(
    `Application running on port ${port} (NODE_ENV=${process.env.NODE_ENV ?? 'development'})`,
    'Bootstrap'
  );
}

bootstrap().catch((error) => {
  console.error('Fatal bootstrap error:', error);
  process.exit(1);
});
