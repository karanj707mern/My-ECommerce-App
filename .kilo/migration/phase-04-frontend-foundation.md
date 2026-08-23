# Phase 4: Frontend Foundation — State, API, Components

**Objective**: Port the foundational frontend infrastructure from `Moringa-Frontend` to `apps/moringa-frontend`. No pages yet — just the state management, API layer, and shared components that all pages depend on.

**Legacy Source**: `Moringa-Frontend/lib/`, `Moringa-Frontend/components/`, `Moringa-Frontend/hooks/`  
**Migrated Target**: `apps/moringa-frontend/src/lib/`, `apps/moringa-frontend/src/components/`, `apps/moringa-frontend/src/hooks/`  
**Estimated Effort**: 6–8 hours  
**Dependencies**: Phase 1 complete (backend endpoints must be stable)

---

## Tasks

### 4.1 Port Storage and State Management

**Legacy**: `Moringa-Frontend/lib/storage.ts`  
**Migrated**: `apps/moringa-frontend/src/lib/storage.ts` (simplified stub)

Port the full reactive store:
- `getCurrentUser` / `setCurrentUser` / `clearToken` from `localStorage`
- Custom events: `moringa:user-changed`, `moringa:auth-checked`
- Cart: `getCartItems`, `addCartItem`, `updateCartItemQuantity`, `removeCartItem`, `clearCart`, `getCartCount`
- Debounced persist (200ms)
- Custom event: `moringa:cart-changed`
- Wishlist: `getWishlistItems`, `addWishlistItem`, `removeWishlistItem`, `clearWishlist`, `getWishlistCount`
- Custom event: `moringa:wishlist-changed`
- Guest aliases: `queueGuestCartItem`, `getGuestCartItems`, `getGuestCartCount`, `clearGuestCart`
- `markLoggedOut()` / `wasRecentlyLoggedOut(ms)`
- `getToken()` returns `null` (HttpOnly cookie)
- `setToken()` is no-op

**Qwik deltas**:
- Replace `useSyncExternalStore` with Qwik `useSignal` + `useTask`
- Use `window.dispatchEvent` for custom events
- Use `localStorage` via `useVisibleTask$` for client-side access

**Files to modify**:
- `apps/moringa-frontend/src/lib/storage.ts`

**Validation**:
- [x] User state persists across page navigations
- [x] Cart updates emit `moringa:cart-changed` event
- [x] Wishlist updates emit `moringa:wishlist-changed` event
- [x] `wasRecentlyLoggedOut` returns true within 5 minutes of logout

---

### 4.2 Port Session Management

**Legacy**: `Moringa-Frontend/lib/session.ts`, `Moringa-Frontend/components/SessionHydrator.tsx`  
**Migrated**: Missing

Create:
- `apps/moringa-frontend/src/lib/session.ts` — `signOutCurrentUser()`, `getSession()` wrapper
- `apps/moringa-frontend/src/components/SessionHydrator.tsx` — Qwik component that hydrates session from `/auth/session` API on mount; handles `wasRecentlyLoggedOut`, CSRF token

**Qwik deltas**:
- Use `useVisibleTask$` for client-side API call
- Use `useSignal` for hydrated state

**Validation**:
- [x] Session hydrates on page load
- [x] Recent logout shows logged-out state

---

### 4.3 Port Guest Token

**Legacy**: `Moringa-Frontend/lib/guest-token.ts`  
**Migrated**: `apps/moringa-frontend/src/lib/guest-token.ts` (exists, partially implemented)

Ensure:
- `getGuestToken()` returns `undefined` (backend-managed HttpOnly cookie)
- `setGuestToken`/`clearGuestToken` are no-ops
- Wired into `apiRequest` headers as `X-Guest-Token`

**Validation**:
- [x] Guest cart operations include `X-Guest-Token` header when available

---

### 4.4 Complete API Layer

**Legacy**: `Moringa-Frontend/lib/api/http.ts` + 12 endpoint modules  
**Migrated**: `apps/moringa-frontend/src/lib/api/http.ts` (stub only)

Port the full API layer:

#### 4.4.1 http.ts
Features to port:
- `API_BASE_URL` resolution (client vs server)
- In-memory cache: Map with 60s TTL, max 100 entries, inflight deduplication
- Bypass cache for auth paths, cookie auth, state-changing methods
- CSRF: read `csrf-token` cookie, attach `X-CSRF-Token` header on state-changing methods
- Auth refresh: on 401 (except `/auth/refresh`), call `POST /auth/refresh` with `credentials: "include"`, retry once
- Timeout: 15s default via `AbortController`
- Error handling: parse JSON error payload, extract `message` or `error`

**Files to modify**:
- `apps/moringa-frontend/src/lib/api/http.ts`

#### 4.4.2 Endpoint Modules
Create all missing endpoint files:

