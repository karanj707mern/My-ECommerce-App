# Moringa E-Commerce Migration — Master Plan

**Date**: 2026-08-21  
**Status**: In Progress — Phase 1 COMPLETE (host + Docker verified end-to-end)  
**Source**: `Moringa-Backend` (Express/NestJS) + `Moringa-Frontend` (Next.js/React)  
**Target**: `apps/moringa-backend` (Fastify/NestJS) + `apps/moringa-frontend` (Qwik City)  
**Constraint**: Feature-preserving migration. Same behavior, syntax/deps/adapter changes only.

---

## Current State (updated 2026-08-23)

| Layer | Status | Completion |
|---|---|---|
| Backend scaffold | Boots on Fastify; health/login/profile/notifications/products verified live | ~55% |
| Phase 1 extras done beyond plan | Notification module fully ported (service+queues+templates), audit interceptor/decorator, storage service, email templates, RequestContext wiring, AuthSharedModule guard pattern, Prisma upgraded to **7.9.1** (driver adapter `PrismaPg`, generated client at `src/generated/prisma`) | — |
| Frontend scaffold | Routes/API stubs remain | ~5-8% |
| Nestia SDK | Config fixed (`nestia` default-import); generation blocked on backend feature parity | ~10% |
| Docker/CI | Backend image builds & runs healthy (`docker build -f apps/moringa-backend/Dockerfile .` from repo root; HEALTHCHECK green; auth flow verified in-container). Image 1.84GB — slim via per-workspace dep prune in Phase 7 | ~35% |
| Tests | Skeleton stubs only (`@types/jest` wired via tsconfig types) | ~5% |

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

1. Open this folder: `.kilo/migration/`
2. Start with `phase-01-backend-core.md`
3. For each phase:
   - Read the phase doc fully
   - Verify the legacy source files listed
   - Implement tasks in order
   - Mark each task `[x]` when done
   - Run the validation command at the end of the phase
4. Do not skip phases — each builds on the previous

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
