# Phase 6: Nestia SDK — Generate and Consume

**Objective**: Generate the Nestia SDK from backend controller signatures and refactor the frontend API layer to consume it. This enforces type safety across the frontend-backend boundary.

**Legacy Source**: N/A (new architecture requirement)  
**Migrated Target**: `libs/nestia-sdk/` + `apps/moringa-frontend/src/lib/api/`  
**Estimated Effort**: 4–6 hours  
**Dependencies**: Phase 1 complete (backend controllers must be stable)

---

## Tasks

### 6.1 Configure Nestia SDK

**File**: `libs/nestia-sdk/nestia.config.ts`

Configuration updated for Nestia 2.x API (input glob → controllers, output → src, swagger output included).

**Status**: ⚠️ BLOCKED — SDK generation produces empty output

### 6.2 Generate SDK

Running `npx nestia sdk` succeeds but generates empty `paths: {}` in swagger and no endpoint client code.

**Root cause**: Backend controllers use two patterns Nestia cannot analyze:
1. `@Res() res: FastifyReply` passthrough with manual `res.send()` (no return type)
2. Missing explicit `Promise<...>` return-type annotations on controller methods

Nestia requires controllers to declare typed responses directly (no `@Res()` passthrough) to generate the SDK. Refactoring ~22 controllers is a high-risk architectural change outside feature-preserving scope.

**Status**: ⚠️ BLOCKED — requires backend controller rewrite

### 6.3 Refactor Frontend API Layer

**Decision**: Keeping the existing `http.ts` fetch implementation. It is type-safe (generic `apiRequest<T>`), handles auth/CSRF/caching/timeouts, and works correctly. The Nestia SDK dependency is deferred.

**Status**: ⚠️ DEFERRED — SDK not generatable from current controllers

---

## Acceptance Criteria

- [x] Nestia config updated for 2.x API (`nestia.config.ts`)
- [x] Generation command wired (`nx run nestia-sdk:generate`)
- [ ] ~~Nestia SDK generates without errors~~ — blocked by controller architecture
- [ ] ~~Frontend consumes SDK for all API calls~~ — deferred; existing fetch layer retained
- [ ] ~~Type safety verified across frontend-backend boundary~~ — deferred
- [ ] ~~No raw `fetch` in API layer~~ — retained: `http.ts` fetch is the supported path

---

## Phase Outcome

SDK generation attempted. Empty output confirmed: Nestia cannot analyze controllers using `@Res()` passthrough and untyped returns. The existing `lib/api/http.ts` fetch layer remains the supported frontend API client. Revisit if controllers are refactored to typed responses in a future phase.
