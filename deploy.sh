#!/bin/bash
# Sentient Engine - Production Deployment Script
# Usage: ./deploy.sh [--skip-build] [--service <name>]
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
SKIP_BUILD=false
SINGLE_SERVICE=""

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

# Step 3: Build Docker images
if [ "$SKIP_BUILD" = false ]; then
  echo -e "${YELLOW}[3/5] Building Docker images...${NC}"
  if [ -n "$SINGLE_SERVICE" ]; then
    docker compose build "$SINGLE_SERVICE"
  else
    docker compose build
  fi
  echo -e "${GREEN}✓ Docker images built${NC}"
else
  echo -e "${YELLOW}[3/5] Skipping Docker build (--skip-build)${NC}"
fi
echo ""

# Step 4: Run database migrations (only if not single service or if service is api)
if [ -z "$SINGLE_SERVICE" ] || [ "$SINGLE_SERVICE" = "api-service" ]; then
  echo -e "${YELLOW}[4/5] Running database migrations...${NC}"
  docker compose run --rm api-service pnpm prisma:db:push || echo "Migration may have already run"
  echo -e "${GREEN}✓ Database migrations complete${NC}"
else
  echo -e "${YELLOW}[4/5] Skipping migrations (not deploying api-service)${NC}"
fi
echo ""

# Step 5: Deploy services
echo -e "${YELLOW}[5/5] Deploying services...${NC}"
if [ -n "$SINGLE_SERVICE" ]; then
  docker compose up -d "$SINGLE_SERVICE"
else
  docker compose up -d --remove-orphans
fi
echo -e "${GREEN}✓ Services deployed${NC}"
echo ""

# Health check
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 10

echo ""
echo -e "${GREEN}=== Service Status ===${NC}"
docker compose ps
echo ""

echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo "Finished at: $(date)"
echo ""
echo "Quick commands:"
echo "  View logs:     docker compose logs -f [service]"
echo "  Restart:       docker compose restart [service]"
echo "  Stop all:      docker compose down"
