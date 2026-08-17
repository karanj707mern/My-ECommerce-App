# Moringa E-Commerce Monorepo - Continuation Guide

**Created**: 2026-08-17  
**Status**: Migration in progress - backend skeleton complete, frontend stubs complete, Nestia SDK boundary defined, UI wrappers created.

---

## 1. What This Repo Contains

```
My-ECommerce-App/
├── nx.json                    # Nx workspace config
├── package.json               # Root workspace package.json
├── tsconfig.base.json         # Base TypeScript config
├── ARCHITECTURE.md            # Long-term architectural safeguards
├── Moringa-Frontend/          # ORIGINAL Next.js app (reference only, DO NOT MODIFY)
├── Moringa-Backend/           # ORIGINAL NestJS app (reference only, DO NOT MODIFY)
├── apps/
│   ├── moringa-frontend/      # NEW Qwik City frontend (stubs created)
│   └── moringa-backend/       # NEW NestJS backend (skeleton migrated)
└── libs/
    ├── shared/                # Shared types (complete)
    ├── nestia-sdk/            # Nestia SDK config (ready for generation)
    └── ui/                    # UI wrapper components (AppButton, AppCard, cn)
```

**CRITICAL RULE**: Never modify `Moringa-Frontend/` or `Moringa-Backend/`. They are the original source for reference only.

---

## 2. What Is Already Done

### Backend (`apps/moringa-backend/`)
- [x] NestJS app structure with `main.ts`, `AppModule`
- [x] Prisma schema copied from original
- [x] `PrismaModule`, `PrismaService`
- [x] Module stubs migrated:
  - [x] Product (controller, service, DTOs, module)
  - [x] Cart (controller, service, DTOs, module)
  - [x] Order (controller, service, module)
  - [x] Auth (controller, service, module, guards, JWT strategy)
  - [x] User (controller, service, module)
  - [x] Blog (controller, service, module)
  - [x] Wishlist (controller, service, module)
  - [x] Coupon (controller, service, module)
  - [x] Admin (controller, service, module)
  - [x] Health (controller, module)
  - [x] Audit (controller, service, module)
  - [x] Analytics (controller, service, module, abandoned-cart service)
  - [x] Hero (controller, service, module)
  - [x] NewArrival (controller, service, module)
  - [x] GiftCard (controller, service, module)
  - [x] Settings (controller, service, module)
  - [x] Review (controller, service, module)
  - [x] Notification (controller, service, module)
  - [x] Storage (controller, service, module)
  - [x] Cache (`RedisCacheService` placeholder)
  - [x] Common (logger, request context, config)
  - [x] Global exception filter
- [x] DTOs with class-validator decorators
- [x] Auth guards, roles guard, throttler guard
- [x] Cookie/session services
- [x] Email verification service
- [x] Test stubs (unit + e2e)
- [x] Docker, docker-compose, .env.example
- [x] Jest config, ESLint config, Prettier config

### Frontend (`apps/moringa-frontend/`)
- [x] Qwik City entry points (`entry.ssr.tsx`, `entry.server.tsx`, `root.tsx`)
- [x] Global CSS with Tailwind v4 directives
- [x] Route stubs for all original Next.js pages:
  - [x] `/` (home)
  - [x] `/shop`, `/cart`, `/orders`, `/profile`, `/wishlist`
  - [x] `/blog`, `/product/:id`, `/blog/:slug`
  - [x] `/about-us`, `/contact`, `/shipping`, `/returns`
  - [x] `/privacy-policy`, `/terms`, `/wellness-journal`, `/gift-cards`
  - [x] `/admin`, `/admin/products`, `/admin/orders`, `/admin/blog`, `/admin/gift-cards`, `/admin/new-arrivals`, `/admin/settings`, `/admin/support`
- [x] Layout component with navigation and footer
- [x] Theme script for dark mode
- [x] Router head component
- [x] API layer (`src/lib/api/http.ts` + endpoint modules)
- [x] Storage helpers (token, guest token)
- [x] Formatter utilities

### Shared Libraries
- [x] `libs/shared/` - TypeScript interfaces for User, Product, Cart, Order, Wishlist, Review, Coupon, Blog, Address, Settings
- [x] `libs/ui/` - `AppButton`, `AppCard`, `cn()` utility
- [x] `libs/nestia-sdk/` - Nestia config + placeholder SDK index

### Architectural Safeguards
- [x] `ARCHITECTURE.md` documents the two rules:
  1. Frontend NEVER imports from `@moringa/backend` directly
  2. Third-party UI imports are wrapped in `@moringa/ui`

---

## 3. What Remains To Be Done

### Priority 1: Complete Backend Modules
Most modules have stubs, but some need the **full original logic** copied from `Moringa-Backend/src/`:

