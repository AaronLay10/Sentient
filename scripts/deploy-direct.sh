#!/bin/bash
# Direct deployment script for Sentient Engine
# Run this on the production server directly

set -e  # Exit on error

echo "🚀 Starting Sentient Engine deployment..."

# Navigate to deployment directory
cd ~/sentient-deploy || { echo "❌ Deployment directory not found"; exit 1; }

# Stop and remove all containers
echo "🛑 Stopping existing containers..."
sudo docker compose --env-file .env.production -f docker-compose.prod.yml down 2>/dev/null || true

# Pull latest images
echo "🐳 Pulling latest Docker images..."
sudo docker compose --env-file .env.production -f docker-compose.prod.yml pull

# Clean Postgres data if needed (comment out if you want to preserve data)
# echo "🗑️  Cleaning Postgres data..."
# sudo rm -rf /srv/sentient/data/postgres/*

# Ensure data directories exist with correct permissions
echo "📁 Preparing data directories..."
sudo mkdir -p /srv/sentient/data/postgres /srv/sentient/data/redis /srv/sentient/logs/mqtt /srv/sentient/logs/nginx
sudo chown -R 999:999 /srv/sentient/data/postgres
sudo chmod -R 755 /srv/sentient/data

# Start infrastructure services first
echo "⚡ Starting infrastructure services..."
sudo docker compose --env-file .env.production -f docker-compose.prod.yml up -d postgres redis mqtt

# Wait for Postgres to be ready
echo "⏳ Waiting for PostgreSQL..."
for i in {1..30}; do
  if sudo docker exec sentient_postgres pg_isready -U sentient 2>/dev/null; then
    echo "✅ PostgreSQL is ready!"
    break
  fi
  echo "   Attempt $i: waiting..."
  sleep 2
done

# Start all services
echo "🚀 Starting all services..."
sudo docker compose --env-file .env.production -f docker-compose.prod.yml up -d

# Wait a moment for services to start
sleep 10

# Check service health
echo "🏥 Checking service health..."
sudo docker ps

# Test health endpoint
echo ""
echo "🔍 Testing health endpoint..."
if curl -sf http://localhost/health > /dev/null; then
  echo "✅ Health check passed!"
else
  echo "⚠️  Health check failed"
fi

if curl -sf http://localhost/api/health > /dev/null; then
  echo "✅ API health check passed!"
else
  echo "⚠️  API health check failed"
fi

echo ""
echo "✨ Deployment complete!"
echo ""
echo "📊 Service Status:"
sudo docker compose --env-file .env.production -f docker-compose.prod.yml ps
echo ""
echo "🌐 Application should be available at: http://sentientengine.ai"
echo ""
echo "📝 To view logs, run: sudo docker logs <container-name>"
echo "📝 To seed database, run: sudo docker exec -it sentient_api pnpm seed"
