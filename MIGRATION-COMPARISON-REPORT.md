# Migration Comparison Report: `Moringa-Backend` (source) → `apps/moringa-backend` (target)

## Executive Summary

The migration from `Moringa-Backend` (root) to `apps/moringa-backend` (Nx workspace) is a **partial architecture rewrite**, not a file copy. The target migrated the framework stack **Express → Fastify** and **Prisma 6 (`@prisma/client`) → Prisma 7 (custom-output generated client)**, which accounts for the bulk of divergence. Of 172 source files, **41 were lost** (not carried over) and **116 of 131 shared files differ** at the byte level. The target has more files (202 vs 172) but fewer logical lines in shared code (12,618 vs 17,942) because significant source logic was dropped or rewritten.

---

## 1. File-Level Comparison

| Metric | Count |
|---|---|
| Source files (`Moringa-Backend/src`) | 172 |
| Target files (`apps/moringa-backend/src`) | 202 |
| Files present in both | 131 |
| ├─ byte-identical | 15 |
| └─ differ | 116 |
| **Source files MISSING in target** | **41** |
| Target files NEW (not in source) | 61 |

### 1.1 Lost: 41 source files not carried to target

These files exist in source but have no counterpart in the target. They fall into three categories:

**A. Express-specific — intentionally removed for Fastify rewrite (not defects):**
- `src/auth/jwt.strategy.ts` (passport JWT strategy)
- `src/auth/guards/csrf.guard.ts`, `guest-cart-throttler.guard.ts`
- `src/common/middleware/csrf.middleware.ts`, `guest-token.middleware.ts`
- `src/common/auth/redirect.service.ts`
- `src/common/interfaces/request.interface.ts` (Express Request augmentation)

**B. DTOs intentionally consolidated into `auth.dtos.ts` (not defects):**
- 17 individual auth DTOs (`login.dto.ts`, `register.dto.ts`, `forgot-password.dto.ts`, `reset-password.ts`, `verify-email.dto.ts`, `change-password.dto.ts`, `delete-account.dto.ts`, `google-auth.dto.ts`, `update-profile.dto.ts`, `create-user-address.dto.ts`, `update-user-address.dto.ts`, `resend-verification.dto.ts`, `create-user-address.dto.ts`) → merged into `src/auth/dto/auth.dtos.ts`

**C. Lost framework-agnostic logic — RESTORED during this audit:**
- `src/order/order.gateway.ts` (250 lines, NestJS websocket)
- `src/product/product.gateway.ts` (132 lines, NestJS websocket)
- `src/cache/redis-cache.module.ts` (8 lines)
- `src/analytics/recently-viewed.service.ts` (79 lines)
- `src/audit/dto/audit-log-query.dto.ts`, `src/hero/dto/create-hero-image.dto.ts`, `src/new-arrival/dto/create-new-arrival.dto.ts`, `src/settings/dto/update-store-settings.dto.ts`, `src/cart/dto/create-guest-cart.dto.ts`
- `src/analytics/cron.service.spec.ts`, `src/order/redis.adapter.spec.ts` (pure test specs)

**D. Test specs with Express dependencies — NOT restored (would break Fastify build):**
- 19 spec files (`analytics.controller.spec.ts`, `audit.controller.spec.ts`, `auth.controller.spec.ts`, `auth.service.spec.ts`, `cart.controller.spec.ts`, `cart.service.spec.ts`, `coupon.controller.spec.ts`, `health.controller.spec.ts`, `notification.*.spec.ts`, `order.controller.spec.ts`, `order.service.spec.ts`, `product.controller.spec.ts`, `product.service.spec.ts`, `review.controller.spec.ts`, `user.controller.spec.ts`, `user.service.spec.ts`, `rabbitmq.service.spec.ts`). These import `Request from 'express'` and use `@/` path aliases; they require Fastify adaptation before restoration.

### 1.2 New: 61 target files not in source

These are intentional additions for the Fastify rewrite and new infrastructure. Key additions:

| File | Purpose |
|---|---|
| `src/gateway/order.gateway.ts` | Consolidated websocket gateway |
| `src/infrastructure/*.ts` | New infra layer (prisma.service, rabbitmq, redis, bullmq) |
| `src/payment/payment.module.ts`, `payment-webhook.controller.ts` | New payment module |
| `src/common/encryption/encryption.service.ts` | Encryption service |
| `src/common/http/cookie-interceptor.ts`, `cookie-state.ts`, `cookie-types.ts` | Fastify cookie handling (replaces Express middleware) |
| `src/common/pipes/xss-sanitization.pipe.ts` | XSS sanitization |
| `src/global-exception/global-exception.module.ts` | Global exception handling |
| `src/auth/auth-shared.module.ts`, `decorators/public.decorator.ts`, `services/token-revocation.service.ts` | New auth infrastructure |
| `src/audit/audit.service.ts`, `src/analytics/analytics.controller.ts` + `.service.ts` | New audit/analytics services |
| `src/storage/storage.controller.ts` | Storage controller |
| `src/generated/prisma/**` (40 files) | Prisma 7 generated client (48,709 lines) |

---

## 2. Architecture Divergence (the 116 differing files)

### 2.1 Framework: Express → Fastify

