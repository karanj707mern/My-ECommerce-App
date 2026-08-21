# Phase 2: Backend Services — Notifications, Storage, Socket.IO, Queues

**Objective**: Replace all service stubs with full implementations ported from `Moringa-Backend`. Wire RabbitMQ consumers, BullMQ processors, Socket.IO gateway, and real storage.

**Legacy Source**: `Moringa-Backend/src/notification/`, `Moringa-Backend/src/storage/`, `Moringa-Backend/src/gateway/`, `Moringa-Backend/src/order/order-events.service.ts`  
**Migrated Target**: `apps/moringa-backend/src/notification/`, `apps/moringa-backend/src/storage/`, `apps/moringa-backend/src/gateway/`, `apps/moringa-backend/src/order/`  
**Estimated Effort**: 6–8 hours  
**Dependencies**: Phase 1 complete

---

## Tasks

### 2.1 Port NotificationService

**Legacy**: `Moringa-Backend/src/notification/notification.service.ts`  
**Migrated**: `apps/moringa-backend/src/notification/notification.service.ts` (currently 14 lines)

Port the full implementation including:
- SMTP transporter setup (nodemailer) with TLS, retry logic
- Email template rendering (Handlebars)
- SMS dispatch (Twilio) stub
- WhatsApp dispatch stub
- Retry with exponential backoff (maxAttempts from Notification model)
- Scheduled notification support
- Integration with `NotificationPreference` for per-user opt-in/opt-out
- Queue integration: enqueue to BullMQ for async sending
- Event integration: consume from RabbitMQ `notification.*` queue

**Files to create/modify**:
- `apps/moringa-backend/src/notification/notification.service.ts` — full port
- `apps/moringa-backend/src/notification/email-template.service.ts` — port from legacy
- `apps/moringa-backend/src/notification/notification.controller.ts` — ensure CRUD endpoints exist
- `apps/moringa-backend/src/notification/bullmq/bullmq.service.ts` — wire real processors
- `apps/moringa-backend/src/notification/rabbitmq/rabbitmq.service.ts` — register consumers

**Validation**:
- [ ] `POST /api/v1/notification/test` sends email (use test SMTP like Ethereal)
- [ ] BullMQ worker processes `send_notification` jobs
- [ ] RabbitMQ consumer receives `notification.*` events

---

### 2.2 Port StorageService

**Legacy**: `Moringa-Backend/src/storage/storage.service.ts`  
**Migrated**: `apps/moringa-backend/src/storage/storage.service.ts` (currently 6-line stub)

Port the full implementation:
- Cloudinary uploader with folder structure (`avatars/`, `products/`, `blog/`, `hero/`)
- Local disk fallback when `STORAGE_PROVIDER=local`
- Sharp WebP conversion on upload
- MIME validation (JPG, PNG, WEBP, AVIF, GIF)
- File size limits
- Delete functionality
- Public URL generation

**Files to modify**:
- `apps/moringa-backend/src/storage/storage.service.ts`
- Add `sharp` and `cloudinary` to `package.json` (Phase 1)

**Validation**:
- [ ] Upload image via `POST /api/v1/auth/upload-avatar` returns Cloudinary/local URL
- [ ] Invalid MIME types are rejected
- [ ] Oversized files are rejected

---

### 2.3 Port Socket.IO Gateway + Redis Adapter

**Legacy**: `Moringa-Backend/src/gateway/order.gateway.ts`, `Moringa-Backend/src/order/redis.adapter.ts`  
**Migrated**: Missing entirely

Port the full real-time stack:
- `OrderGateway` with `@WebSocketGateway()`
- Redis adapter for horizontal scaling
- Events: `order.created`, `order.updated`, `order.cancelled`
- Authentication via JWT from handshake query
- Namespace `/orders` for user-specific streams
- Admin namespace for admin-order streams

**Files to create**:
- `apps/moringa-backend/src/gateway/order.gateway.ts`
- `apps/moringa-backend/src/gateway/gateway.module.ts`
- `apps/moringa-backend/src/order/redis.adapter.ts`

**Dependencies**:
- `@nestjs/platform-socket.io` (added in Phase 1)
- `socket.io` (added in Phase 1)
- `@nestjs/websockets` (already present)

**Validation**:
- [ ] Socket.IO client connects to `ws://localhost:5000/orders`
- [ ] Authenticated connection receives order events
- [ ] Redis adapter syncs across multiple instances

---

### 2.4 Wire RabbitMQ Consumers

**File**: `apps/moringa-backend/src/infrastructure/rabbitmq.service.ts`

Current state: service exists but no consumers registered.

Add consumer registration in `InfrastructureModule.onModuleInit()`:
- `notification.*` → `NotificationService` handler
- `order.*` → `OrderEventsService` handler  
- `analytics.*` → `AnalyticsService` handler

**Validation**:
- [ ] Publishing `order.created` event triggers consumer
- [ ] Consumer acknowledges message after processing
- [ ] Failed messages are nack'd and retried

---

### 2.5 Wire BullMQ Processors

**File**: `apps/moringa-backend/src/infrastructure/bullmq.service.ts`

Current state: worker has `console.log` stubs.

Replace stubs with real processors:
- `send_confirmation` → `NotificationService.sendOrderConfirmation()`
- `send_notification` → `NotificationService.pushNotification()`
- `update_inventory` → call `ProductService.updateStock()`
- `process_payment` → call `PaymentService.processPayment()`

**Validation**:
- [ ] Enqueued jobs execute and complete
- [ ] Failed jobs retry with exponential backoff
- [ ] Completed jobs are removed per TTL policy

---

### 2.6 Add Missing Infrastructure to AppModule

**File**: `apps/moringa-backend/src/app.module.ts`

Ensure `InfrastructureModule` is imported (already present). Add:
- `GatewayModule` for Socket.IO
- Ensure `ScheduleModule` cron jobs are registered for:
  - Abandoned cart cleanup
  - Expired pending order cleanup
  - Expired session cleanup

**Validation**:
- [ ] Cron jobs appear in logs at startup
- [ ] Scheduled tasks execute at correct intervals

---

## Acceptance Criteria

- [ ] Email notifications send via SMTP
- [ ] Image uploads work (Cloudinary or local)
- [ ] Socket.IO gateway accepts connections and emits order events
- [ ] RabbitMQ consumers process queued events
- [ ] BullMQ workers execute background jobs
- [ ] All new services are covered by at least 1 passing test

---

## Next Phase

When all acceptance criteria are met, proceed to **`phase-03-backend-completeness.md`**.
