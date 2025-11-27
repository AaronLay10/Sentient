# Multi-stage build for production-ready API service
FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

# Set working directory
WORKDIR /app

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy api-service package
COPY apps/api-service/package.json ./apps/api-service/

# Install dependencies for the workspace (api-service + root)
RUN pnpm install --no-frozen-lockfile --recursive

# Copy api-service source
COPY apps/api-service ./apps/api-service

# Generate Prisma client
WORKDIR /app/apps/api-service
RUN pnpm prisma:generate

# Build the application
RUN pnpm build

# Production stage
FROM node:22-alpine AS production

# Install OpenSSL 3 for Prisma
RUN apk add --no-cache openssl

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api-service/package.json ./apps/api-service/

# Copy api-service source for Prisma schema
COPY --from=base /app/apps/api-service/prisma ./apps/api-service/prisma

# Install ALL dependencies (need prisma cli for migrations)
RUN pnpm install --no-frozen-lockfile --recursive

WORKDIR /app/apps/api-service

# Generate Prisma client
RUN pnpm prisma:generate

# Copy built application
COPY --from=base /app/apps/api-service/dist ./dist

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["pnpm", "start:prod"]