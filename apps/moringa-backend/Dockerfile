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

# `npm ci` does NOT run the root "prepare" lifecycle script, so ts-patch must
# be applied explicitly BEFORE any compilation — Nestia/Typia AOT transforms
# ride on the patched compiler everywhere (nest CLI included).
RUN npx ts-patch install -s

# Prisma schema early — generate before source copy so the generated client
# is cached independently of application code changes
COPY apps/moringa-backend/prisma ./apps/moringa-backend/prisma
COPY apps/moringa-backend/prisma.config.ts ./apps/moringa-backend/
RUN cd apps/moringa-backend && npx prisma generate

# TypeScript project references / configs required by nest build
COPY tsconfig.base.json ./
COPY apps/moringa-backend/nest-cli.json apps/moringa-backend/tsconfig.json \
     apps/moringa-backend/tsconfig.build.json apps/moringa-backend/

# Application source + post-build alias fixer
COPY apps/moringa-backend/src ./apps/moringa-backend/src
COPY apps/moringa-backend/scripts ./apps/moringa-backend/scripts

# Compile through the patched compiler (canonical production build), then
# rewrite surviving path aliases into relative requires. Skipping the fixer
# yields a container that crashes on its first aliased require().
RUN cd apps/moringa-backend && \
    npx tsc -p tsconfig.build.json && \
    node scripts/fix-dist-aliases.cjs

# -----------------------------------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /repo
ENV NPM_CONFIG_LOGLEVEL=warn

# npm ci resolves the full workspace graph — every workspace manifest must
# exist even though only the backend's production deps are installed.
COPY package.json package-lock.json ./
COPY apps/moringa-backend/package.json apps/moringa-backend/
COPY apps/moringa-frontend/package.json apps/moringa-frontend/
COPY libs/sdk/package.json libs/sdk/
COPY libs/shared/package.json libs/shared/
COPY libs/ui/package.json libs/ui/
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# -----------------------------------------------------------------------------
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=5000

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Production dependency tree (hoisted workspace layout — with the fastify
# override all packages dedupe to the root tree, so no nested merge needed)
COPY --from=deps /repo/node_modules ./node_modules

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
