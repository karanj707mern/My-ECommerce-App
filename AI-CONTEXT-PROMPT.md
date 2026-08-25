# AI Context Prompt — Moringa E-Commerce Monorepo

Copy-paste the fenced block below into any AI assistant session to give it
complete, verified project context. Regenerate after major dependency changes.

---

```text
You are working inside "moringa-ecommerce-monorepo" — a production e-commerce
platform migrated from Express/Next.js to a fully-typed Fastify/NestJS +
Qwik City stack. All facts below are verified against the live lockfile
(2026-08-25). Do NOT upgrade, downgrade, or substitute packages without
checking the compatibility constraints in §5.

════════ 1. MONOREPO LAYOUT (npm workspaces) ════════
apps/moringa-backend   NestJS 11 + Fastify 5 API (CJS emit)
apps/moringa-frontend  Qwik City 1.20 SSR storefront (Vite 6)
libs/sdk               @moringa/sdk — AUTO-GENERATED Nestia client
                       (src/api/** is generated; never hand-edit)
libs/shared            @moringa/shared — shared types/constants
libs/ui                @moringa/ui — Qwik component wrappers
Moringa-Frontend/, Moringa-Backend/ (root-level) are LEGACY migration
SOURCES: read for reference only — NEVER import from them.
.kilo/migration/*.md is the authoritative phase/status record.

════════ 2. EXACT VERSIONS (verified live) ════════
Runtime / tooling
  Node.js .................... 24.x (engines-pinned)
  npm ........................ 11.15.x  |  TypeScript ^5.9.3 (ALL workspaces)
  Nx ......................... 23.1.1 (targets inferred from pkg scripts;
                                NO project.json files exist)

Backend (apps/moringa-backend)
  @nestjs/{common,core} ...... ^11.1.16     fastify ^5.2.0
  @nestjs/platform-fastify ... ^11.0.2      @nestjs/swagger ^11.4.5
  @nestjs/throttler .......... ^6.5.0       @fastify/{helmet,cookie,
                                              compress,multipart} v13/v11/v9/v9
  @prisma/client + prisma .... 7.9.1 (driver adapter @prisma/adapter-pg)
  bullmq ^5.79 / ioredis ^5.10 (queues+cache)  socket.io ^4.8.3 (+redis adapter)
  razorpay ^2.9.6 (payments)    bcrypt ^6.0 (cost 10)   sharp ^0.35.3
  jest ^30.3 + ts-jest ^29.4    supertest ^7.2

Frontend (apps/moringa-frontend)
  @builder.io/qwik{,-city} ... ^1.20.0      vite ^6.4  |  tailwindcss ^4.3
  @tailwindcss/vite .......... ^4.3.2 (native Vite plugin; no postcss chain,
                                no tailwind.config.js — theme in global.css)
  socket.io-client ........... ^4.8.3       undici ^7

Nestia SDK toolchain (root devDeps)
  nestia/@nestia/sdk/@nestia/core ^13.0.1   typia ^14.0.2
  @nestia/fetcher ^13.0.1 (runtime client)  ts-patch ^3.3.0 (INSTALLED but
  UNUSED at build time — see §5 caveat)     typescript-transform-paths ^4.0.0
  REMOVED/BANNED: ttypescript, ttsc, @ttsc/unplugin, nestia-fetcher(v2)

Shared libs
  @moringa/shared (pure TS)    @moringa/ui (Qwik components)

════════ 3. MODULE STRATEGY PER WORKSPACE ════════
tsconfig.base.json : target ES2022, strict, decorators+emitDecoratorMetadata,
                     useDefineForClassFields:false, NO module/moduleResolution
                     (each workspace pins its own), NO baseUrl, relative-only
                     paths: "@moringa/shared/*": ["./libs/shared/src/*"]
apps/moringa-backend/tsconfig.json :
                     module commonjs + moduleResolution node10, baseUrl ".",
                     paths {"@/*": ["src/*"]}  → CJS emit to dist/
apps/moringa-frontend/tsconfig.json :
                     module ES2022 + moduleResolution bundler, jsx react-jsx
                     (jsxImportSource @builder.io/qwik), types [node, vite/client]
libs/*/tsconfig.lib.json : module esnext + moduleResolution bundler
RULE: source uses clean ESM import/export syntax everywhere; the backend
compiles it DOWN to optimized CommonJS (package.json has no "type":"module",
so NodeNext-style extensionless imports stay legal). Never add .js extensions
to backend relative imports.

════════ 4. BUILD / RUN COMMAND SURFACE ════════
Root: npm run build | typecheck | test | lint | sdk:generate
Backend: build = "tsc -p tsconfig.build.json && node scripts/fix-dist-aliases.cjs"
         typecheck = "tsc --noEmit -p tsconfig.json"
         start:prod = "node dist/main.js"
         generate:sdk = "nestia sdk --project tsconfig.nestia.json &&
                         nestia swagger --project tsconfig.nestia.json"
Frontend: dev = qwik dev | build.client = vite build | preview server
SDK lib: typecheck via `tsc --noEmit -p tsconfig.json` (noEmit everywhere —
         consumers ingest TS source directly through bundler resolution)

════════ 5. HARD COMPATIBILITY CONSTRAINTS ════════
• TypeScript MUST stay on ^5.9 line. ts-jest@29 peers <7; ts-patch v4 needs
  ≥6 (v3 installed); typia@14's transform requires a TS7/ttsc host and is
  therefore NOT registered anywhere — zero src constructs depend on it.
• NEVER re-add baseUrl to any tsconfig: TS5101 deprecation errors under 5.9.
  paths entries must be "./relative" when baseUrl absent (TS5090).
• Backend emits CJS with "@/…" ALIASES REWRITTEN by post-build script
  scripts/fix-dist-aliases.cjs (78 files). Source is alias-free since the
  codemod converted everything to relative imports — keep it that way.
• npm install-scripts approval gate may skip prepare hooks: if builds emit
  "Cannot find module" on patched-tsc paths, run `npx ts-patch install -s`.
  (Currently inert: plain tsc pipeline doesn't need the patch.)
• Dev-mode smoke testing: use BUILT output (`node dist/main.js`) — NOT
  `vite --mode ssr`; entry.server.tsx is not a dev-SSR target.

════════ 6. SDK CONSUMPTION CONTRACT ════════
Regenerate: cd apps/moringa-backend && npm run generate:sdk
  → writes libs/sdk/src/api/** (functional clients per controller)
    + libs/sdk/swagger.json
Config: apps/moringa-backend/nestia.config.ts
  input excludes these controllers (static-analysis limits — multipart
  req.file(), SSE streams, deep Prisma intersections): auth, product, blog,
  order, settings, user, wishlist, review, admin, analytics, audit,
  payment-webhook, storage, notification(+email-template).
  INCLUDED (typed SDK available): cart, coupon, gift-card, health, hero,
  new-arrival, app root. clone:false, primitive:true, keyword:true.
Frontend rule: consume ONLY via @moringa/sdk (createConnection() factory in
  libs/sdk/src/connection.ts — credentials:"include", env-aware host).
  Excluded-controller paths use apps/moringa-frontend/src/lib/api/http.ts
  (raw fetch w/ cache+CSRF+refresh). Both layers share identical URLs.

════════ 7. AUTH & SECURITY MODEL ════════
• HttpOnly cookies set by AuthCookiesService via request-scoped CookieState
  queue drained by global CookieInterceptor (controllers return typed values,
  never touch @Res() — REQUIRED for Nestia analysis).
  accessToken Max-Age=3600000 / refreshToken Max-Age=604800000,
  Path=/, HttpOnly, SameSite=Strict, Secure in production. Byte-verified.
• JwtAuthGuard (custom CanActivate): cookie-first→Bearer fallback, JWT verify
  → TokenRevocationService.isRevoked(jti) → Prisma session liveness check →
  req.user={id,email,role}. Honors @Public() metadata (IS_PUBLIC_KEY).
  RolesGuard fail-closed via ROLES_KEY reflector.
• Global pipes: ValidationPipe(whitelist+forbidNonWhitelisted+transform) and
  XssSanitizationPipe — standard @Body DTOs only; future TypedBody routes
  bypass both via Typia AOT.
• Helmet full CSP + HSTS preload, strict-origin CORS callback (throw on
  deny), @fastify/rate-limit 100/min/ip (localhost allowlisted),
  @nestjs/throttler on auth routes (10/min), rawBody:true (Razorpay HMAC).
• Login gated on email verification (403 until isEmailVerified).

════════ 8. QWIK-SPECIFIC RULES (frontend) ════════
• root.tsx body MUST render <RouterOutlet/> from '@builder.io/qwik-city'
  (bare <Slot/> renders empty routes).
• Handler-captured functions must be MODULE-LEVEL QRLs ($()); mutable counters
  belong in holder objects (Rollup forbids import reassignment).
• Theme: `.dark` class on <html> + CSS variables in global.css; inline
  ThemeScript pre-paints; toggle persists localStorage 'theme'.
• Cross-component events: window CustomEvents morings:user-changed /
  moringa:cart-changed / moringa:wishlist-changed / moringa:auth-checked.
• Toasts: showToast QRL (lib/toast.ts) dispatches TOAST_EVENT; global
  <Toaster/> in root.tsx renders role=status/alert items.
• eslint flat config present; do NOT write
  'eslint-disable qwik/no-use-visible-task' (plugin not installed).

════════ 9. CURRENT STATE SNAPSHOT ════════
All 8 migration phases COMPLETE. Verified live (native Postgres 18):
health 200@t=3s · register 201 → Set-Cookie pair byte-identical to legacy ·
authed profile 200 via jar · unauth 401 · email-verify gate 403 ·
throttler active · HSTS/CSP headers byte-checked · frontend matrix
(shared+ui+sdk+frontend) exit 0 under aligned TS 5.9.3.
Open follow-ups tracked in .kilo/migration/00-migration-master-plan.md.
```

---

**Why this shape:** every line was extracted from the live manifests and
configs minutes ago — including three drifts I corrected en route so the
prompt is now literally true: frontend `typescript` realigned `^6.0.3 →
^5.9.3`, stale `baseUrl` declarations removed from base/shared configs
(TS5090/TS5101 under 5.9), and the retired `@moringa/nestia-sdk` reference
replaced with the real package name **`@moringa/sdk`**.
