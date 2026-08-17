import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { PinoLogger } from './common/logger/pino.service';
import { GlobalExceptionFilter } from './global-exception/global-exception.filter';
import { PrismaService } from './prisma/prisma.service';
import { RequestContextService } from './common/request-context/request-context.service';
import { RequestContextMiddleware } from './common/request-context/request-context.middleware';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ConfigService } from '@nestjs/config';

declare module 'express' {
  interface Request {
    requestId?: string;
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  const port = parseInt(
    process.env.PORT ?? String(configService.get<number>('app.port', 5000)),
    10,
  );

  const customLogger = app.get(PinoLogger);
  app.useLogger(customLogger);

  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new GlobalExceptionFilter());

  const requestContextService = app.get(RequestContextService);
  app.useGlobalInterceptors(
    new (require('./common/logger/pino.interceptor').PinoInterceptor)(customLogger, requestContextService),
  );

  app.use(compression());
  app.use(cookieParser());
  app.use(
    new RequestContextMiddleware().use.bind(new RequestContextMiddleware()),
  );

  app.useGlobalPipes(
    new (require('@nestjs/common').ValidationPipe)({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Serve local uploads directory as static assets
  const uploadsRoot = join(__dirname, '..', 'uploads');
  if (!existsSync(uploadsRoot)) {
    mkdirSync(uploadsRoot, { recursive: true });
  }
  app.useStaticAssets(uploadsRoot, {
    prefix: '/uploads/',
  });

  app.enableCors({
    origin: (origin, callback) => {
      callback(null, true);
    },
    credentials: true,
  });

  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    const { DocumentBuilder, SwaggerModule } = require('@nestjs/swagger');
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Moringa Backend API')
      .setDescription('API documentation for the Moringa e-commerce backend')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('accessToken')
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, swaggerDocument);
  }

  await app.listen(port, '0.0.0.0');
  customLogger.log(
    `Application running on port ${port} (NODE_ENV=${process.env.NODE_ENV ?? 'development'})`,
    'Bootstrap',
  );

  app.enableShutdownHooks();
}

void bootstrap();
