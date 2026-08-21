# Phase 3: Backend Completeness — Orders, Reviews, Coupons, Admin

**Objective**: Port all remaining backend business logic from `Moringa-Backend` to reach feature parity. This is the largest single phase.

**Legacy Source**: `Moringa-Backend/src/order/order.service.ts`, `Moringa-Backend/src/review/`, `Moringa-Backend/src/coupon/`, `Moringa-Backend/src/gift-card/`, `Moringa-Backend/src/admin/`  
**Migrated Target**: `apps/moringa-backend/src/order/`, `apps/moringa-backend/src/review/`, `apps/moringa-backend/src/coupon/`, `apps/moringa-backend/src/gift-card/`, `apps/moringa-backend/src/admin/`  
**Estimated Effort**: 8–12 hours  
**Dependencies**: Phase 1 and Phase 2 complete

---

## Tasks

### 3.1 Complete OrderService Port

**Legacy**: `Moringa-Backend/src/order/order.service.ts` (2848 lines)  
**Migrated**: `apps/moringa-backend/src/order/order.service.ts` (~248 lines ported)

Port the full legacy implementation. Do NOT rewrite — port line-by-line where possible, adapting only for Fastify/NestJS differences.

Key sections to port:
1. **Status machine**: `inferOrderStatus()`, `getAllowedNextStatuses()`, `validateStatusTransition()`
2. **Checkout flows**: `create()` for COD, `createCheckoutSession()` for online
3. **Payment verification**: `verifyPayment()` with Razorpay signature validation
4. **Webhook handler**: `handleRazorpayWebhook()` with HMAC verification
5. **Stock management**: `allocateOrderStock()`, `restoreOrderStock()`, `syncCartAfterSuccessfulPayment()`
6. **Expired order cleanup**: `cleanupExpiredPendingOrders()`, `scheduleExpiredOrderCleanup()`
7. **Order issues**: `createIssue()`, `updateIssue()`, `canCreateIssueForOrder()`
8. **Refunds**: `refundOrder()`, `refundRazorpayPayment()`
9. **Invoices**: `getInvoice()` with store settings
10. **Export**: `exportOrders()` CSV generation
11. **SSE streaming**: `streamOrders()`, `streamAdminOrders()`
12. **Admin queries**: `findOpenOrders()`, `findCancelledOrders()`, `findAdminIssues()`
13. **Pricing**: `getCartSnapshot()`, `applyPromoCode()`, shipping/tax/cod calculation
14. **Activity log**: `createActivity()`, `buildNormalizedActivities()`
15. **Fraud detection**: `inferFraudRiskLevel()`

**Files to modify**:
- `apps/moringa-backend/src/order/order.service.ts` — complete rewrite/port
- `apps/moringa-backend/src/order/order.controller.ts` — verify all endpoints exist
- `apps/moringa-backend/src/order/order-events.service.ts` — ensure integration with gateway

**Validation**:
- [ ] All order status transitions work
- [ ] COD order creation succeeds
- [ ] Razorpay checkout session creates order
- [ ] Payment verification finalizes order
- [ ] Webhook processes payment.captured events
- [ ] Stock deallocates on cancel
- [ ] Expired orders auto-cancel
- [ ] CSV export returns valid CSV

---

### 3.2 Complete ReviewService

**Legacy**: `Moringa-Backend/src/review/review.service.ts`  
**Migrated**: `apps/moringa-backend/src/review/review.service.ts` (15 lines)

Port full review lifecycle:
- `create()` — authenticated users can review purchased products
- `findByProduct()` — approved reviews only for public
- `findAll()` — admin sees all statuses
- `moderate()` — admin approves/rejects
- `addComment()` — nested comments on reviews
- `canReview()` — eligibility check (purchased, not already reviewed, within window)

**Files to modify**:
- `apps/moringa-backend/src/review/review.service.ts`
- `apps/moringa-backend/src/review/review.controller.ts` — add missing endpoints

**Validation**:
- [ ] User can submit review for delivered order product
- [ ] Admin can approve/reject review
- [ ] Comments can be added to reviews
- [ ] Public API only returns APPROVED reviews

---

### 3.3 Complete CouponService

**Legacy**: `Moringa-Backend/src/coupon/coupon.service.ts`  
**Migrated**: `apps/moringa-backend/src/coupon/coupon.service.ts` (27 lines)

