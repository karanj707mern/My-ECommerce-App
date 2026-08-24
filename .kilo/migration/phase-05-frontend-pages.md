# Phase 5: Frontend Pages — Full Route Implementation

**Objective**: Port all page routes from `Moringa-Frontend` to `apps/moringa-frontend`. Each page is a full Qwik City implementation with server loaders, client components, and API integration.

**Legacy Source**: `Moringa-Frontend/app/`  
**Migrated Target**: `apps/moringa-frontend/src/routes/`  
**Estimated Effort**: 10–14 hours  
**Dependencies**: Phase 4 complete (state, API, components must be ready)

---

## Tasks

### 5.1 Public Pages

#### Home (`/`)
**Legacy**: `app/(main)/page.tsx` + `app/(main)/HomeClient.tsx`  
**Migrated**: `apps/moringa-frontend/src/routes/(main)/index.tsx`

Port:
- `generateMetadata` with OG/Twitter tags
- Server loader for `initialProducts`, `initialFeaturedReviews`, `initialNewArrivals`, `initialHeroImages`
- Client component: header carousel, stats, product grid, new arrivals carousel, upcoming products, reviews, testimonials
- Cart/wishlist interactions
- Toast for cart actions

**Validation**:
- [x] Page renders with products, reviews, arrivals
- [x] Add to cart works
- [x] Wishlist toggle works

---

#### Shop (`/shop`)
**Legacy**: `app/(main)/shop/page.tsx` + `ShopPageInner.tsx`  
**Migrated**: `apps/moringa-frontend/src/routes/(main)/shop/index.tsx`

Port:
- Server loader for products + hero image
- Client: product grid, search, filters, pagination

**Validation**:
- [x] Products load and display
- [x] Search filters products
- [x] Pagination works

---

#### Product Detail (`/product/$id`)
**Legacy**: `app/(main)/product/[id]/page.tsx` + `ProductDetailsClient.tsx`  
**Migrated**: `apps/moringa-frontend/src/routes/(main)/product/$id/index.tsx`

Port:
- Server loader for product + reviews
- `generateMetadata` with JSON-LD Product schema
- Client: add to cart, wishlist toggle, review form, review list, product viewers socket
- Breadcrumb navigation

**Validation**:
- [x] Product details render correctly
- [x] Reviews load and display
- [x] Review form submits
- [x] Product viewers count updates via socket

---

#### Blog (`/blog`, `/blog/$slug`)
**Legacy**: `app/(main)/blog/page.tsx`, `BlogListClient.tsx`, `[slug]/page.tsx`, `BlogPostClient.tsx`  
**Migrated**: `apps/moringa-frontend/src/routes/(main)/blog/index.tsx`, `blog/$slug/index.tsx`

Port:
- Blog list with pagination
- Blog post detail with JSON-LD BlogPosting schema
- Admin CRUD (in admin section)

**Validation**:
- [x] Blog list renders posts
- [x] Blog post detail renders correctly
- [x] JSON-LD schema present

---

#### Info Pages
**Legacy**: `app/(main)/about-us/page.tsx`, `contact/page.tsx`, `shipping/page.tsx`, `returns/page.tsx`, `privacy-policy/page.tsx`, `terms/page.tsx`, `wellness-journal/page.tsx`  
**Migrated**: Missing

Port all info pages using `InfoPage` component with static content map.

**Validation**:
- [x] All info pages render with correct content
- [x] Metadata (OG images) present

---

#### Gift Cards (`/gift-cards`)
**Legacy**: `app/(main)/gift-cards/page.tsx`  
**Migrated**: `apps/moringa-frontend/src/routes/(main)/gift-cards/index.tsx`

Port:
- Balance check form
- Redeem form
- `useAutoDismiss` for errors

**Validation**:
- [x] Balance check works
- [x] Redeem works

---

### 5.2 Auth Pages

**Legacy**: `app/(main)/auth/page.tsx`  
**Migrated**: `apps/moringa-frontend/src/routes/(main)/auth/index.tsx` (stub)

