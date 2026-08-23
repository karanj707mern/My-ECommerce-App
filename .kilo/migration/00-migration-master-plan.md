# Moringa E-Commerce Migration — Master Plan

**Date**: 2026-08-21  
**Status**: In Progress — Phase 1–3 COMPLETE · Phase 4 COMPLETE · Phase 5 next  
**Source**: `Moringa-Backend` (Express/NestJS) + `Moringa-Frontend` (Next.js/React)  
**Target**: `apps/moringa-backend` (Fastify/NestJS) + `apps/moringa-frontend` (Qwik City)  
**Constraint**: Feature-preserving migration. Same behavior, syntax/deps/adapter changes only.

---

## Current State (updated 2026-08-23, post-Phase-4)

| Layer | Status | Completion |
|---|---|---|
| Backend (Phases 1–3) | Full feature parity ported: orders (2860-line service), reviews, coupons, gift cards, admin, users, products, blog; `nest build` + `tsc --noEmit` exit 0; zero express imports | ~100% of planned scope |
| Frontend foundation (Phase 4) | Build infra restored (vite.config, qwikVite+qwikCity+tailwind v4 plugins, entry.ssr/dev/preview, eslint flat config); full storage/session/guest-token/http-cache-CSRF-refresh ports; all 12 API modules; custom Qwik toast bus + Toaster; SessionHydrator; SiteNav/Footer full ports; usePreviewMode/useAutoDismiss hooks. `typecheck`/`build`/`lint` green via Nx; dev-SSR smoke: `/`, `/shop`, `/cart`, `/blog` render nav+page+footer | ~100% |
| Frontend pages (Phase 5) | Route stubs only (`admin/*`, `auth` throw Not implemented) | ~10% |
| Nestia SDK | Config fixed; generation pending backend controllers stability pass in Phase 6 | ~10% |
| Docker/CI | Backend image builds & runs healthy. Frontend has no Dockerfile yet (Phase 7). nx.json plugin entries for unresolvable `qwik-nx` (peer-capped at nx≤22) / missing `@nx/nest` removed — Nx now infers targets from workspace package scripts | ~35% |
| Tests | Backend skeleton stubs; frontend jest config absent (Phase 8) | ~5% |

### Phase 3 status (verified 2026-08-23)
- OrderService 2860 lines (status machine, checkout, Razorpay verify/webhook, stock, cleanup, issues, refunds, invoices, CSV export, SSE, fraud scoring), ReviewService 516, CouponService 215, GiftCardService 177, AdminService 271, UserService 183, ProductService 216, BlogService 182
- New DTO directories (order/coupon/gift-card/review/blog/user) with strict validation schemas

### Phase 4 completion evidence (2026-08-23)
- `nx run-many -t typecheck build -p @moringa/frontend @moringa/ui @moringa/shared` → all green
- `qwik build` client output produced (153 modules); lint clean via new flat ESLint config
- Dev SSR smoke test: `/`, `/shop`, `/cart`, `/blog` return 200 with nav/footer/page markup; admin/auth stubs intentionally throw until Phase 5
- Key fixes en route: root.tsx must render `<RouterOutlet/>` (bare `<Slot/>` renders empty routes); module-scope toast QRL uses mutable-holder counter (Rollup forbids import reassignment); AppButton made polymorphic (`href` → anchor)
- Deps: added `@tailwindcss/vite`; removed React-only `sonner` and `@vercel/speed-insights`

### Phase 2 status (updated 2026-08-23)
- **2.1 NotificationService** ✓ full port (SMTP/Twilio/WhatsApp, BullMQ+RabbitMQ integration, preferences, retry/backoff)
- **2.2 StorageService** ✓ full port (Cloudinary + local fallback, sharp WebP, MIME/size validation)
- **2.3 Gateway** ✓ FULL: `OrderGateway` port (JWT handshake from auth/query/header/cookie, user:{id}+admin rooms, cached last-event replay, ping/pong), real RxJS event stream in `OrderEventsService` (+`emitOrderCancelled`), `RedisIoAdapter` port with health-check + graceful fallback, `GatewayModule`, adapter wired in main.ts.
  - **Live-verified**: socket.io-client handshake → `connected` ✓ · `ping`→`pong` ✓
