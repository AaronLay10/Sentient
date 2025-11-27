#!/bin/bash
# Sentient Engine - Local Developer Convenience Script
# Usage examples:
#   ./deploy.local.sh                           # build + start default local stack
#   ./deploy.local.sh --skip-build              # reuse existing images
#   ./deploy.local.sh --service sentient-ui     # only build/start the UI
#   ./deploy.local.sh --service postgres --service redis --skip-build
#   ENV_FILE=.env.sentient.local ./deploy.local.sh --migrate

set -euo pipefail

SKIP_BUILD=false
RUN_MIGRATIONS=false
SERVICES=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --service)
      if [[ -z "${2:-}" ]]; then
        echo "--service requires a value" >&2
        exit 1
      fi
      SERVICES+=("$2")
      shift 2
      ;;
    --migrate)
      RUN_MIGRATIONS=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [--skip-build] [--service <name>] [--migrate]"
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# Defaults for local development (override via ENV_FILE / UI_VITE_* env vars)
ENV_FILE="${ENV_FILE:-.env.sentient.local}"
UI_VITE_API_URL="${UI_VITE_API_URL:-http://localhost:3001}"
UI_VITE_WS_URL="${UI_VITE_WS_URL:-ws://localhost:3002}"
export UI_VITE_API_URL UI_VITE_WS_URL

DEFAULT_SERVICES=(postgres redis api-service orchestrator-service mqtt-gateway realtime-gateway sentient-ui)
if [[ ${#SERVICES[@]} -eq 0 ]]; then
  SERVICES=("${DEFAULT_SERVICES[@]}")
fi

COMPOSE_CMD=(docker compose --env-file "$ENV_FILE" -f docker-compose.yml -f docker-compose.dev.yml)

printf '\n🚀 Local deploy (env file: %s)\n' "$ENV_FILE"
printf '   API URL: %s\n' "$UI_VITE_API_URL"
printf '   WS  URL: %s\n\n' "$UI_VITE_WS_URL"

if [[ "$SKIP_BUILD" == false ]]; then
  echo "[1/3] Building images: ${SERVICES[*]}"
  "${COMPOSE_CMD[@]}" build "${SERVICES[@]}"
else
  echo "[1/3] Skipping docker build (--skip-build)"
fi

if [[ "$RUN_MIGRATIONS" == true ]]; then
  echo "[2/3] Running prisma db push"
  "${COMPOSE_CMD[@]}" run --rm api-service pnpm prisma:db:push || echo "Prisma push may have already run"
else
  echo "[2/3] Skipping migrations"
fi

echo "[3/3] Starting services: ${SERVICES[*]}"
"${COMPOSE_CMD[@]}" up -d "${SERVICES[@]}"

printf '\nServices now running. View logs with: docker compose logs -f <service>\n'