Port full auth page:
- Login form (email/password)
- Register form (name/email/password)
- Forgot password form
- Reset password form (from URL token `?mode=reset-password&token=...`)
- Email verification (from URL token `?mode=verify-email&token=...`)
- Google Sign-In button (load `accounts.google.com/gsi/client`)
- Resend verification email
- After login: redirect to `from` param or `/admin` if ADMIN
- Toast messages for success/error

**Qwik deltas**:
- Use `useVisibleTask$` for Google script loading
- Use `$` event handlers for forms
- URL token parsing in `routeLoader$`

**Validation**:
- [x] Login works with valid credentials
- [x] Register creates account
- [x] Google Sign-In button renders
- [x] Forgot/reset password flow works
- [x] Email verification works

---

### 5.3 Cart & Checkout

**Legacy**: `app/(main)/cart/page.tsx` + components + hooks  
**Migrated**: `apps/moringa-frontend/src/routes/(main)/cart/index.tsx` (stub)

Port:
- `CartPageShell` → Suspense boundary
- `CartPageInner` → orchestrates item list, GuestPrompt, CartWishlistPreview, CheckoutSidebar
- `useCartLogic` hook (859 lines) — port to Qwik `useSignal` + `useTask` + `useVisibleTask$`
- `useRazorpayPayment` hook
- `CheckoutSidebar` — address selector, shipping form, ShippingMethodSelector, payment selector, order summary
- `ShippingMethodSelector` — renders shipping options, highlights free shipping
- `GuestPrompt` — banner for guest users
- `CartItemCard` — item with quantity controls, remove
- `CartWishlistPreview` — wishlist items not in cart

**Key flows**:
- `handleCheckout` → COD: `createOrder` → redirect to `/orders?orderMessage=...`
- Online: `createCheckoutSession` → load Razorpay → open modal → `verifyPayment` → redirect
- On dismiss/failure: `cancelOrder`
- `previewCheckout` with debounce

**Validation**:
- [x] Cart displays items
- [x] Quantity changes work
- [x] Checkout preview calculates pricing
- [x] COD order creates successfully
- [x] Online payment opens Razorpay modal
- [x] Guest prompt shows for unauthenticated users

---

### 5.4 Orders

**Legacy**: `app/(main)/orders/[[...slug]]/page.tsx` + components + hooks + lib  
**Migrated**: `apps/moringa-frontend/src/routes/(main)/orders/index.tsx` (stub)

Port:
- Dynamic catch-all route (`active`, `delivered`, `cancelled`, `support`)
- `OrdersPageInner` — tab navigation, search, sort
- `useOrdersLogic` hook — WebSocket, filtering, issue submission, invoice download, cancel
- `OrderCard` — order header, progress strip, details, breakdown, tracking, support form
- `OrderProgressStrip` — 5-stage progress bar
- `OrdersSection` / `SupportSection`
- `SupportTicketCard`
- `invoice.ts` — A4 print HTML generator

**Qwik deltas**:
- WebSocket via `useVisibleTask$` with `io()` client
- Invoice print via `useVisibleTask$` + `window.open`

**Validation**:
- [x] Orders list loads with correct tabs
- [x] WebSocket updates orders in real-time
- [x] Order detail shows progress strip
- [x] Support issue can be submitted
- [x] Invoice prints correctly

---

### 5.5 Profile

**Legacy**: `app/(main)/profile/page.tsx`  
**Migrated**: `apps/moringa-frontend/src/routes/(main)/profile/index.tsx` (stub)

Port:
- Profile form (name, phone, address)
- Avatar upload with preview
- Addresses list with edit/delete
- `updateProfile`, `createUserAddress`, `updateUserAddress`, `deleteUserAddress`
- Redirect to auth on 401

**Validation**:
- [x] Profile loads
- [x] Profile updates save
- [x] Avatar uploads
- [x] Addresses CRUD works

---

### 5.6 Wishlist

