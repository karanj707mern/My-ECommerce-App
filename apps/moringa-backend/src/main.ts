import { NestFactory } from '@nestjs/core';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { PinoLogger } from './common/logger/pino.service';
import { GlobalExceptionFilter } from './global-exception/global-exception.filter';
import { RequestContextService } from './common/request-context/request-context.service';
import { RequestContextMiddleware } from './common/request-context/request-context.middleware';
import { ConfigService } from '@nestjs/config';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import compress from '@fastify/compress';
import bodyLimit from '@fastify/body-limit';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { XssSanitizationPipe } from './common/pipes/xss-sanitization.pipe';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, {
    logger: false,
  });

  const configService = app.get(ConfigService);
  const port = parseInt(
    process.env.PORT ?? String(configService.get<number>('app.port', 5000)),
    10,
  );

  // Security headers via Helmet
  await app.register(helmet, {
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

  // Compression middleware
  await app.register(compress, {
    threshold: 1024,
    encodings: ['gzip', 'deflate'],
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: configService.get<number>('app.rateLimitMax', 100),
    timeWindow: configService.get<string>('app.rateLimitWindow', '1 minute'),
    keyGenerator: (request) => request.ip,
    allowList: ['127.0.0.1', '::1'],
    skipOnError: true,
  });

  // Body size limit to prevent DoS attacks
  await app.register(bodyLimit, {
    maxSize: parseInt(process.env.MAX_BODY_SIZE ?? '1048576', 10),
  });

  const customLogger = app.get(PinoLogger);
  app.useLogger(customLogger);

  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new GlobalExceptionFilter());

  const requestContextService = app.get(RequestContextService);
  app.useGlobalInterceptors(
    new (require('./common/logger/pino.interceptor').PinoInterceptor)(
      customLogger,
      requestContextService,
    ),
  );

  app.useGlobalPipes(
    new (require('@nestjs/common').ValidationPipe)({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
    new XssSanitizationPipe(),
  );

  app.use(new RequestContextMiddleware().use.bind(new RequestContextMiddleware()));

  // Secure CORS - only allow configured origins
  const corsOrigins = configService.get<string[]>('app.corsOrigins', []);
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed by CORS policy') as never);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
    exposedHeaders: ['X-Request-Id', 'X-RateLimit-Remaining'],
  });

  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    const { DocumentBuilder, SwaggerModule } = require('@nestjs/swagger');
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

  // Ensure upload directory exists
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }

  await app.listen(port, '0.0.0.0');
  customLogger.log(
    `Application running on port ${port} (NODE_ENV=${process.env.NODE_ENV ?? 'development'})`,
    'Bootstrap',
  );

  app.enableShutdownHooks();
}

void bootstrap();
