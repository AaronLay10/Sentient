#!/bin/bash
# Quick deploy script - run from local machine
# Usage: ./scripts/quick-deploy.sh

set -e

PROD_HOST="192.168.2.3"
PROD_USER="techadmin"

echo "🚀 Quick deploying to $PROD_HOST..."

# Copy necessary files
echo "📤 Copying deployment files..."
scp docker-compose.prod.yml $PROD_USER@$PROD_HOST:~/sentient-deploy/
scp nginx/nginx.conf $PROD_USER@$PROD_HOST:~/sentient-deploy/nginx/
scp nginx/sites/sentient.conf $PROD_USER@$PROD_HOST:~/sentient-deploy/nginx/sites/
scp scripts/deploy-direct.sh $PROD_USER@$PROD_HOST:~/sentient-deploy/

# Make deploy script executable and run it
echo "🎬 Running deployment on server..."
ssh $PROD_USER@$PROD_HOST "chmod +x ~/sentient-deploy/deploy-direct.sh && ~/sentient-deploy/deploy-direct.sh"

echo ""
echo "✨ Deployment complete!"
