# =============================================================================
# Moringa Frontend — production image (Qwik City SSR)
#
# Build context: repository root (workspace lockfile lives there)
#   docker build -f apps/moringa-frontend/Dockerfile -t moringa-frontend .
#
# The Qwik City Node adapter produces a self-contained server (dist/server/).
# We run it directly on Node — no nginx layer required.
# =============================================================================

FROM node:24-alpine AS builder
WORKDIR /repo

# Workspace manifests for layer caching
COPY package.json package-lock.json ./
COPY apps/moringa-frontend/package.json apps/moringa-frontend/
COPY libs/sdk/package.json libs/sdk/
COPY libs/shared/package.json libs/shared/
COPY libs/ui/package.json libs/ui/
RUN npm ci --no-audit --no-fund

# TypeScript configs
COPY tsconfig.base.json ./
COPY apps/moringa-frontend/tsconfig.json apps/moringa-frontend/
COPY apps/moringa-frontend/vite.config.ts apps/moringa-frontend/

# Application source
COPY apps/moringa-frontend/src ./apps/moringa-frontend/src
COPY apps/moringa-frontend/public ./apps/moringa-frontend/public
COPY libs/shared/src ./libs/shared/src
COPY libs/ui/src ./libs/ui/src

# Build (client + server bundles land in apps/moringa-frontend/dist)
RUN cd apps/moringa-frontend && npx vite build

# -----------------------------------------------------------------------------
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

RUN addgroup -g 1001 -S nodejs && \
    adduser -S qwik -u 1001

# Production dependencies
# npm ci resolves the full workspace graph — every workspace manifest must
# exist even though only the frontend's production deps are installed.
COPY package.json package-lock.json ./
COPY apps/moringa-frontend/package.json ./apps/moringa-frontend/
COPY apps/moringa-backend/package.json ./apps/moringa-backend/
COPY libs/sdk/package.json ./libs/sdk/
COPY libs/shared/package.json ./libs/shared/
COPY libs/ui/package.json ./libs/ui/
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# Built assets (client + server)
COPY --from=builder /repo/apps/moringa-frontend/dist ./dist

RUN chown -R qwik:nodejs /app
USER qwik

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Qwik City production server (SSR + client assets)
CMD ["node", "dist/entry.server.mjs"]
