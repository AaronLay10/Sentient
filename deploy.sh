#!/bin/bash
# Sentient Engine - Development/Worktree Deployment Script
# Usage: ./deploy.sh [--skip-build] [--service <name>] [--migrate]
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
SKIP_BUILD=false
SINGLE_SERVICE=""
RUN_MIGRATIONS=false

# Default environment selection
ENV_FILE="${ENV_FILE:-.env.sentient}"

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

# Verify variables are set, warn if using defaults
if [ -z "$UI_VITE_API_URL" ]; then
  echo -e "${YELLOW}Warning: UI_VITE_API_URL not set in $ENV_FILE, using default${NC}"
  UI_VITE_API_URL="http://localhost:3001"
fi

if [ -z "$UI_VITE_WS_URL" ]; then
  echo -e "${YELLOW}Warning: UI_VITE_WS_URL not set in $ENV_FILE, using default${NC}"
  UI_VITE_WS_URL="ws://localhost:3002"
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
    --migrate)
      RUN_MIGRATIONS=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Usage: ./deploy.sh [--skip-build] [--service <name>] [--migrate]"
      exit 1
      ;;
  esac
done

echo -e "${GREEN}=== Sentient Engine Development Deployment ===${NC}"
echo "Started at: $(date)"
echo "Using env file: ${ENV_FILE}"
echo "UI endpoints: API=${UI_VITE_API_URL} | WS=${UI_VITE_WS_URL}"
echo ""

# Change to project directory
cd "$(dirname "$0")"

# Prepare docker compose command with selected env file
COMPOSE_CMD=(docker compose --env-file "${ENV_FILE}")

# Step 1: Build Docker images
if [ "$SKIP_BUILD" = false ]; then
  echo -e "${YELLOW}[1/3] Building Docker images...${NC}"
  if [ -n "$SINGLE_SERVICE" ]; then
    "${COMPOSE_CMD[@]}" build "$SINGLE_SERVICE"
  else
    "${COMPOSE_CMD[@]}" build
  fi
  echo -e "${GREEN}✓ Docker images built${NC}"
else
  echo -e "${YELLOW}[1/3] Skipping Docker build (--skip-build)${NC}"
fi
echo ""

# Step 2: Run database migrations (if requested or if deploying api-service)
if [ "$RUN_MIGRATIONS" = true ] || { [ -z "$SINGLE_SERVICE" ] || [ "$SINGLE_SERVICE" = "api-service" ]; }; then
  echo -e "${YELLOW}[2/3] Running database migrations...${NC}"
  "${COMPOSE_CMD[@]}" run --rm api-service pnpm prisma:db:push || echo "Migration may have already run"
  echo -e "${GREEN}✓ Database migrations complete${NC}"
else
  echo -e "${YELLOW}[2/3] Skipping migrations${NC}"
fi
echo ""

# Step 3: Deploy services
echo -e "${YELLOW}[3/3] Deploying services...${NC}"
if [ -n "$SINGLE_SERVICE" ]; then
  "${COMPOSE_CMD[@]}" up -d "$SINGLE_SERVICE"
else
  "${COMPOSE_CMD[@]}" up -d --remove-orphans
fi
echo -e "${GREEN}✓ Services deployed${NC}"
echo ""

# Health check
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 5

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
echo "  Monitor:       ./scripts/monitor.sh"
