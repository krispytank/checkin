# ── Stage 1: Build client ─────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files for workspace resolution
COPY package.json package-lock.json* ./
COPY client/package.json client/
COPY server/package.json server/

# Install all dependencies (including dev for build)
RUN npm install

# Copy client source and build
COPY client/ client/
RUN npm run build:client

# ── Stage 2: Production ───────────────────────────────────
FROM node:20-alpine AS production

# Security: run as non-root user
RUN addgroup -g 1001 -S mahakama && \
    adduser -S mahakama -u 1001

WORKDIR /app

# Copy server package files and install production deps only
COPY server/package.json server/
RUN cd server && npm install --omit=dev && npm cache clean --force

# Copy server source
COPY server/src/ server/src/

# Copy built client from builder stage
COPY --from=builder /app/client/dist/ client/dist/

# Copy VERSION file
COPY VERSION .

# Create uploads directory with proper permissions
RUN mkdir -p server/uploads && chown -R mahakama:mahakama /app

USER mahakama

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server/src/index.js"]
