FROM node:24-alpine AS builder
WORKDIR /app

RUN npm install -g @nestjs/cli

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 5000
CMD ["node", "dist/main"]
