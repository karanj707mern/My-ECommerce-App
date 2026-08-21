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

Ensure configuration matches backend:
- Input: `apps/moringa-backend/src/**/*.controller.ts`
- Output: `libs/nestia-sdk/src/`
- Include Swagger metadata
- Generate `ApiClient`, `ApiError`, `ApiResult` types

**File**: `libs/nestia-sdk/package.json`

Ensure dependencies:
```json
{
  "dependencies": {
    "@nestjs/swagger": "^11.4.5",
    "nestia": "^2.7.0"
  }
}
```

**Validation**:
- [ ] `nx run nestia-sdk:generate` succeeds
- [ ] Generated SDK exports `ApiClient` with all endpoints
- [ ] Types match backend DTOs

---

### 6.2 Generate SDK

Run the generation:
```bash
npx nx run nestia-sdk:generate
```

Or directly:
```bash
cd libs/nestia-sdk && npx nestia generate
```

**Validation**:
- [ ] `libs/nestia-sdk/src/api/` contains generated client
- [ ] No TypeScript errors in generated code
- [ ] All backend endpoints are represented

---

### 6.3 Refactor Frontend API Layer

**Current**: `apps/moringa-frontend/src/lib/api/http.ts` uses raw `fetch`  
**Target**: Consume generated Nestia SDK

#### 6.3.1 Replace http.ts

Remove raw `fetch` implementation. Use Nestia `ApiClient`:

```typescript
import { ApiClient } from '@moringa/nestia-sdk';
import { getToken, getGuestToken } from './storage';

export const apiClient = new ApiClient(process.env.API_PUBLIC_URL || 'http://localhost:5000/api/v1', {
  headers: {
    ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    ...(getGuestToken() ? { 'X-Guest-Token': getGuestToken() } : {}),
  },
});
```

#### 6.3.2 Replace Endpoint Modules

Rewrite all `lib/api/*.ts` files to use generated SDK:

| Old Pattern | New Pattern |
|---|---|
| `apiRequest('/auth/login', { method: 'POST', body })` | `apiClient.auth.login({ email, password })` |
| `apiRequest('/order', { method: 'POST', body })` | `apiClient.order.create(userId, dto)` |
| `apiRequest('/product')` | `apiClient.product.getProducts()` |

Ensure:
- Type safety: all responses typed from SDK
- Error handling: `ApiError` from SDK
- Authentication: Bearer token / cookie injection
- Uploads: `FormData` wrapped in SDK multipart types

**Files to modify**:
- `apps/moringa-frontend/src/lib/api/http.ts`
- `apps/moringa-frontend/src/lib/api/auth.ts`
- `apps/moringa-frontend/src/lib/api/cart.ts`
- `apps/moringa-frontend/src/lib/api/order.ts`
- `apps/moringa-frontend/src/lib/api/product.ts`
- `apps/moringa-frontend/src/lib/api/wishlist.ts`
- `apps/moringa-frontend/src/lib/api/blog.ts`
- `apps/moringa-frontend/src/lib/api/hero.ts`
- `apps/moringa-frontend/src/lib/api/new-arrival.ts`
- `apps/moringa-frontend/src/lib/api/gift-card.ts`
- `apps/moringa-frontend/src/lib/api/settings.ts`
- `apps/moringa-frontend/src/lib/api/admin.ts`
- `apps/moringa-frontend/src/lib/api/review.ts`

**Validation**:
- [ ] All API calls use generated SDK
- [ ] No raw `fetch` calls remain in `src/lib/api/`
- [ ] TypeScript compiles without errors
- [ ] All endpoints return correctly typed responses

---

## Acceptance Criteria

- [ ] Nestia SDK generates without errors
- [ ] Frontend consumes SDK for all API calls
- [ ] Type safety verified across frontend-backend boundary
- [ ] No raw `fetch` in API layer

---

## Next Phase

When all acceptance criteria are met, proceed to **`phase-07-infra-deploy.md`**.