Port full coupon logic:
- `validateForUser()` — per-user usage count, max discount, min order value, date range
- `apply()` — apply coupon to cart/order
- `trackUsage()` — create `CouponUsage` record
- `adminCRUD()` — create, update, deactivate coupons
- `getUsageStats()` — per-coupon usage analytics

**Files to modify**:
- `apps/moringa-backend/src/coupon/coupon.service.ts`
- `apps/moringa-backend/src/coupon/coupon.controller.ts` — add admin endpoints

**Validation**:
- [ ] Coupon validates per-user limits
- [ ] Max discount is enforced
- [ ] Usage count increments on order placement
- [ ] Admin can create/update coupons

---

### 3.4 Complete GiftCardService

**Legacy**: `Moringa-Backend/src/gift-card/gift-card.service.ts`  
**Migrated**: `apps/moringa-backend/src/gift-card/gift-card.service.ts` (27 lines)

Port full gift card logic:
- `redeem()` — deduct balance, create redemption record
- `validate()` — check active, not expired, sufficient balance
- `adminCRUD()` — create, update, deactivate
- `getBalance()` — public endpoint to check balance by code

**Files to modify**:
- `apps/moringa-backend/src/gift-card/gift-card.service.ts`
- `apps/moringa-backend/src/gift-card/gift-card.controller.ts` — add redeem endpoint

**Validation**:
- [ ] Gift card redeem reduces balance
- [ ] Expired cards are rejected
- [ ] Insufficient balance is rejected
- [ ] Admin can create/manage gift cards

---

### 3.5 Expand AdminService

**Legacy**: `Moringa-Backend/src/admin/admin.service.ts`  
**Migrated**: `apps/moringa-backend/src/admin/admin.service.ts` (21 lines)

Port full admin capabilities:
- Dashboard stats: orders, products, users, revenue, issues
- Product management: bulk update, bulk delete, stock updates
- Order management: bulk status updates, bulk cancellations
- User management: list, search, role changes, delete
- Support issue management: assign, respond, resolve
- Analytics: sales over time, top products, conversion rates

**Files to modify**:
- `apps/moringa-backend/src/admin/admin.service.ts`
- `apps/moringa-backend/src/admin/admin.controller.ts` — expand endpoints

**Validation**:
- [ ] Admin dashboard returns all stats
- [ ] Bulk operations complete without errors
- [ ] Support issues can be managed

---

### 3.6 Complete UserService

**Legacy**: `Moringa-Backend/src/user/user.service.ts`  
**Migrated**: `apps/moringa-backend/src/user/user.service.ts`

Ensure full user management:
- Profile CRUD
- Address CRUD (already in AuthService, verify consistency)
- Avatar upload integration with StorageService
- Google OAuth linkage
- Account deletion with cascade

**Validation**:
- [ ] User can update profile
- [ ] User can manage addresses
- [ ] Avatar uploads work
- [ ] Account deletion removes all user data

---

### 3.7 Complete ProductService

**Legacy**: `Moringa-Backend/src/product/product.service.ts`  
**Migrated**: `apps/moringa-backend/src/product/product.service.ts` (47 lines)

Port full product logic:
- Admin CRUD with image upload
- Slug auto-generation
- Search by name/description
- Filter by category, tag, price range
- Featured products
- New arrivals
- Stock management
- Soft delete

**Files to modify**:
- `apps/moringa-backend/src/product/product.service.ts`
- `apps/moringa-backend/src/product/product.controller.ts`

**Validation**:
- [ ] Admin can create product with image
- [ ] Search returns matching products
- [ ] Filters work correctly
- [ ] Soft-deleted products excluded from public queries

---

### 3.8 Complete BlogService

**Legacy**: `Moringa-Backend/src/blog/blog.service.ts`  
**Migrated**: `apps/moringa-backend/src/blog/blog.service.ts`

Port full blog logic:
- CRUD with image upload
- Slug auto-generation
- Publish/unpublish
- SEO fields
- Admin list vs public list

**Validation**:
- [ ] Admin can create/edit blog posts
- [ ] Published posts visible publicly
- [ ] Unpublished posts hidden from public

---

## Acceptance Criteria

- [ ] OrderService passes all legacy test scenarios
- [ ] All review, coupon, gift card, admin, user, product, blog endpoints return correct responses
- [ ] No Express-specific code remains in backend
- [ ] All business logic from legacy is ported (behavioral parity)

---

## Next Phase

When all acceptance criteria are met, proceed to **`phase-04-frontend-foundation.md`**.