**Legacy**: `app/(main)/wishlist/page.tsx` + `WishlistClient.tsx`  
**Migrated**: `apps/moringa-frontend/src/routes/(main)/wishlist/index.tsx` (stub)

Port:
- Wishlist grid with image, price, name, description
- Add to cart / remove buttons
- Add all to cart bulk action
- Guest prompt

**Validation**:
- [x] Wishlist items display
- [x] Add to cart works
- [x] Remove works

---

### 5.7 Admin Panel

**Legacy**: `Moringa-Frontend/app/admin/`  
**Migrated**: `apps/moringa-frontend/src/routes/admin/` (stubs)

Port all admin pages:

#### Admin Layout
**Legacy**: `app/admin/layout.tsx`  
**Migrated**: `apps/moringa-frontend/src/routes/admin/layout.tsx`

- `AdminGuard` — fetch profile, check ADMIN role
- `AdminSidebar` — collapsible, mobile drawer
- Header with preview toggle, theme toggle

#### Overview (`/admin`)
**Legacy**: `app/admin/page.tsx`  
**Migrated**: `apps/moringa-frontend/src/routes/admin/index.tsx`

- Stats cards (products, open orders, issues, blog, COD, online)
- Recent orders list
- Recent issues list

#### Orders (`/admin/orders`)
**Legacy**: `app/admin/orders/page.tsx` + `OrdersManager`  
**Migrated**: `apps/moringa-frontend/src/routes/admin/orders/index.tsx`

- Active/Cancelled tabs
- Search, sort
- Status action buttons (mark paid, shipped, out for delivery, delivered, cancel)
- Refund button
- Courier/tracking/ETA/admin notes inputs
- Socket sync

#### Products (`/admin/products`)
**Legacy**: `app/admin/products/page.tsx` + `ProductsManager`  
**Migrated**: `apps/moringa-frontend/src/routes/admin/products/index.tsx`

- Product list + create/edit form
- Image upload
- Fields: name, slug, SKU, price, compare-at, stock, brand, tags, weight, SEO, active, new arrival
- Delete with confirm

#### Settings (`/admin/settings`)
**Legacy**: `app/admin/settings/page.tsx` + `SettingsManager`  
**Migrated**: `apps/moringa-frontend/src/routes/admin/settings/index.tsx`

- Shipping charges, COD charge, handling charge, tax rate
- Free shipping threshold
- COD enabled, max COD value, international COD
- Auto-cancel pending minutes
- Shipping zones JSON

#### Blog (`/admin/blog`)
**Legacy**: `app/admin/blog/page.tsx` + `BlogManager`  
**Migrated**: Missing

- CRUD for blog posts
- Image upload
- Publish/unpublish toggle

#### Support (`/admin/support`)
**Legacy**: `app/admin/support/page.tsx` + `SupportManager`  
**Migrated**: Missing

- Issue list with status dropdown
- Quick response button

#### Gift Cards (`/admin/gift-cards`)
**Legacy**: `app/admin/gift-cards/page.tsx`  
**Migrated**: Missing

- CRUD gift cards
- Summary cards (total issued, remaining, active, total)
- Toggle active/inactive
- Delete with confirm

#### New Arrivals (`/admin/new-arrivals`)
**Legacy**: `app/admin/new-arrivals/page.tsx` + `NewArrivalsHeroManager`  
**Migrated**: Missing

- New arrivals CRUD
- Hero image management

**Validation**:
- [x] Admin guard redirects non-admins
- [x] All admin pages load with real data
- [x] CRUD operations work
- [x] Settings save correctly

---

## Acceptance Criteria

- [x] All public pages render with real data
- [x] Auth flow works end-to-end
- [x] Cart + checkout flow works (COD + online)
- [x] Orders page shows real-time updates
- [x] Profile management works
- [x] Wishlist works
- [x] All admin pages functional
- [x] SEO metadata present on all pages

---

## Next Phase

When all acceptance criteria are met, proceed to **`phase-06-sdk-integration.md`**.