- **2.4 RabbitMQ consumers** ✓ for `order.*` (feeds gateway stream) and notifications (own service). `analytics.*` consumer deferred to Phase 3 (no AnalyticsService handler yet)
- **2.5 BullMQ processors** ✓ processor-registry pattern (`registerProcessor`) keeps infra decoupled; OrderModule wires all four actions to `OrderProcessor`.
  - **Live-verified**: external enqueue → in-app worker → OrderProcessor → Prisma write (FK violation correctly raised+nack'd on fabricated orderId — orders flow lands in Phase 3)
- **2.6 AppModule** ✓ GatewayModule wired; `CronService` ported (abandoned-cart cleanup 0 0 * * * Asia/Kolkata) + boot log line. Session/pending-order cleanup crons still pending (Phase 3)

### Phase 1 acceptance evidence
- `npm install` clean; `nest build` exit 0; `tsc --noEmit` = 0 non-spec errors
- Live: `GET /api/v1/health` → 200 · `POST /auth/register` → 201/409 · `POST /auth/login` → 201 + HttpOnly cookies (`path=/`) · cookie-auth `GET /auth/profile`, `/notification/unread-count` → 200 · public `/product` → 200
- Zero `from 'express'` imports in backend `src/`
- Infra: postgres16 + redis7 containers; RabbitMQ optional (services no-op when unconfigured)
- **Docker**: root-context build (`docker build -f apps/moringa-backend/Dockerfile -t moringa-backend .`); image runs as non-root with HEALTHCHECK; container→pg (moringa-net) + container→host redis verified; login/profile/notifications all green in-container. Secrets via env only (`.env` dockerignored). Declared previously-phantom deps: `uuid`, `@types/uuid`, `nestia` (dev, for backend-application.ts)

### Key implementation notes for future phases
- Guards: Nest instantiates class-referenced enhancers per consuming module → use `AuthSharedModule` imports (NOT global-module exports)
- Fastify plugins: register on a self-built instance passed to `new FastifyAdapter(server)` (plugins before routes; sidesteps vendored-fastify type clashes)
- Soft-delete filtering is schema-scoped via client extensions (models with `deletedAt` only)

---

## Execution Strategy

**4 parallel tracks**, each independently executable:

| Track | Owner | Phase |
|---|---|---|
| A: Backend Feature Parity | Backend agent | Phase 1 → 3 |
| B: Frontend Feature Parity | Frontend agent | Phase 4 → 5 |
| C: Nestia SDK + Integration | SDK agent | Phase 6 |
| D: Infrastructure + CI/CD | DevOps agent | Phase 7 → 8 |

Tracks A and B can run in parallel after Phase 0. Track C depends on Track A’s controllers. Track D can start immediately.

---

## Phase Dependency Graph

```
Phase 0: Audit & Planning (DONE)
    │
    ├──► Phase 1: Backend Core (Fastify fix, deps, config)
    │       │
    │       ├──► Phase 2: Backend Services (notifications, storage, sockets)
    │       │
    │       └──► Phase 3: Backend Completeness (orders, reviews, coupons, admin)
    │
    ├──► Phase 4: Frontend Foundation (state, API, components)
    │
    │       └──► Phase 5: Frontend Pages (all routes)
    │
    ├──► Phase 6: Nestia SDK (generate + consume)
    │
    └──► Phase 7: Infrastructure + CI/CD
            │
            └──► Phase 8: Tests + Polish
```

---

## How to Continue Tomorrow

**RESUME POINT (2026-08-24): Phase 5 — Frontend Pages. Doc read, legacy survey done, NO page code written yet.**

1. Read `.kilo/migration/phase-05-frontend-pages.md` fully
2. Legacy sources surveyed (port these from `Moringa-Frontend/app/`):
   - Public: `(main)/page.tsx`+`HomeClient.tsx` (400), `shop/ShopPageInner.tsx` (427), `product/[id]/page.tsx`+`ProductDetailsClient.tsx` (560), blog list+post (~450), info pages (`InfoPage` component pattern), `gift-cards/page.tsx` (203)
   - Auth: `(main)/auth/page.tsx` (732) — login/register/forgot/reset/verify/Google
   - Cart: `cart/hooks/useCartLogic.ts` (859) + `useRazorpayPayment` (183) + 6 components
   - Orders: `orders/hooks/useOrdersLogic.ts` (611) + 6 components + `lib/invoice.ts` (456) + `lib/orders.ts`; catch-all `[[...slug]]`
   - Profile: `profile/page.tsx` (781); Wishlist: `wishlist/WishlistClient.tsx` (307)
   - Admin: layout (174, AdminGuard+AdminSidebar), overview (336), orders/products/settings/blog/support/gift-cards/new-arrivals managers
   - Shared hooks: `app/hooks/useOrderSocket.ts`, `useProductViewers.ts`, `useAdminLoading.tsx`; root `not-found.tsx` (350), `robots.ts`, `sitemap.ts`
   - Total legacy surface: ~10.8k lines
3. Port order recommendation: info pages → gift-cards → wishlist → auth → home/shop/product/blog → cart/checkout → orders → profile → admin
4. After each route group: `npx nx run @moringa/frontend:typecheck && npx nx run @moringa/frontend:build`, dev-SSR smoke via `npx vite --mode ssr --port 5174 --strictPort` (NOT `qwik dev` — TTY fails headless; use vite directly with `--mode ssr`)
5. Mark phase-05 checkboxes as groups complete

### Working conventions established in Phase 4 (keep following)
- Qwik gotchas solved: body needs `<RouterOutlet/>` not `<Slot/>`; module-level QRLs for handler-captured fns (`showToast`); mutable counters must live in holder objects (Rollup import-reassignment); `qwik dev` CLI breaks headless (npm rejects `--pretty`, TTY init) → build via scripts `build.client` = `vite build`, lint flat config present
- Nx targets are script-inferred (plugins removed): `nx run @moringa/frontend:typecheck|build|dev`, project name is `@moringa/frontend` (not moringa-frontend)
- Theme = `.dark` class on `<html>` + CSS vars in `global.css`; toasts via window event bus + `<Toaster/>` in root; storage events: `moringa:user-changed/cart-changed/wishlist-changed/auth-checked`
- Phases 1–4 changes are uncommitted in the working tree (commit strategy decided by user)

For each remaining phase:
- Read the phase doc fully, verify legacy sources, implement in order, mark `[x]`, run validation at end
- Do not skip phases

---

## File Index

| File | Purpose |
|---|---|
| `00-migration-master-plan.md` | This file — overview, strategy, current state |
| `phase-01-backend-core.md` | Fastify fix, deps, config, Prisma, auth controllers |
| `phase-02-backend-services.md` | Notification, Storage, Socket.IO, RabbitMQ, BullMQ |
| `phase-03-backend-completeness.md` | OrderService full port, reviews, coupons, gift cards, admin |
| `phase-04-frontend-foundation.md` | State, API layer, toast, session, base components |
| `phase-05-frontend-pages.md` | All page routes ported from legacy |
| `phase-06-sdk-integration.md` | Nestia SDK generation + frontend consumption |
| `phase-07-infra-deploy.md` | Docker, docker-compose, CI/CD, Render, production hardening |
| `phase-08-tests-polish.md` | Tests, security audit, performance, final verification |

---

## Quick Reference: Legacy → Migrated Mapping

| Legacy Path | Migrated Path |
|---|---|
| `Moringa-Backend/src/main.ts` | `apps/moringa-backend/src/main.ts` |
| `Moringa-Backend/src/app.module.ts` | `apps/moringa-backend/src/app.module.ts` |
| `Moringa-Backend/src/auth/` | `apps/moringa-backend/src/auth/` |
| `Moringa-Backend/src/order/order.service.ts` | `apps/moringa-backend/src/order/order.service.ts` |
| `Moringa-Backend/src/notification/` | `apps/moringa-backend/src/notification/` |
| `Moringa-Backend/src/storage/` | `apps/moringa-backend/src/storage/` |
| `Moringa-Backend/prisma/schema.prisma` | `apps/moringa-backend/prisma/schema.prisma` |
| `Moringa-Backend/package.json` | `apps/moringa-backend/package.json` |
| `Moringa-Frontend/app/` | `apps/moringa-frontend/src/routes/` |
| `Moringa-Frontend/lib/api/` | `apps/moringa-frontend/src/lib/api/` |
| `Moringa-Frontend/lib/storage.ts` | `apps/moringa-frontend/src/lib/storage.ts` |
| `Moringa-Frontend/components/` | `apps/moringa-frontend/src/components/` |
