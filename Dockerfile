# Multi-stage production build for ShaadiSaathi (Node 24 with native node:sqlite)
FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies first for Docker caching
COPY package*.json ./
RUN npm ci

# Copy full source and build production Vite PWA bundle
COPY . .
RUN npm run build

# --- Production Runner Stage ---
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3001 \
    DATABASE_PATH=/data/shaadisaathi.db \
    UPLOADS_DIR=/data/uploads/documents

# Install curl/wget for healthcheck
RUN apk add --no-cache wget

# Copy package descriptors and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled frontend assets from builder
COPY --from=builder /app/dist ./dist

# Copy backend TypeScript services and schemas (executed with native node / tsx)
COPY server ./server

# Create persistent storage volume directory
RUN mkdir -p /data/uploads/documents && chown -R node:node /app /data

USER node

VOLUME ["/data"]

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/setup/status || exit 1

CMD ["npx", "tsx", "server/index.ts"]
