FROM node:24-alpine AS builder
WORKDIR /app

RUN npm install -g @nestjs/cli

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

COPY package.json package-lock.json ./
RUN npm ci --production && \
    npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

RUN mkdir -p /app/uploads && \
    chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 5000
CMD ["node", "dist/main"]