1. **ProductService** - Add back:
   - `uploadProductImage()` with Cloudinary/R2/local storage
   - Cache invalidation logic
   - Tag normalization
   - Slug/SKU uniqueness checks

2. **CartService** - Add back:
   - Guest cart token generation
   - Guest cart expiry threshold (365 days)
   - Stock validation
   - Merge guest cart logic
   - Abandoned cart tracking

3. **AuthService** - Add back:
   - Full login/register with CAPTCHA
   - Google OAuth flow
   - Email verification
   - Password reset
   - Session management
   - Address CRUD
   - Profile update
   - Account deletion

4. **RedisCacheService** - Replace placeholder with actual Redis client

5. **StorageService** - Replace placeholder with Cloudinary/R2/local upload

6. **SessionService** - Implement with hashed refresh tokens

7. **OrderModule** - Add:
   - Razorpay integration
   - Webhook handling
   - Order status transitions
   - Inventory reservation
   - Coupon/discount application

8. **NotificationModule** - Add:
   - Email/SMS/WhatsApp providers
   - BullMQ queue
   - RabbitMQ consumer

9. **Remaining modules** from original backend:
   - `settings` (store settings, tax, shipping)
   - `review` (review CRUD, moderation)
   - `blog` (full CRUD, slug generation)
   - `gift-card` (purchase, redemption)
   - `analytics` (sales stats, abandoned cart)
   - `hero` / `new-arrival` (CMS-like CRUD)

### Priority 2: Generate Nestia SDK
Once backend controllers are stable:
```bash
nx run nestia-sdk:generate
```
This auto-generates the TypeScript API client in `libs/nestia-sdk/src/`. Frontend should then import from `@moringa/nestia-sdk` instead of manual `lib/api/` files.

### Priority 3: Migrate Frontend Pages
Convert each Qwik City stub into a full page using original `Moringa-Frontend/` as reference:

1. **Home page** - Hero slider, featured products, new arrivals, testimonials
2. **Shop page** - Product listing, filters, pagination
3. **Product detail** - Image gallery, variants, add to cart, reviews
4. **Cart page** - Cart items, quantity controls, checkout button
5. **Auth pages** - Login, register, forgot password forms
6. **Orders page** - Order history, status tracking
7. **Admin pages** - Dashboard, product management, order management
8. **Blog pages** - Post listing, post detail

For each page:
- Import components from `@moringa/ui` (not Qwik libraries directly)
- Import API functions from `@moringa/nestia-sdk` (once generated) or `src/lib/api/` (temporary)
- Use Qwik City `routeLoader$` for SSR data fetching
- Use Qwik `useSignal` / `useStore` for client state

### Priority 4: Wire Up Nx
Currently Nx is initialized but plugins are not fully configured. Add:

```bash
# Install Nx plugins
npm install -D @nx/nest @nx/qwik qwik-nx
```

Then update `nx.json` with proper plugin configs. Ensure these targets work:
- `nx run moringa-backend:dev`
- `nx run moringa-frontend:dev`
- `nx run moringa-backend:build`
- `nx run moringa-frontend:build`
- `nx run moringa-backend:test`
- `nx run moringa-frontend:test`

### Priority 5: Install Dependencies
```bash
# Root
npm install

# Backend
cd apps/moringa-backend
npm install
npx prisma generate

# Frontend
cd ../moringa-frontend
npm install

# Shared libs
cd ../../libs/shared
npm install

# UI lib
cd ../ui
npm install

# Nestia SDK
cd ../nestia-sdk
npm install
```

---

## 4. How to Continue on a New PC

### Step 1: Copy the Entire Folder
Copy `My-ECommerce-App/` to the new PC. It contains everything including the original reference folders.

### Step 2: Install Dependencies
```bash
cd My-ECommerce-App
npm install
```

### Step 3: Continue from the Todo List
Use the todo list in this file (Section 5) or create your own. Pick up from where the previous session left off.

### Step 4: Reference Original Code
When implementing a feature, consult:
- `Moringa-Backend/src/[module]/` for backend logic
- `Moringa-Frontend/app/` or `Moringa-Frontend/components/` for frontend logic

**DO NOT** copy-paste blindly. Adapt to Qwik City / NestJS patterns.

---

## 5. Todo Checklist

Copy this into your task tracker:

