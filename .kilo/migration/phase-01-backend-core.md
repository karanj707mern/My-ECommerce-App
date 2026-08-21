# Phase 1: Backend Core — Fastify Fix, Dependencies, Config

**Objective**: Make `apps/moringa-backend` run on Fastify with all required dependencies and correct configuration. Fix all Express leaks. This is the foundation for every other backend phase.

**Legacy Source**: `Moringa-Backend/`  
**Migrated Target**: `apps/moringa-backend/`  
**Estimated Effort**: 4–6 hours

---

## Tasks

### 1.1 Fix Dependencies

**File**: `apps/moringa-backend/package.json`

Add the following dependencies that are missing but required for feature parity:

```json
{
  "dependencies": {
    "@nestjs/platform-socket.io": "^11.1.19",
    "@prisma/adapter-pg": "6.19.3",
    "cloudinary": "^2.10.0",
    "multer": "^2.1.1",
    "pg": "^8.11.5",
    "razorpay": "^2.9.6",
    "sharp": "^0.33.5",
    "socket.io": "^4.8.3"
  },
  "devDependencies": {
    "@types/multer": "^1.4.12",
    "@types/pg": "^8.11.5"
  }
}
```

Also add Fastify multipart plugin:
```json
{
  "dependencies": {
    "@fastify/multipart": "^9.0.0"
  }
}
```

**Validation**: Run `npm install` and verify no peer conflicts.

---

### 1.2 Fix Dockerfile Indentation

**File**: `apps/moringa-backend/Dockerfile`

Lines 21–24 have 4-space indentation. Fix:

```dockerfile
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/uploads ./uploads
```

**Validation**: `docker build .` succeeds.

---

### 1.3 Replace Express with Fastify in main.ts

**File**: `apps/moringa-backend/src/main.ts`

Current state: declares `NestFastifyApplication` but uses Express patterns.

Changes required:
- Remove `import type { Request, Response, NextFunction } from 'express'`
- Remove `import { json, urlencoded } from 'express'`
- Remove `import cookieParser from 'cookie-parser'`
- Replace `expressApp.get('/sitemap.xml', ...)` with Fastify `app.get('/sitemap.xml', ...)`
- Replace `expressApp.get('/robots.txt', ...)` with Fastify `app.get('/robots.txt', ...)`
- Remove `expressApp.use(json({ limit: '10mb' }))` — Fastify handles body parsing
- Remove `expressApp.use(urlencoded(...))`
- Keep `app.useStaticAssets` — works with Fastify adapter
- Keep `app.setGlobalPrefix('api/v1')`
- Keep `app.enableCors(...)`
- Ensure `app.useGlobalPipes` includes `XssSanitizationPipe`
- Keep `app.use(new RequestContextMiddleware()...)`

**Validation**: `npm run start:dev` boots without errors. `curl http://localhost:5000/api/v1/health` returns 200.

---

### 1.4 Replace Express Patterns in Controllers

**Files to fix**:
- `apps/moringa-backend/src/auth/auth.controller.ts`
- `apps/moringa-backend/src/order/order.controller.ts`
- Any other controller using `import type { Request, Response } from 'express'`

Changes:
- Replace `import type { Request, Response } from 'express'` with Fastify `Request`/`Reply` or use `@nestjs/platform-fastify` types
- Replace `@Req() req: Request` with `@Req() req: Request` (Fastify adapter provides compatible types via `@nestjs/platform-fastify`)
- Remove `@Res() res: Response` patterns where possible; return values directly
- For file uploads: replace `@UseInterceptors(FileInterceptor(...))` with Fastify multipart hook
- Remove `req.rawBody` usage — Fastify provides `request.rawBody` via adapter config

**Validation**: Auth login/register endpoints respond correctly.

---

### 1.5 Update app.config.ts

**File**: `apps/moringa-backend/src/config/app.config.ts`

Add missing env var mappings:

```typescript
export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '5000', 10),
  corsOrigins: process.env.CORS_ORIGINS?.split(',').map((origin) => origin.trim()) ?? [],
  isProduction: process.env.NODE_ENV === 'production',
  siteUrl: process.env.SITE_URL ?? '',
  jwtSecret: process.env.JWT_SECRET ?? 'change-me',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  redisUrl: process.env.REDIS_URL ?? '',
  rabbitmqUrl: process.env.RABBITMQ_URL ?? 'amqp://localhost:5672',
  storageProvider: process.env.STORAGE_PROVIDER ?? 'local',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
  smtpHost: process.env.SMTP_HOST ?? '',
  smtpPort: parseInt(process.env.SMTP_PORT ?? '587', 10),
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPass: process.env.SMTP_PASS ?? '',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
  razorpayCurrency: process.env.RAZORPAY_CURRENCY ?? 'INR',
  encryptionKey: process.env.ENCRYPTION_KEY ?? '',
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
  rateLimitWindow: process.env.RATE_LIMIT_WINDOW ?? '1 minute',
  maxBodySize: parseInt(process.env.MAX_BODY_SIZE ?? '1048576', 10),
}));
```

**Validation**: `ConfigService` returns all new keys without errors.

---

### 1.6 Fix Cookie SameSite

**File**: `apps/moringa-backend/src/auth/services/auth-cookies.service.ts`

Line 14: change production `sameSite` from `'none'` to `'strict'`:

```typescript
sameSite: isProduction ? 'strict' : 'lax',
```

Same fix for CSRF cookie on line 40.

**Validation**: In production mode, cookies have `SameSite=strict`.

---

### 1.7 Add Prisma Soft-Delete Middleware

**File**: `apps/moringa-backend/src/infrastructure/prisma.service.ts`

Add middleware to exclude soft-deleted records:

```typescript
import { PrismaClient } from '@prisma/client';

export class PrismaService extends PrismaClient {
  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
    });

    this.$use(async (params, next) => {
      // Add soft-delete filter for models that have deletedAt
      const modelsWithSoftDelete = ['User', 'Product', 'Order', 'Review', 'BlogPost'];
      if (modelsWithSoftDelete.includes(params.model) && params.action !== 'delete') {
        if (params.args.where && !params.args.where.deletedAt) {
          params.args.where.deletedAt = null;
        }
      }
      return next(params);
    });
  }

  async healthCheck() {
    try {
      await this.$queryRaw`SELECT 1`;
      return 'ok';
    } catch {
      return 'error';
    }
  }
}
```

**Validation**: Queries automatically exclude `deletedAt != null` records.

---

### 1.8 Fix order.controller.ts Express Dependencies

**File**: `apps/moringa-backend/src/order/order.controller.ts`

- Remove `import { Request } from 'express'`
- Replace `@Req() req: Request & { user: { id: number; role: Role } }` with Fastify types
- Remove `@Sse('stream')` — replace with Fastify streaming or keep if NestJS SSE decorator works with Fastify adapter (verify)
- Ensure `@Header` decorators work with Fastify (they do via NestJS)

**Validation**: Order endpoints return correct responses.

---

## Acceptance Criteria

- [ ] `npm install` completes without errors
- [ ] `npm run start:dev` boots on port 5000
- [ ] `GET /api/v1/health` returns 200
- [ ] `POST /api/v1/auth/login` works (test with valid credentials)
- [ ] No `from 'express'` imports remain in `src/`
- [ ] Dockerfile builds successfully
- [ ] All new `app.config.ts` keys are readable via `ConfigService`

---

## Next Phase

When all acceptance criteria are met, proceed to **`phase-02-backend-services.md`**.
