FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/orchestrator-service ./apps/orchestrator-service
RUN pnpm install --frozen-lockfile
RUN pnpm -r --filter "@sentient/*" build
RUN pnpm -r --filter orchestrator-service build

FROM base AS production
WORKDIR /app
ENV NODE_ENV=production
ENV CI=true
COPY --from=build /app/package.json ./
COPY --from=build /app/pnpm-lock.yaml ./
COPY --from=build /app/pnpm-workspace.yaml ./
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/orchestrator-service/dist ./apps/orchestrator-service/dist
COPY --from=build /app/apps/orchestrator-service/package.json ./apps/orchestrator-service/
RUN pnpm install --prod --frozen-lockfile
CMD ["node", "apps/orchestrator-service/dist/main.js"]
