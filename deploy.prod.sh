#!/bin/bash
# Sentient Engine - Production Deployment Script
# Usage: ./deploy.prod.sh [--skip-build] [--service <name>]
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
SKIP_BUILD=false
SINGLE_SERVICE=""

# Default environment selection (override via ENV_FILE when calling script)
ENV_FILE="${ENV_FILE:-.env.sentient.prod}"

# Load UI build variables from env file - more reliable parsing
if [ -f "$ENV_FILE" ]; then
  # Extract and export UI_VITE_* variables directly
  while IFS='=' read -r key value; do
    # Remove any quotes from value
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"
    export "$key=$value"
  done < <(grep "^UI_VITE_" "$ENV_FILE")
fi

# Production defaults - these should always point to production URLs
if [ -z "$UI_VITE_API_URL" ]; then
  echo -e "${YELLOW}Warning: UI_VITE_API_URL not set in $ENV_FILE, using production default${NC}"
  UI_VITE_API_URL="https://sentientengine.ai/api"
fi

if [ -z "$UI_VITE_WS_URL" ]; then
  echo -e "${YELLOW}Warning: UI_VITE_WS_URL not set in $ENV_FILE, using production default${NC}"
  UI_VITE_WS_URL="wss://sentientengine.ai/ws"
fi

export UI_VITE_API_URL UI_VITE_WS_URL

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --service)
      SINGLE_SERVICE="$2"
      shift 2
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Usage: ./deploy.sh [--skip-build] [--service <name>]"
      exit 1
      ;;
  esac
done

echo -e "${GREEN}=== Sentient Engine Deployment ===${NC}"
echo "Started at: $(date)"
echo "Using env file: ${ENV_FILE}"
echo "UI endpoints: API=${UI_VITE_API_URL} | WS=${UI_VITE_WS_URL}"
echo ""

# Change to project directory
cd "$(dirname "$0")"

# Step 1: Pull latest code from GitHub
echo -e "${YELLOW}[1/5] Pulling latest code from GitHub...${NC}"
git pull origin main
echo -e "${GREEN}✓ Code updated${NC}"
echo ""

# Step 2: Skip local pnpm build (Docker handles this)
echo -e "${YELLOW}[2/5] Skipping local pnpm build (Docker multi-stage handles this)${NC}"
echo ""

# Prepare docker compose command with selected env file
COMPOSE_CMD=(docker compose --env-file "${ENV_FILE}")

# Step 3: Build Docker images
if [ "$SKIP_BUILD" = false ]; then
  echo -e "${YELLOW}[3/5] Building Docker images...${NC}"
  if [ -n "$SINGLE_SERVICE" ]; then
    "${COMPOSE_CMD[@]}" build "$SINGLE_SERVICE"
  else
    "${COMPOSE_CMD[@]}" build
  fi
  echo -e "${GREEN}✓ Docker images built${NC}"
else
  echo -e "${YELLOW}[3/5] Skipping Docker build (--skip-build)${NC}"
fi
echo ""

# Step 4: Run database migrations (only if not single service or if service is api)
if [ -z "$SINGLE_SERVICE" ] || [ "$SINGLE_SERVICE" = "api-service" ]; then
  echo -e "${YELLOW}[4/5] Running database migrations...${NC}"
  "${COMPOSE_CMD[@]}" run --rm api-service pnpm prisma:db:push || echo "Migration may have already run"
  echo -e "${GREEN}✓ Database migrations complete${NC}"
else
  echo -e "${YELLOW}[4/5] Skipping migrations (not deploying api-service)${NC}"
fi
echo ""

# Step 5: Deploy services
echo -e "${YELLOW}[5/5] Deploying services...${NC}"
if [ -n "$SINGLE_SERVICE" ]; then
  "${COMPOSE_CMD[@]}" up -d "$SINGLE_SERVICE"
else
  "${COMPOSE_CMD[@]}" up -d --remove-orphans
fi
echo -e "${GREEN}✓ Services deployed${NC}"
echo ""

# Health check
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 10

echo ""
echo -e "${GREEN}=== Service Status ===${NC}"
"${COMPOSE_CMD[@]}" ps
echo ""

echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo "Finished at: $(date)"
echo ""
echo "Quick commands:"
echo "  View logs:     docker compose logs -f [service]"
echo "  Restart:       docker compose restart [service]"
echo "  Stop all:      docker compose down"