The most impactful change. `main.ts` is a 521-line diff:
- **Source**: `NestExpressApplication`, `express()` middleware, `cookie-parser`, `helmet`, `compression`, `json/urlencoded` body parsers, `ValidationPipe`
- **Target**: `NestFastifyApplication` + `FastifyAdapter`, `@fastify/helmet`, `@fastify/rate-limit`, `@fastify/compress`, `@fastify/cookie`, `@fastify/multipart`, bring-your-own Fastify instance

### 2.2 Prisma: v6 → v7

- **Source**: `import { Role } from '@prisma/client'`, `@/` path aliases
- **Target**: `import { Role } from '../generated/prisma/client'` (custom output path), relative imports
- Schema: `provider = "prisma-client-js"` → `provider = "prisma-client"` with `output`, `runtime`, `moduleFormat` options; added `@@index` directives on `User.email`, `Product.slug/sku`, `Coupon.code`, etc.

### 2.3 Auth service: +token revocation (JTI), session tracking

`auth.service.ts` is an 862-line diff — the largest single-file divergence:
- Added JWT ID (`jti`) to access/refresh tokens via `crypto.randomUUID()`
- Access token expiry changed from default → explicit `15m`
- Added `TokenRevocationService` dependency
- Added session tracking (`prisma.session.findMany`)
- Added `SafeUser` type, `BadRequestException`, `ForbiddenException`
- Removed individual DTO imports (consolidated)

### 2.4 Module restructuring

`app.module.ts` (72-line diff):
- Removed `PrismaModule` import (moved to `InfrastructureModule`)
- Added `RequestContextModule`, `InfrastructureModule`, `PaymentModule`, `EncryptionModule`, `GatewayModule`
- Config: single `appConfig` → 7 config loaders (`emailConfig`, `razorpayConfig`, `redisConfig`, `notificationsConfig`, `rabbitmqConfig`, `storageConfig`)
- Throttling: `skipIf` for `ProductController.getFeaturedProducts` → skip for `HealthController` + auth `login/register/refresh`

### 2.5 Import path convention

Across all 116 files: source uses `@/` tsconfig path aliases (`@/prisma/prisma.service`); target uses relative paths (`../prisma/prisma.service`). This is a convention change, not logic change.

---

## 3. Bugs Introduced by Migration (found and fixed)

| File | Bug | Fix |
|---|---|---|
| `src/order/order-events.service.ts` | `subscribeOrderUpdates()` returned `this.updates$.subscribe()` (a `Subscription`) instead of the Observable, causing `Property 'subscribe' does not exist on type 'Subscription'` in the gateway | Changed to `return this.updates$` (matches source's `asObservable()`) |
| `src/order/order.gateway.ts`, `src/product/product.gateway.ts` | Used `@prisma/client` and `@/` imports that don't resolve in target | Rewrote to `../generated/prisma/client` + relative paths |

---

## 4. Migrations Restoration

The target's `prisma/migrations` was **empty** (schema applied via `prisma db push`, no history). All 28 migration files + `migration_lock.toml` were copied from source and baselined via `prisma migrate resolve --applied`. Verified: `28 migrations found`, `Database schema is up to date`.

---

## 5. Tests Written

### Backend (NestJS/Jest) — 27 tests
- `src/cart/cart.service.spec.ts` (7 tests): create dedup/increment, findAll with product include, remove with ownership check + abandoned-cart recording, not-found error
- `src/product/product.service.spec.ts` (20 tests): payload normalization (trim/lowercase-slug/uppercase-SKU/tag-dedup/defaults), create + cache invalidation, unique-constraint → ConflictException, getProducts cache read-through + take-cap-50, getNewArrivals, getProductById cache + not-found, update + delete, uploadProductImage

### Frontend (Vitest) — 48 tests
- `src/lib/formatters.test.ts` (26 tests): formatRupees (grouping, edge cases), normalizePrice, renderStars (incl. fractional/clamp), formatMediumDate, formatMediumDateTime
- `src/lib/env.test.ts` (9 tests): lazy accessor functions, injected-mode reflection, trimming, trailing-slash strip, absent-key fallbacks
- `src/lib/api/sdk-server.test.ts` (15 tests): toApiError taxonomy (timeout/abort/network/http/unknown), isRemoteHttpError, invokeSdk retry policy (no retry on non-idempotent, retry on transient, give-up after budget), ApiError shape

---

## 6. Build Verification

- **Backend**: `npx tsc -p tsconfig.build.json --noEmit` → **0 errors** (after restorations + fixes)
- **Frontend**: `npx vitest run` → **48 tests pass**
- **Backend tests**: `npx jest` → **27 tests pass** (new specs); pre-existing specs fail only on missing RabbitMQ (`ECONNREFUSED :5672`) — an infrastructure dependency, not a config defect

---

## 7. Key Risks / Follow-ups

1. **19 Express-dependent test specs not restored** — they need Fastify adaptation (replace `Request from 'express'` with Fastify's `FastifyRequest`, update `@/` → relative paths). Estimated ~800 lines.
2. **`recently-viewed.controller.ts` not restored** — imports `Request from 'express'`; needs Fastify rewrite to match target's `analytics.controller.ts` structure.
3. **Auth parity** — target added token revocation + sessions not present in source; confirm this is intended new functionality vs. drift.
4. **DTO consolidation** — source's 17 individual auth DTOs are gone; any external importer referencing `src/auth/dto/login.dto.ts` will break.
