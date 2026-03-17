# ── Base ────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ── Builder ─────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── API ─────────────────────────────────────────────────────────────────────────
FROM base AS api
COPY --from=builder /app/dist ./dist
COPY public ./public
RUN mkdir -p logs
ENV NODE_ENV=production
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]

# ── Worker ──────────────────────────────────────────────────────────────────────
FROM base AS worker
COPY --from=builder /app/dist ./dist
RUN mkdir -p logs
ENV NODE_ENV=production
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/workers/trendHunterWorker.js"]
