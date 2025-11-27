# Multi-stage build for production-ready Sentient UI
FROM node:22-alpine AS base

# Allow overriding API/WS endpoints at build time (defaults fall back to production)
ARG VITE_API_URL=https://sentientengine.ai/api
ARG VITE_WS_URL=wss://sentientengine.ai/ws

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate

# Set working directory
WORKDIR /app

# Copy root package files and workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all package.json files for workspace
COPY packages ./packages
COPY apps/sentient-ui ./apps/sentient-ui

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared packages first
RUN pnpm -r --filter "@sentient/*" build

# Build Sentient UI with the provided endpoints
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL}
RUN pnpm -r --filter sentient-ui build

# Production stage with nginx
FROM nginx:alpine AS production

# Copy custom nginx config
COPY apps/sentient-ui/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from base stage
COPY --from=base /app/apps/sentient-ui/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