```
Backend:
[ ] Complete ProductService (image upload, cache invalidation, normalization)
[ ] Complete CartService (guest tokens, merge, stock validation)
[ ] Complete AuthService (full auth flow, email, OAuth, sessions)
[ ] Replace RedisCacheService placeholder with real Redis client
[ ] Replace StorageService placeholder with Cloudinary/R2
[ ] Implement SessionService with hashed tokens
[ ] Complete OrderModule (Razorpay, webhooks, inventory)
[ ] Complete NotificationModule (BullMQ, providers)
[ ] Complete remaining modules (settings, review, blog, gift-card, analytics, hero, new-arrival)
[ ] Add missing DTOs from original backend
[ ] Add Nestia decorators to controllers for SDK generation

Nestia SDK:
[ ] Install nestia CLI
[ ] Run `nx run nestia-sdk:generate`
[ ] Verify generated SDK matches backend routes
[ ] Update frontend to use generated SDK

Frontend:
[ ] Migrate Home page (hero, featured products, new arrivals)
[ ] Migrate Shop page (listing, filters, pagination)
[ ] Migrate Product detail page (gallery, variants, reviews)
[ ] Migrate Cart page (items, quantity, checkout)
[ ] Migrate Auth pages (login, register, forgot password)
[ ] Migrate Orders page (history, status)
[ ] Migrate Admin pages (dashboard, CRUD)
[ ] Migrate Blog pages (listing, detail)
[ ] Migrate static pages (about, contact, shipping, returns, policy, terms)
[ ] Add error boundaries and loading states
[ ] Add Socket.IO client for real-time order tracking

Nx / Tooling:
[ ] Install @nx/nest and qwik-nx plugins
[ ] Configure nx.json plugins properly
[ ] Verify all targets (build, test, lint, dev) work
[ ] Add CI/CD configuration (GitHub Actions / Render)
[ ] Add commit linting / husky hooks

Testing:
[ ] Write unit tests for migrated services
[ ] Write e2e tests for critical flows
[ ] Set up test coverage reporting
```

---

## 6. Important Commands

```bash
# Install all dependencies
npm install

# Run backend in dev mode
nx run moringa-backend:dev

# Run frontend in dev mode
nx run moringa-frontend:dev

# Run both in parallel
npm run dev

# Build all
npm run build

# Run tests
npm run test

# Generate Nestia SDK (after backend is stable)
nx run nestia-sdk:generate

# Prisma
cd apps/moringa-backend
npx prisma migrate dev
npx prisma studio
npx prisma generate
```

---

## 7. Architectural Rules (Non-Negotiable)

1. **Frontend → Backend boundary**: Frontend code MUST NOT import from `@moringa/backend` internal modules. All API calls go through `@moringa/nestia-sdk` (or temporary `src/lib/api/` until SDK is generated).

2. **UI library isolation**: Frontend components MUST import from `@moringa/ui`, never directly from Qwik UI libraries. This ensures library swaps only require changes in `libs/ui/src/`.

3. **Shared types**: Cross-cutting types live in `libs/shared/src/types/`. Both frontend and backend can import from `@moringa/shared`.

4. **Original folders are read-only**: `Moringa-Frontend/` and `Moringa-Backend/` are preserved for reference. Do not modify them.

---

## 8. Environment Variables

### Backend (`.env`)
```
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://moringa:moringa@localhost:5432/moringa
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
STORAGE_PROVIDER=local
CLOUDINARY_CLOUD_NAME=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SITE_URL=http://localhost:5000
```

### Frontend
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_SITE_URL=http://localhost:5173
```

---

## 9. Current Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Nx 23 + npm workspaces |
| Frontend | Qwik City + Tailwind CSS v4 |
| Backend | NestJS + Prisma + PostgreSQL |
| API Client | Nestia (auto-generated SDK) |
| Cache | Redis (ioredis) |
| Real-time | Socket.IO + Redis adapter |
| Queue | BullMQ + RabbitMQ |
| Storage | Cloudinary / R2 / Local |
| Email | Nodemailer |
| Payments | Razorpay |
| Logging | Pino |
| Auth | JWT + Passport + Sessions |
| Testing | Jest + Supertest |

---

## 10. Notes for Next Session

- The backend skeleton is functional but many services contain simplified logic. Replace with original implementation from `Moringa-Backend/src/`.
- The frontend routes are stubs. Populate them with actual Qwik City components.
- The Nestia SDK is configured but not generated. Generate it once backend routes are stable.
- The `@moringa/ui` wrappers are minimal. Expand them as needed.
- Original `Moringa-Frontend/` has Jest tests. Consider porting critical tests to the new frontend.
- Original `Moringa-Backend/` has Prisma migrations in `prisma/migrations/`. Copy them to `apps/moringa-backend/prisma/migrations/` if needed.

---

## 11. Quick Diagnostic

If something is broken on the new PC, check:

1. **Node version**: Requires Node 24.x
2. **npm version**: Requires npm 11.15.0+
3. **Nx version**: Global Nx 23.1.1+ installed
4. **PostgreSQL**: Running on localhost:5432
5. **Redis**: Running on localhost:6379
6. **Dependencies**: Run `npm install` from root
7. **Prisma**: Run `npx prisma generate` from `apps/moringa-backend/`

---

*Last updated: 2026-08-17 18:42 IST*
