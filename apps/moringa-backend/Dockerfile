# =============================================================================
# Moringa Backend — production image
#
# Build context MUST be the repository root (workspace lockfile lives there):
#   docker build -f apps/moringa-backend/Dockerfile -t moringa-backend .
#
# Prisma 7 notes:
#   - `prisma generate` emits the client into apps/moringa-backend/src/generated/prisma
#     which nest build then compiles into dist — no postinstall magic required.
#   - The driver adapter (@prisma/adapter-pg) uses node-postgres; no engine
#     binaries are downloaded, so alpine works out of the box.
#   - prisma/schema.prisma is shipped at runtime: PrismaService scans it to
#     determine which models have soft-delete columns.
# =============================================================================

FROM node:24-alpine AS builder
WORKDIR /repo

# Workspace manifests first for maximal layer caching.
# npm ci requires every package.json matched by the root "workspaces" globs
# (apps/*, libs/*) to exist, so copy them all before installing.
COPY package.json package-lock.json ./
COPY apps/moringa-backend/package.json apps/moringa-backend/package-lock.json* apps/moringa-backend/
COPY apps/moringa-frontend/package.json apps/moringa-frontend/
COPY libs/sdk/package.json libs/sdk/
COPY libs/shared/package.json libs/shared/
COPY libs/ui/package.json libs/ui/
RUN npm ci --no-audit --no-fund

# Prisma schema early — generate before source copy so the generated client
# is cached independently of application code changes
COPY apps/moringa-backend/prisma ./apps/moringa-backend/prisma
COPY apps/moringa-backend/prisma.config.ts ./apps/moringa-backend/
RUN cd apps/moringa-backend && npx prisma generate

# TypeScript project references / configs required by nest build
COPY tsconfig.base.json ./
COPY apps/moringa-backend/nest-cli.json apps/moringa-backend/tsconfig.json \
     apps/moringa-backend/tsconfig.build.json apps/moringa-backend/

# Application source
COPY apps/moringa-backend/src ./apps/moringa-backend/src

# Compile (dist lands in apps/moringa-backend/dist)
RUN cd apps/moringa-backend && npx nest build

# -----------------------------------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /repo
ENV NPM_CONFIG_LOGLEVEL=warn

COPY package.json package-lock.json ./
COPY apps/moringa-backend/package.json apps/moringa-backend/
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# -----------------------------------------------------------------------------
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=5000

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Production dependency tree (hoisted workspace layout)
COPY --from=deps /repo/node_modules ./node_modules
# npm nests conflicting versions under the workspace folder — merge them in
COPY --from=deps /repo/apps/moringa-backend/node_modules ./node_modules

# Compiled application + Prisma assets required at runtime
COPY --from=builder /repo/apps/moringa-backend/dist ./dist
COPY --from=builder /repo/apps/moringa-backend/prisma/schema.prisma ./prisma/schema.prisma
COPY apps/moringa-backend/package.json ./

RUN mkdir -p /app/uploads && \
    chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
