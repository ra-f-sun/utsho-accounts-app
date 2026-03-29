# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install ALL dependencies (need devDeps for build)
RUN npm ci

# Copy prisma schema and config
COPY prisma ./prisma
COPY prisma.config.ts ./

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src

# Build NestJS
RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files and install production deps only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy Prisma files (needed for migrations at runtime)
COPY prisma ./prisma
COPY prisma.config.ts ./

# Copy generated Prisma Client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built application
COPY --from=builder /app/dist ./dist

# Don't run as root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

# Run migrations then start — exec replaces sh so node receives signals
CMD ["/bin/sh", "-c", "npx prisma migrate deploy && exec node dist/main"]
