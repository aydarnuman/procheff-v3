# Procheff v3 - Production Dockerfile
# Multi-stage build for optimized image size

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build Next.js application
# Set build-time environment variables to prevent DB initialization
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PHASE=phase-production-build
ENV SKIP_BUILD_DB_INIT=true
ENV NODE_ENV=production
ENV ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-sk-default}
ENV GOOGLE_API_KEY=${GOOGLE_API_KEY:-sk-default}
ENV ANTHROPIC_MODEL=claude-sonnet-4-20250514

# Create dummy database file for build if needed
RUN mkdir -p /tmp && touch /tmp/build.db

# Run build
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    fontconfig \
    ttf-dejavu

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Create data directory (for logs and cache)
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# Environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"
# Note: DATABASE_URL will be set by docker-compose for PostgreSQL

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 8080

# Health check with longer timeout for DB connection
HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "server.js"]
