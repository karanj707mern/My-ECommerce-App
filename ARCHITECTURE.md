# Moringa E-Commerce Monorepo Architecture

## Long-Term Maintainability Safeguards

### 1. Strict Monorepo Separation (Frontend ↔ Backend)

**Rule**: The Qwik City frontend **MUST NEVER** import directly from `@moringa/backend` internal modules.

**Enforcement**:
- All API communication goes through the auto-generated Nestia SDK (`@moringa/nestia-sdk`)
- The SDK is regenerated from backend controller signatures
- Nx tags enforce: `frontend` depends on `sdk`, not `backend`

**Why this matters**:
- You can rewrite the entire backend (NestJS → Fastify → Bun server) without touching frontend code
- The SDK acts as a versioned, type-safe API contract
- Frontend gets autocompletion and type safety for all endpoints

**How to regenerate SDK**:
```bash
nx run nestia-sdk:generate
```

### 2. Isolate Third-Party UI Code

**Rule**: All Qwik UI library imports are wrapped in `@moringa/ui` components.

**Enforcement**:
- Frontend components import from `@moringa/ui`, never directly from Qwik UI libraries
- If a library goes unmaintained, only update the wrapper component
- All styling conventions are centralized

**Why this matters**:
- Library swaps require changes in one place, not across the app
- You can swap Qwik for another framework in the future by rewriting wrappers
- Consistent design system across the app

### Nx Tag Constraints

The `nx.json` enforces:
- `frontend` → can depend on `sdk`, `ui`, `shared`
- `backend` → can depend on `shared`
- `sdk` → can depend on `backend`, `shared`
- `ui` → can depend on `shared`

Violations will be caught by `nx affected --tags`.