| Legacy File | Endpoints | Migrated File |
|---|---|---|
| `lib/api/auth.ts` | login, register, google, verify-email, resend, forgot, reset, profile, addresses, session, logout, upload-avatar | `src/lib/api/auth.ts` |
| `lib/api/cart.ts` | getCart, addCartItem, updateCartItem, removeCartItem, clearCart, mergeGuestCart | `src/lib/api/cart.ts` |
| `lib/api/product.ts` | getProducts, getProduct, admin CRUD, upload-image | `src/lib/api/product.ts` |
| `lib/api/order.ts` | checkout-session, preview, verify-payment, create, list, admin queries, cancel, issues, refund, invoice | `src/lib/api/order.ts` |
| `lib/api/wishlist.ts` | getWishlist, add, remove, mergeGuest | `src/lib/api/wishlist.ts` |
| `lib/api/blog.ts` | getPosts, getPost, admin CRUD, upload-image | `src/lib/api/blog.ts` |
| `lib/api/hero.ts` | getHero, getActive, admin CRUD, upload-image | `src/lib/api/hero.ts` |
| `lib/api/new-arrival.ts` | getNewArrivals, admin CRUD, upload-image | `src/lib/api/new-arrival.ts` |
| `lib/api/gift-card.ts` | validate, redeem, balance, admin CRUD | `src/lib/api/gift-card.ts` |
| `lib/api/settings.ts` | getSettings, updateSettings | `src/lib/api/settings.ts` |
| `lib/api/admin.ts` | getOverview | `src/lib/api/admin.ts` |
| `lib/api/review.ts` | featured, product reviews, eligibility, create, comments | `src/lib/api/review.ts` |

**Validation**:
- [x] All endpoint modules exist and export correct functions
- [x] `apiRequest` caches GET requests
- [x] CSRF token is sent on state-changing methods
- [x] 401 triggers auto-refresh once

---

### 4.5 Port Toast System

**Legacy**: `Moringa-Frontend/hooks/useToast.ts`, `Moringa-Frontend/components/ToastContext.tsx`, `Moringa-Frontend/components/ToastProvider.tsx`  
**Migrated**: Missing

Create Qwik-compatible toast system:
- `apps/moringa-frontend/src/components/ToastProvider.tsx` — provides `showToast({ severity, summary, detail, life })`
- `apps/moringa-frontend/src/hooks/useToast.ts` — `useToast()` hook returning `showToast`
- Use `sonner` (already in deps) or custom Qwik implementation

**Qwik deltas**:
- Replace React Context with Qwik `useContext` or global signal store
- Render `Toaster` in root layout

**Validation**:
- [x] `showToast()` displays toast in UI (custom Qwik event-bus Toaster; sonner is React-only)
- [x] Toasts auto-dismiss after `life` ms
- [x] Severity levels (success, error, warning) render correctly

---

### 4.6 Port Base Components

**Legacy**: `Moringa-Frontend/components/SiteNav.tsx`, `Footer.tsx`, `Header.tsx`, `MainNavbar.tsx`  
**Migrated**: `apps/moringa-frontend/src/components/SiteNav.tsx`, `Footer.tsx` (minimal stubs)

Port full components:

#### SiteNav
- Sticky nav with cart badge, wishlist badge, profile link, login/logout, admin panel link, theme toggle
- Mobile hamburger menu
- Reads cart/wishlist counts from storage events
- Preview mode exit button

**File**: `apps/moringa-frontend/src/components/SiteNav.tsx`

#### Footer
- 4-column footer (brand + social, Shop links, Support links, Contact info)
- Newsletter signup form
- Copyright bar

**File**: `apps/moringa-frontend/src/components/Footer.tsx`

**Validation**:
- [x] SiteNav shows correct auth state
- [x] Cart/wishlist badges update on changes
- [x] Footer renders all columns

---

### 4.7 Port Utility Hooks

Create Qwik versions of legacy hooks:

| Legacy Hook | Purpose | Migrated Hook |
|---|---|---|
| `usePreviewMode` | Enable/disable admin preview mode | `src/hooks/usePreviewMode.ts` |
| `useAutoDismiss` | Auto-dismiss value after delay | `src/hooks/useAutoDismiss.ts` |

**Validation**:
- [x] Preview mode persists in localStorage
- [x] Auto-dismiss clears value after delay

---

## Acceptance Criteria

- [x] `lib/storage.ts` has full user, cart, wishlist, guest token management
- [x] All 12 API endpoint modules exist
- [x] Toast system works across components
- [x] SiteNav and Footer are fully functional
- [x] No `any` types in new code (ESLint rule enforced)
- [x] Utilities covered by typecheck + build + dev-SSR smoke test (unit tests land in Phase 8)

---

## Next Phase

When all acceptance criteria are met, proceed to **`phase-05-frontend-pages.md`**.
