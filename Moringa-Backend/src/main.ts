import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { existsSync, mkdirSync } from 'fs';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { PinoInterceptor } from './common/logger/pino.interceptor';
import { PinoLogger } from './common/logger/pino.service';
import { GlobalExceptionFilter } from './global-exception/global-exception.filter';
import { RedisIoAdapter } from './order/redis.adapter';
import { PrismaService } from './prisma/prisma.service';
import { GuestTokenMiddleware } from './common/middleware/guest-token.middleware';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';
import { RequestContextService } from '@/common/request-context/request-context.service';
import { RequestContextMiddleware } from '@/common/request-context/request-context.middleware';

declare module 'express' {
  interface Request {
    requestId?: string;
  }
}

async function bootstrap() {
  const startTime = Date.now();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  const customLogger = app.get(PinoLogger);
  app.useLogger(customLogger);

  const configService = app.get(ConfigService);

  const port = parseInt(
    process.env.PORT ?? String(configService.get<number>('app.port', 5000)),
    10,
  );
  const corsOrigins: string[] =
    configService.get<string[]>('app.corsOrigins') ?? [];
  const isProduction = configService.get<boolean>('app.isProduction', false);

  const matchesOrigin = (origin: string | undefined, allowedOrigins: string[]) => {
    if (!origin) {
      return true;
    }

    const normalizedOrigin = origin.replace(/\/$/, '');

    return allowedOrigins.some((allowed) => {
      const normalizedAllowed = allowed.replace(/\/$/, '');

      if (normalizedAllowed === normalizedOrigin) {
        return true;
      }

      if (!normalizedAllowed.includes('*')) {
        return false;
      }

      const pattern = normalizedAllowed.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*');
      return new RegExp(`^${pattern}$`).test(normalizedOrigin);
    });
  };

  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new GlobalExceptionFilter());
  const requestContextService = app.get(RequestContextService);
  app.useGlobalInterceptors(
    new PinoInterceptor(customLogger, requestContextService),
  );

  customLogger.log('Bootstrapping NestJS application', 'Bootstrap');

  const redisUrl = configService.get<string>('redis.url', '');

  const wsAdapter = new RedisIoAdapter(app, redisUrl, corsOrigins);

  app.useWebSocketAdapter(wsAdapter);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            'https://checkout.razorpay.com',
            'https://accounts.google.com',
            'https://apis.google.com',
          ],
          imgSrc: [
            "'self'",
            'data:',
            'https://*.razorpay.com',
            'https://checkout.razorpay.com',
          ],
          connectSrc: isProduction
            ? [
                "'self'",
                'https://api.razorpay.com',
                'https://checkout.razorpay.com',
                'https://accounts.google.com',
                'https://oauth2.googleapis.com',
              ]
            : [
                "'self'",
                'https://api.razorpay.com',
                'https://checkout.razorpay.com',
                'https://accounts.google.com',
                'https://oauth2.googleapis.com',
              ],
          frameSrc: [
            "'self'",
            'https://api.razorpay.com',
            'https://checkout.razorpay.com',
          ],
        },
      },
      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },
      crossOriginOpenerPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  app.use(compression());

  app.use((req: Request, res: Response, next: NextFunction) => {
    const isGet = req.method === 'GET';
    const path = req.path || '';
    const publicPattern =
      /^\/api\/v1\/(product(\/[\d]+)?$|blog(\/[^/]+)?$|review\/featured$)/;
    const isPublicRead =
      isGet &&
      publicPattern.test(path) &&
      !path.includes('/admin/') &&
      !path.includes('/eligibility');

    if (isPublicRead) {
      res.set(
        'Cache-Control',
        'public, max-age=300, stale-while-revalidate=600',
      );
    }

    next();
  });

  const storageProvider = configService.get<string>(
    'STORAGE_PROVIDER',
    'local',
  );

  // Serve local uploads directory as static assets only when using local storage.
  // For cloudinary/r2, uploads go to the cloud provider and don't need local static serving.
  if (storageProvider === 'local') {
    const uploadsRoot = join(__dirname, '..', 'uploads');

    if (!existsSync(uploadsRoot)) {
      mkdirSync(uploadsRoot, { recursive: true });
    }

    app.useStaticAssets(uploadsRoot, {
      prefix: '/uploads/',
    });
  }

  if (isProduction) {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  const expressApp = app.getHttpAdapter().getInstance();

  expressApp.get('/sitemap.xml', async (_req, res) => {
    try {
      const prisma = app.get(PrismaService);
      const siteUrl = configService.get<string>('app.siteUrl', '');

      if (!siteUrl) {
        return res
          .status(500)
          .send(
            '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
          );
      }

      const [products, posts] = await Promise.all([
        prisma.product.findMany({
          where: { isActive: true },
          select: { id: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
        }),
        prisma.blogPost.findMany({
          where: { published: true },
          select: { slug: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
        }),
      ]);

      const staticUrls = [
        { loc: '/', changefreq: 'daily', priority: '1.0' },
        { loc: '/shop', changefreq: 'daily', priority: '0.9' },
        { loc: '/about-us', changefreq: 'monthly', priority: '0.6' },
        { loc: '/wellness-journal', changefreq: 'weekly', priority: '0.6' },
        { loc: '/blog', changefreq: 'daily', priority: '0.8' },
        { loc: '/shipping', changefreq: 'monthly', priority: '0.5' },
        { loc: '/returns', changefreq: 'monthly', priority: '0.5' },
        { loc: '/privacy-policy', changefreq: 'monthly', priority: '0.5' },
        { loc: '/terms', changefreq: 'monthly', priority: '0.5' },
        { loc: '/contact', changefreq: 'monthly', priority: '0.5' },
      ];

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

      for (const url of staticUrls) {
        xml += '  <url>\n';
        xml += `    <loc>${siteUrl}${url.loc}</loc>\n`;
        xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
        xml += `    <priority>${url.priority}</priority>\n`;
        xml += '  </url>\n';
      }

      for (const product of products) {
        xml += '  <url>\n';
        xml += `    <loc>${siteUrl}/product/${product.id}</loc>\n`;
        xml += `    <lastmod>${product.updatedAt.toISOString().split('T')[0]}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.8</priority>\n';
        xml += '  </url>\n';
      }

      for (const post of posts) {
        xml += '  <url>\n';
        xml += `    <loc>${siteUrl}/blog/${post.slug}</loc>\n`;
        xml += `    <lastmod>${post.updatedAt.toISOString().split('T')[0]}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.7</priority>\n';
        xml += '  </url>\n';
      }

      xml += '</urlset>';

      res.set('Content-Type', 'application/xml');
      res.set('Cache-Control', 'public, max-age=3600');
      res.send(xml);
    } catch (error) {
      customLogger.error(
        'Sitemap generation error',
        error instanceof Error ? error.message : String(error),
        'Bootstrap',
      );
      res
        .status(500)
        .send(
          '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
        );
    }
  });

  expressApp.get('/robots.txt', (_req, res) => {
    const siteUrl = configService.get<string>('app.siteUrl', '');
    const sitemapUrl = siteUrl ? `${siteUrl}/sitemap.xml` : '';

    let robots = 'User-agent: *\n';
    robots += 'Allow: /\n';
    robots += 'Disallow: /api/\n';
    robots += 'Disallow: /admin\n';
    robots += 'Disallow: /profile\n';
    robots += 'Disallow: /orders\n';
    robots += 'Disallow: /cart\n';
    robots += 'Disallow: /auth\n';
    robots += 'Disallow: /admin-login\n';

    if (sitemapUrl) {
      robots += `\nSitemap: ${sitemapUrl}\n`;
    }

    res.set('Content-Type', 'text/plain');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(robots);
  });

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || matchesOrigin(origin, corsOrigins)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS'), false);
    },
    credentials: true,
  });

  app.use(cookieParser());
  app.use(new GuestTokenMiddleware().use.bind(new GuestTokenMiddleware()));
  app.use(new CsrfMiddleware().use.bind(new CsrfMiddleware()));

  app.use(
    new RequestContextMiddleware().use.bind(new RequestContextMiddleware()),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  expressApp.use(json({ limit: '10mb' }));
  expressApp.use(urlencoded({ limit: '10mb', extended: true }));

  if (!isProduction) {
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

  try {
    await wsAdapter.connectToRedis();
  } catch (error) {
    customLogger.warn(
      `Socket.IO will run without the Redis adapter: ${
        error instanceof Error ? error.message : String(error)
      }`,
      'Bootstrap',
    );
  }

  await app.listen(port, '0.0.0.0');

  const bootstrapTime = Date.now() - startTime;

  customLogger.log(
    `Application running on port ${port} (NODE_ENV=${process.env.NODE_ENV ?? 'development'}, bootstrap=${bootstrapTime}ms)`,
    'Bootstrap',
  );

  app.enableShutdownHooks();

  const shutdown = async (signal: string) => {
    customLogger.log(
      `Received ${signal}. Starting graceful shutdown...`,
      'Shutdown',
    );

    try {
      await wsAdapter.close();
      customLogger.log('Redis WebSocket adapter closed', 'Shutdown');
    } catch (error) {
      customLogger.error(
        'Error closing Redis WebSocket adapter',
        error instanceof Error ? error.message : String(error),
        'Shutdown',
      );
    }

    try {
      await app.close();
      customLogger.log('NestJS application closed', 'Shutdown');
    } catch (error) {
      customLogger.error(
        'Error closing NestJS application',
        error instanceof Error ? error.message : String(error),
        'Shutdown',
      );
    }

    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void bootstrap();
