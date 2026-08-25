import { NestFactory } from '@nestjs/core';
import { NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify';
import fastify from 'fastify';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { PinoLogger } from './common/logger/pino.service';
import { GlobalExceptionFilter } from './global-exception/global-exception.filter';
import { PinoInterceptor } from './common/logger/pino.interceptor';
import { CookieInterceptor } from './common/http/cookie-interceptor';
import { RequestContextService } from './common/request-context/request-context.service';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { XssSanitizationPipe } from './common/pipes/xss-sanitization.pipe';
import { RedisIoAdapter } from './order/redis.adapter';
import helmet = require('@fastify/helmet');
import rateLimit = require('@fastify/rate-limit');
import compress = require('@fastify/compress');
import cookie = require('@fastify/cookie');
import multipart = require('@fastify/multipart');

async function bootstrap(): Promise<void> {
  const maxBodySize = parseInt(process.env.MAX_BODY_SIZE ?? '1048576', 10);

  /**
   * Bring-your-own Fastify instance: all @fastify/* plugins are registered
   * BEFORE Nest touches the server, so avvio boots them in order prior to
   * route registration. This avoids post-boot plugin registration issues and
   * the FastifyTypeProvider generic mismatches between plugin typings and the
   * adapter's vendored fastify copy.
   */
  const server = fastify({
    bodyLimit: maxBodySize,
    logger: false,
  });

  server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'wss:', 'ws:'],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'none'"],
        frameSrc: ["'none'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: 'same-origin' },
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
    permittedCrossDomainPolicies: false,
    ieNoOpen: true,
    noSniff: true,
    xssFilter: true,
    hidePoweredBy: true,
  });

  server.register(compress, {
    threshold: 1024,
    encodings: ['gzip', 'deflate'],
  });

  server.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
    timeWindow: process.env.RATE_LIMIT_WINDOW ?? '1 minute',
    keyGenerator: (request) => request.ip,
    allowList: ['127.0.0.1', '::1'],
    skipOnError: true,
  });

  server.register(cookie, {
    secret: process.env.ENCRYPTION_KEY || undefined,
    hook: 'onRequest',
  });

  server.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 1,
    },
    attachFieldsToBody: false,
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    // Root fastify v5 vs adapter's vendored copy differ nominally only in types.
    new FastifyAdapter(server as never),
    {
      logger: ['error', 'warn', 'log'],
      // Adapter registers its own JSON parser capturing untouched payload
      // bytes at req.rawBody — required for Razorpay webhook HMAC checks.
      rawBody: true,
    }
  );

  const configService = app.get(ConfigService);
  const customLogger = app.get(PinoLogger);
  app.useLogger(customLogger);

  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new GlobalExceptionFilter(customLogger));

  const requestContextService = app.get(RequestContextService);
  app.useGlobalInterceptors(new PinoInterceptor(customLogger));
  app.useGlobalInterceptors(new CookieInterceptor());

  void requestContextService;

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
    new XssSanitizationPipe()
  );

  // Secure CORS - only allow configured origins
  const corsOrigins = configService.get<string[]>('app.corsOrigins', []);
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed by CORS policy'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
    exposedHeaders: ['X-Request-Id', 'X-RateLimit-Remaining'],
  });

  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    // Race the module load: a wedged optional dependency must never block
    // server listen. Timeout degrades to API-without-UI, logged loudly.
    const swaggerModule = await Promise.race([
      import('@nestjs/swagger'),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 15000)),
    ]);

    if (!swaggerModule) {
      customLogger.warn('Swagger UI skipped: @nestjs/swagger did not load within 15s', 'Bootstrap');
    } else {
      const { DocumentBuilder, SwaggerModule } = swaggerModule;
      const swaggerConfig = new DocumentBuilder()
        .setTitle('Moringa Backend API')
        .setDescription('Production-grade e-commerce backend API')
        .setVersion('1.0')
        .addBearerAuth()
        .addCookieAuth('accessToken')
        .addSecurityRequirements('Bearer', [])
        .build();

      const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
      SwaggerModule.setup('api/docs', app, swaggerDocument, {
        customSiteTitle: 'Moringa API Docs',
        customCss: '.swagger-ui .topbar { display: none }',
      });
    }
  }

  // Ensure upload directory exists
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }

  const port = configService.get<number>('app.port', 5000);

  // Socket.IO with optional Redis adapter for multi-instance fan-out
  const wsAdapter = new RedisIoAdapter(
    app,
    process.env.REDIS_URL ?? '',
    configService.get<string[]>('app.corsOrigins', [])
  );
  await wsAdapter.connectToRedis().catch((error) => {
    customLogger.warn(
      `WebSocket Redis adapter unavailable, continuing single-node: ${
        error instanceof Error ? error.message : String(error)
      }`,
      'Bootstrap'
    );
  });
  app.useWebSocketAdapter(wsAdapter);

  app.enableShutdownHooks();
  await app.listen(port, '0.0.0.0');

  customLogger.log(
    `Application running on port ${port} (NODE_ENV=${process.env.NODE_ENV ?? 'development'})`,
    'Bootstrap'
  );
}

bootstrap().catch((error) => {
  console.error('Fatal bootstrap error:', error);
  process.exit(1);
});
