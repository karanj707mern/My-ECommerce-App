# Moringa E-Commerce Monorepo

This is a monorepo containing the Moringa E-Commerce application, built with:

- **Frontend**: Qwik City + Tailwind CSS
- **Backend**: NestJS + Prisma + PostgreSQL
- **Architecture**: Nx monorepo with Nestia SDK for frontend-backend separation

## Architecture

```
apps/
  moringa-frontend/    # Qwik City frontend app
  moringa-backend/     # NestJS backend API
libs/
  nestia-sdk/          # Auto-generated Nestia SDK (frontend imports ONLY this)
  ui/                  # Local UI component wrappers
  shared/              # Shared types and constants
```

## Key Architectural Safeguards

### 1. Strict Frontend-Backend Separation

The frontend **MUST NOT** import directly from `@moringa/backend`. All API communication goes through the auto-generated Nestia SDK (`@moringa/nestia-sdk`).

- **Why**: Backend can be completely rewritten without breaking frontend code
- **How**: Run `nx run nestia-sdk:generate` to regenerate the SDK from backend controllers
- **Enforcement**: Nx tags prevent direct frontend → backend dependencies

### 2. Isolated Third-Party UI Code

All Qwik UI library imports are wrapped in `@moringa/ui` components. If a library becomes unmaintained, only update the wrapper.

- **Why**: Library swaps require changes in one place, not across the app
- **How**: Import `AppButton`, `AppCard` from `@moringa/ui`, never from Qwik libraries directly
- **Enforcement**: Code review rules + Nx dependency constraints

## Quick Start

```bash
# Install dependencies
npm install

# Generate Nestia SDK
nx run nestia-sdk:generate

# Run both apps in parallel
npm run dev

# Run backend only
npm run dev:backend

# Run frontend only
npm run dev:frontend
```

## Available Scripts

- `npm run dev` - Start both frontend and backend
- `npm run dev:frontend` - Start frontend only
- `npm run dev:backend` - Start backend only
- `npm run build` - Build all apps
- `npm run test` - Run all tests
- `npm run lint` - Lint all apps
- `npm run format` - Format all code

## Project Structure

```
apps/
  moringa-frontend/
    src/
      routes/           # Qwik City file-based routes
      components/       # Local components (import from @moringa/ui)
      lib/              # Frontend utilities
    public/             # Static assets
  moringa-backend/
    src/
      main.ts           # Application entry point
      app.module.ts     # Root module
      common/           # Common utilities (logger, middleware)
      config/           # Configuration
      prisma/           # Prisma service and module
      product/          # Product module
      cart/             # Cart module
      order/            # Order module
      auth/             # Auth module
      user/             # User module
      blog/             # Blog module
      wishlist/         # Wishlist module
      coupon/           # Coupon module
      admin/            # Admin module
      health/           # Health check module
      audit/            # Audit module
      analytics/        # Analytics module
      hero/             # Hero images module
      new-arrival/      # New arrivals module
      gift-card/        # Gift card module
      settings/         # Settings module
      review/           # Review module
      notification/     # Notification module
      storage/          # Storage service
      cache/            # Cache service
      global-exception/ # Global exception filter
    prisma/
      schema.prisma     # Database schema
    test/               # E2E tests
libs/
  nestia-sdk/           # Auto-generated API client
  ui/                   # UI component wrappers
    src/
      components/       # AppButton, AppCard, etc.
      utils.ts          # cn() utility
  shared/               # Shared types
    src/
      types/            # TypeScript interfaces
      index.ts          # Barrel export
```

## Adding New Features

### Backend

1. Create DTOs in `apps/moringa-backend/src/[module]/dto/`
2. Create service in `apps/moringa-backend/src/[module]/[module].service.ts`
3. Create controller in `apps/moringa-backend/src/[module]/[module].controller.ts`
4. Register module in `apps/moringa-backend/src/app.module.ts`
5. Regenerate SDK: `nx run nestia-sdk:generate`

### Frontend

1. Add UI wrappers in `libs/ui/src/components/` if using third-party libraries
2. Import from `@moringa/ui`, never from Qwik libraries directly
3. Import API functions from `@moringa/nestia-sdk`, never from `@moringa/backend`

## Technology Stack

### Frontend
- Qwik City for SSR/SSG
- Tailwind CSS v4 for styling
- Socket.IO client for real-time updates
- Sonner for toast notifications

### Backend
- NestJS framework
- Prisma ORM with PostgreSQL
- Redis for caching and sessions
- Socket.IO with Redis adapter for WebSockets
- BullMQ for background jobs
- Nodemailer for emails
- Razorpay for payments
- Pino for logging
- Helmet for security
- Swagger for API docs

## Development Guidelines

1. **Never import backend code in frontend** - Always use the Nestia SDK
2. **Wrap third-party UI libraries** - Always import from `@moringa/ui`
3. **Use shared types** - Define interfaces in `libs/shared/src/types/`
4. **Follow module boundaries** - Keep feature code in app-specific directories
5. **Regenerate SDK after backend changes** - `nx run nestia-sdk:generate`

## License

MIT
