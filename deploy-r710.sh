#!/bin/bash
set -e

echo "=========================================="
echo "Sentient Engine R710 Deployment Script"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on R710
if [ "$(hostname)" != "sentient" ]; then
    echo -e "${RED}This script should be run on the R710 server (hostname: sentient)${NC}"
    echo "Current hostname: $(hostname)"
    echo ""
    echo "To deploy, run:"
    echo "  scp deploy-r710.sh techadmin@192.168.2.3:~/"
    echo "  ssh techadmin@192.168.2.3"
    echo "  chmod +x deploy-r710.sh"
    echo "  ./deploy-r710.sh"
    exit 1
fi

echo -e "${GREEN}✓ Running on R710${NC}"
echo ""

# Step 1: Install Docker
echo "Step 1: Installing Docker..."
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg lsb-release apt-transport-https software-properties-common

    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker.gpg

    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

    sudo usermod -aG docker $USER
    sudo systemctl enable docker
    sudo systemctl start docker

    echo -e "${GREEN}✓ Docker installed${NC}"
else
    echo -e "${GREEN}✓ Docker already installed${NC}"
fi

docker --version
echo ""

# Step 2: Install Git
echo "Step 2: Installing Git..."
if ! command -v git &> /dev/null; then
    sudo apt-get install -y git
    echo -e "${GREEN}✓ Git installed${NC}"
else
    echo -e "${GREEN}✓ Git already installed${NC}"
fi
echo ""

# Step 3: Clone Repository
echo "Step 3: Cloning repository..."
if [ ! -d "/opt/sentient" ]; then
    sudo mkdir -p /opt/sentient
    sudo chown $USER:$USER /opt/sentient
fi

cd /opt/sentient

if [ -d ".git" ]; then
    echo "Repository exists, pulling latest..."
    git pull
else
    echo "Cloning repository..."
    git clone https://github.com/AaronLay10/snere_rewrite.git .
fi

echo -e "${GREEN}✓ Repository ready${NC}"
echo ""

# Step 4: Create .env file
echo "Step 4: Creating .env file..."
if [ ! -f ".env" ]; then
    echo "Creating production .env..."
    cat > .env << 'EOF'
POSTGRES_USER=postgres
POSTGRES_PASSWORD=sentient_prod_2024
POSTGRES_DB=sentient_prod
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
DATABASE_URL=postgres://postgres:sentient_prod_2024@postgres:5432/sentient_prod

REDIS_URL=redis://redis:6379

MQTT_USERNAME=sentient_prod
MQTT_PASSWORD=mqtt_prod_2024

NEXT_PUBLIC_API_URL=http://192.168.2.3:3001
NEXT_PUBLIC_WS_URL=ws://192.168.2.3:3002

JWT_SECRET=$(openssl rand -base64 32)
INTERNAL_REG_TOKEN=$(openssl rand -base64 32)
EOF
    echo -e "${GREEN}✓ .env created${NC}"
else
    echo -e "${YELLOW}⚠ .env already exists, skipping${NC}"
fi
echo ""

# Step 5: Build Docker images
echo "Step 5: Building Docker images..."
docker compose build api-service
echo -e "${GREEN}✓ Images built${NC}"
echo ""

# Step 6: Start services
echo "Step 6: Starting services..."
docker compose up -d
echo -e "${GREEN}✓ Services started${NC}"
echo ""

# Step 7: Wait for services to be healthy
echo "Step 7: Waiting for services to be ready..."
sleep 15

# Check API health
echo "Checking API service..."
if docker ps | grep -q "sentient_api.*Up"; then
    echo -e "${GREEN}✓ API service running${NC}"
else
    echo -e "${RED}✗ API service not running${NC}"
    echo "Logs:"
    docker logs sentient_api --tail=30
    exit 1
fi
echo ""

# Step 8: Seed database
echo "Step 8: Seeding database..."

# Extract room_id that exists in database or create known structure
docker exec sentient_postgres psql -U postgres sentient_prod -c "
INSERT INTO \"Tenant\" (id, name, created_at)
VALUES ('tenant_paragon', 'Paragon Escape Games', NOW())
ON CONFLICT (name) DO NOTHING;
" 2>/dev/null || echo "Tenant may already exist"

docker exec sentient_postgres psql -U postgres sentient_prod -c "
INSERT INTO \"Venue\" (id, \"tenantId\", name, created_at)
SELECT 'venue_mesa', id, 'Mesa', NOW()
FROM \"Tenant\"
WHERE name = 'Paragon Escape Games'
ON CONFLICT (\"tenantId\", name) DO NOTHING;
" 2>/dev/null || echo "Venue may already exist"

docker exec sentient_postgres psql -U postgres sentient_prod -c "
INSERT INTO \"Room\" (id, \"tenantId\", \"venueId\", name, created_at)
SELECT 'room_clockwork', v.\"tenantId\", v.id, 'clockwork', NOW()
FROM \"Venue\" v
WHERE v.name = 'Mesa'
ON CONFLICT (\"venueId\", name) DO NOTHING;
" 2>/dev/null || echo "Room may already exist"

echo -e "${GREEN}✓ Database seeded${NC}"
echo ""

# Step 9: Test registration endpoint
echo "Step 9: Testing controller registration..."
INTERNAL_TOKEN=$(grep INTERNAL_REG_TOKEN .env | cut -d '=' -f2)

RESPONSE=$(curl -s -X POST 'http://localhost:3001/internal/controllers/register' \
  -H 'Content-Type: application/json' \
  -H "x-internal-token: $INTERNAL_TOKEN" \
  -d '{"controller_id":"deploy_test","room_id":"room_clockwork","controller_type":"test","friendly_name":"Deployment Test"}')

if echo "$RESPONSE" | grep -q "registered"; then
    echo -e "${GREEN}✓ Registration endpoint working${NC}"
    echo "Response: $RESPONSE"
else
    echo -e "${RED}✗ Registration failed${NC}"
    echo "Response: $RESPONSE"
fi
echo ""

# Final status
echo "=========================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "=========================================="
echo ""
echo "Services running:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "Access points:"
echo "  API:  http://192.168.2.3:3001"
echo "  MQTT: mqtt://192.168.2.3:1883"
echo ""
echo "Room ID for controller registration: room_clockwork"
echo ""
echo "To view logs:"
echo "  docker logs sentient_api -f"
echo ""
echo "To restart services:"
echo "  cd /opt/sentient && docker compose restart"
echo ""
