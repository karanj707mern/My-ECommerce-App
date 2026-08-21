# Phase 7: Infrastructure — Docker, CI/CD, Production Hardening

**Objective**: Make the entire stack production-ready with proper containerization, deployment config, CI/CD pipelines, and security hardening.

**Legacy Source**: `Moringa-Backend/Dockerfile`, `Moringa-Backend/docker-compose.yml`, `Moringa-Backend/render.yaml`, `Moringa-Backend/.github/workflows/`  
**Migrated Target**: `apps/moringa-backend/Dockerfile`, `apps/moringa-backend/docker-compose.yml`, `apps/moringa-frontend/Dockerfile`, `.github/workflows/`, `render.yaml`  
**Estimated Effort**: 4–6 hours  
**Dependencies**: Phase 1, 2, 3 complete (backend must be functional)

---

## Tasks

### 7.1 Fix and Harden Dockerfiles

#### Backend Dockerfile

**File**: `apps/moringa-backend/Dockerfile`

Current state: multi-stage build with indentation bug.

Fix and enhance:
```dockerfile
FROM node:24-bookworm AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

FROM node:24-bookworm

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/uploads ./uploads

RUN chown -R node:node /app
USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/v1/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/main.js"]
```

#### Frontend Dockerfile

**File**: Create `apps/moringa-frontend/Dockerfile`

```dockerfile
FROM node:24-bookworm AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

Create `apps/moringa-frontend/nginx.conf`:
```nginx
server {
    listen 3000;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:5000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Validation**:
- [ ] Backend Dockerfile builds without errors
- [ ] Frontend Dockerfile builds without errors
- [ ] Health check passes

---

### 7.2 Update docker-compose.yml

**File**: `apps/moringa-backend/docker-compose.yml`

Current state: only Redis and RabbitMQ. Missing app and postgres.

Update to:
```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: moringa-postgres
    environment:
      POSTGRES_USER: moringa
      POSTGRES_PASSWORD: moringa123
      POSTGRES_DB: moringa
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U moringa"]
      interval: 5s
      timeout: 3s
      retries: 3

  redis:
    image: redis:7-alpine
    container_name: moringa-redis
    ports:
      - "127.0.0.1:6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 3

  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: moringa-rabbitmq
    ports:
      - "127.0.0.1:5672:5672"
      - "127.0.0.1:15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: admin123
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  backend:
    build: ./apps/moringa-backend
    container_name: moringa-backend
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://moringa:moringa123@postgres:5432/moringa
      REDIS_URL: redis://redis:6379
      RABBITMQ_URL: amqp://admin:admin123@rabbitmq:5672/
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    volumes:
      - ./apps/moringa-backend/uploads:/app/uploads

  frontend:
    build: ./apps/moringa-frontend
    container_name: moringa-frontend
    ports:
      - "3000:3000"
    environment:
      API_PUBLIC_URL: http://localhost:5000/api/v1
    depends_on:
      - backend

volumes:
  postgres-data:
  redis-data:
  rabbitmq-data:
```

**Validation**:
- [ ] `docker compose up` starts all services
- [ ] Backend connects to postgres, redis, rabbitmq
- [ ] Frontend proxies API requests to backend

---

### 7.3 Add init.sql

**File**: Create `apps/moringa-backend/init.sql`

Add database initialization:
- Create indexes
- Insert default store settings
- Insert default admin user (if not exists)
- Insert email templates

**Validation**:
- [ ] `docker compose exec postgres psql -U moringa -d moringa -f /init.sql` runs without errors

---

### 7.4 Update render.yaml

**File**: `apps/moringa-backend/render.yaml`

Ensure production deployment config:
- Build command: `npm ci && npx prisma generate && npm run build`
- Start command: `npm run start:prod`
- Health check path: `/api/v1/health`
- Environment variables: DATABASE_URL, REDIS_URL, JWT_SECRET, etc.
- Auto-deploy on push to main

**Validation**:
- [ ] Render deployment succeeds
- [ ] Health check passes
- [ ] All env vars are set in Render dashboard

---

### 7.5 Add CI/CD Workflow

**File**: Create `.github/workflows/ci.yml`

Workflow:
1. Lint backend and frontend
2. Run tests
3. Build Docker images
4. Security scan (npm audit, Snyk if configured)
5. Deploy to Render on main branch

**Validation**:
- [ ] CI passes on PR
- [ ] CI deploys to Render on merge to main

---

### 7.6 Environment Variable Validation

**File**: `apps/moringa-backend/src/config/env.validation.ts`

Add strict validation for all required production env vars:
- `DATABASE_URL` — must be valid PostgreSQL URL with SSL
- `JWT_SECRET` — min 32 characters
- `REDIS_URL` — valid Redis URL
- `RABBITMQ_URL` — valid AMQP URL
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- `ENCRYPTION_KEY` — min 32 characters
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- `CORS_ORIGINS` — comma-separated, no wildcards in production

**Validation**:
- [ ] App fails to start if required env vars are missing
- [ ] Validation errors are clear and actionable

---

### 7.7 Security Hardening

Tasks:
- [ ] Remove all hardcoded secrets from code
- [ ] Ensure `.env` is in `.gitignore`
- [ ] Add `.env.example` with placeholder values
- [ ] Validate CORS origins — no `*` in production
- [ ] Ensure Helmet CSP is strict in production
- [ ] Add `X-Content-Type-Options: nosniff`
- [ ] Enable HSTS in production
- [ ] Add rate limiting to auth endpoints (already present)
- [ ] Ensure passwords are hashed with bcrypt cost >= 10
- [ ] Ensure JWTs have short expiry (15m access, 7d refresh)

**Validation**:
- [ ] Security headers present in responses
- [ ] No secrets in git history (run `git secret` or `truffleHog`)

---

## Acceptance Criteria

- [ ] `docker compose up` starts all services
- [ ] CI pipeline passes
- [ ] Render deployment succeeds
- [ ] All security headers present
- [ ] No hardcoded secrets
- [ ] Health check returns 200

---

## Next Phase

When all acceptance criteria are met, proceed to **`phase-08-tests-polish.md`**.
