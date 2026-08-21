# Phase 8: Tests, Polish, and Production Verification

**Objective**: Replace skeleton tests with real test coverage, perform security audit, verify performance, and confirm production readiness.

**Legacy Source**: `Moringa-Backend/src/**/*.spec.ts`, `Moringa-Backend/test/`, `Moringa-Frontend/src/__tests__/`  
**Migrated Target**: `apps/moringa-backend/src/**/*.spec.ts`, `apps/moringa-frontend/src/__tests__/`  
**Estimated Effort**: 6–8 hours  
**Dependencies**: All previous phases complete

---

## Tasks

### 8.1 Backend Unit Tests

Replace all skeleton `.spec.ts` files with real tests.

#### Priority Order:
1. `auth.service.spec.ts` — test login, register, logout, refresh, verifyEmail, forgot/resetPassword
2. `order.service.spec.ts` — test create, status transitions, cancel, refund, stock allocation
3. `coupon.service.spec.ts` — test validation, per-user limits, max discount
4. `gift-card.service.spec.ts` — test validate, redeem, balance check
5. `review.service.spec.ts` — test CRUD, moderation
6. `cart.service.spec.ts` — test cart operations, guest merge
7. `user.service.spec.ts` — test profile, addresses
8. `product.service.spec.ts` — test CRUD, search, filter

**Testing patterns**:
- Use `@nestjs/testing` `Test.createTestingModule()`
- Mock `PrismaService` with jest.fn()
- Mock external services (Notification, Storage, Socket.IO)
- Test success paths, error paths, edge cases

**Validation**:
- [ ] `npm run test` passes for backend
- [ ] Coverage > 70% for services
- [ ] No skipped tests

---

### 8.2 Backend Integration Tests

**File**: Create `apps/moringa-backend/test/app.e2e-spec.ts`

Port legacy e2e tests:
- Full auth flow: register → verify → login → refresh → logout
- Order flow: create → preview → checkout → verify payment → cancel
- Coupon flow: create coupon → validate → apply → verify usage
- Gift card flow: create → validate → redeem → check balance
- Review flow: create review → moderate → add comment

**Validation**:
- [ ] `npm run test:e2e` passes
- [ ] Tests run against test database

---

### 8.3 Frontend Tests

**Legacy**: `Moringa-Frontend/src/__tests__/MainNavbar.test.tsx`, `Header.test.tsx`, `Footer.test.tsx`  
**Migrated**: Missing

Create Qwik-compatible tests:
- `apps/moringa-frontend/src/__tests__/SiteNav.test.tsx` — test navigation, auth state
- `apps/moringa-frontend/src/__tests__/Footer.test.tsx` — test footer links
- `apps/moringa-frontend/src/__tests__/storage.test.ts` — test cart, wishlist, user state

Use Jest + @testing-library/qwik (or equivalent).

**Validation**:
- [ ] `npm run test` passes for frontend
- [ ] Component tests render and interact correctly

---

### 8.4 Security Audit

Run comprehensive security checks:

#### Dependency Audit
```bash
npm audit --audit-level=high
```

#### Secret Scanning
- Run `git secret` or `truffleHog` on repo
- Ensure no API keys, passwords, or tokens in code

#### Authentication
- [ ] Passwords hashed with bcrypt (cost >= 10)
- [ ] JWT secrets are strong (32+ chars)
- [ ] HttpOnly cookies for tokens
- [ ] CSRF protection enabled
- [ ] Rate limiting on auth endpoints

#### Authorization
- [ ] Admin endpoints protected with RolesGuard
- [ ] Users can only access their own orders/profile
- [ ] Guest tokens cannot access protected resources

#### Input Validation
- [ ] All DTOs have class-validator decorators
- [ ] XSS sanitization pipe active
- [ ] SQL injection prevented (Prisma parameterized queries)

#### Headers
- [ ] Helmet enabled
- [ ] CORS restricted to allowed origins
- [ ] HSTS in production
- [ ] No `X-Powered-By` header

**Validation**:
- [ ] `npm audit` shows no high/critical vulnerabilities
- [ ] No secrets in code
- [ ] All auth checks pass

---

### 8.5 Performance Verification

Run Lighthouse on deployed frontend:
- Performance > 90
- Accessibility > 90
- Best Practices > 90
- SEO > 90

Backend:
- [ ] API response time < 200ms (p95)
- [ ] Database queries < 100ms (p95)
- [ ] Redis cache hit rate > 80%
- [ ] BullMQ job processing < 5s

**Validation**:
- [ ] Lighthouse scores meet targets
- [ ] Backend metrics within SLA

---

### 8.6 Final Verification Checklist

Run through this checklist before declaring production-ready:

| Item | Status |
|---|---|
| All Phase 1-7 acceptance criteria met | ☐ |
| Backend tests pass (`npm run test`) | ☐ |
| Frontend tests pass (`npm run test`) | ☐ |
| E2E tests pass (`npm run test:e2e`) | ☐ |
| `npm audit` clean | ☐ |
| No secrets in code | ☐ |
| Docker builds succeed | ☐ |
| `docker compose up` starts all services | ☐ |
| Health check returns 200 | ☐ |
| CORS restricted to production origins | ☐ |
| Helmet headers present | ☐ |
| Rate limiting active | ☐ |
| CSRF protection active | ☐ |
| All env vars set in production | ☐ |
| Database migrations run | ☐ |
| Redis connected | ☐ |
| RabbitMQ connected | ☐ |
| Socket.IO gateway connected | ☐ |
| Email sending works | ☐ |
| Image uploads work | ☐ |
| Payment webhook works | ☐ |
| Order flow end-to-end works | ☐ |
| Admin panel functional | ☐ |
| SEO metadata present | ☐ |
| Sitemap.xml returns 200 | ☐ |
| robots.txt returns 200 | ☐ |

---

## Acceptance Criteria

- [ ] All tests pass
- [ ] Security audit passes
- [ ] Performance targets met
- [ ] Final verification checklist complete
- [ ] Production deployment successful

---

## Post-Migration

After Phase 8:
1. Tag release: `git tag v1.0.0 && git push --tags`
2. Update `CHANGELOG.md`
3. Archive legacy `Moringa-Backend` and `Moringa-Frontend` (do not delete, keep as reference)
4. Set up monitoring (Sentry, Datadog, etc.)
5. Configure backup strategy for PostgreSQL
6. Set up alerting for critical errors

---

## Summary

This migration plan preserves 100% of legacy feature behavior while modernizing the stack to Fastify + Nestia + Qwik City. The 8-phase approach ensures incremental progress with clear acceptance criteria at each step.

**Total estimated effort**: 40–56 hours across all phases.

**Recommended execution**:
- Phases 1-3: Backend track (A)
- Phases 4-5: Frontend track (B)
- Phase 6: SDK track (C) — can overlap with Phase 5
- Phases 7-8: DevOps track (D) — can start after Phase 1

Good luck with the migration!
