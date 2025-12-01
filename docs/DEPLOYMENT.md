# Sentient Engine - Production Deployment

## Deployment Model

We use **GitHub for version control only**. Deployment is manual via script:

1. **Mac (development)**: Code → commit → push to GitHub
2. **Server (production)**: git pull → build locally → deploy

No CI/CD, no image registry. All builds happen on the server.

---

## Initial Server Setup (One-Time)

### 1. Prerequisites

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Clone Repository

```bash
# Create deployment directory
sudo mkdir -p /opt/sentient
sudo chown $USER:$USER /opt/sentient
cd /opt/sentient

# Clone from GitHub
git clone git@github.com:AaronLay10/Sentient.git .
```

### 3. Create Data Directories

```bash
sudo mkdir -p /srv/sentient/data/{postgres,redis,mqtt}
sudo mkdir -p /srv/sentient/logs/{nginx,mqtt}
sudo mkdir -p /srv/sentient/ssl
sudo chown -R $USER:$USER /srv/sentient
```

### 4. Configure Environment

```bash
# Copy example and edit
cp .env.production.example .env.production
nano .env.production
```

Generate secrets:
```bash
# JWT Secret
openssl rand -base64 32

# Internal Registration Token
openssl rand -hex 32

# Database password
openssl rand -base64 32

# Redis password
openssl rand -base64 24
```

### 5. SSL Certificates

**Option A: Let's Encrypt (recommended)**
```bash
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /srv/sentient/ssl/sentient.crt
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem /srv/sentient/ssl/sentient.key
```

**Option B: Self-signed (internal only)**
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /srv/sentient/ssl/sentient.key \
  -out /srv/sentient/ssl/sentient.crt \
  -subj "/CN=sentient.local"
```

### 6. Initial Deploy

```bash
cd /opt/sentient
./deploy.sh
```

---

## Regular Deployment

### From Your Mac

```bash
# Commit and push changes
git add .
git commit -m "Your changes"
git push origin main
```

### On the Server

```bash
cd /opt/sentient
./deploy.sh
```

### Deploy Options

```bash
# Full deploy (default)
./deploy.sh

# Skip pnpm install and Docker build (fast restart)
./deploy.sh --skip-build

# Deploy only one service
./deploy.sh --service api-service
```

---

## Quick Commands

```bash
# View service status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f [service]

# Restart a service
docker compose -f docker-compose.prod.yml restart [service]

# Stop all services
docker compose -f docker-compose.prod.yml down

# Rebuild and restart one service
docker compose -f docker-compose.prod.yml build api-service
docker compose -f docker-compose.prod.yml up -d api-service
```

---

## Server Sync Checklist

When setting up a new server or verifying sync:

- [ ] Git remote configured: `git remote -v` shows `git@github.com:AaronLay10/Sentient.git`
- [ ] On correct branch: `git branch` shows `* main`
- [ ] No local changes: `git status` shows clean
- [ ] Environment configured: `.env.production` exists with all secrets
- [ ] Data directories exist: `/srv/sentient/data/{postgres,redis,mqtt}`
- [ ] SSL certificates in place: `/srv/sentient/ssl/sentient.{crt,key}`
- [ ] Deploy script executable: `ls -la deploy.sh` shows `rwx`

### Verify Sync

```bash
# Check git status
git fetch origin
git status

# If behind:
git pull origin main
./deploy.sh
```

---

## Health Checks

```bash
# Check all services
docker compose -f docker-compose.prod.yml ps

# Test nginx
curl http://localhost/health

# Test API
curl http://localhost/api/health

# Test MQTT
mosquitto_pub -h localhost -p 1883 -t "test" -m "ping"
```

---

## Troubleshooting

### Service won't start
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs api-service

# Check if port is in use
sudo lsof -i :3000
```

### Database issues
```bash
# Connect to postgres
docker compose -f docker-compose.prod.yml exec postgres psql -U sentient sentient

# Run migrations manually
docker compose -f docker-compose.prod.yml exec api-service pnpm prisma:db:push
```

### Build fails
```bash
# Clean Docker cache
docker system prune -f
docker builder prune -f

# Rebuild from scratch
docker compose -f docker-compose.prod.yml build --no-cache
```

---

## Backup & Restore

### Create Backup
```bash
# Database
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U sentient sentient > backup_$(date +%Y%m%d).sql

# Redis
docker compose -f docker-compose.prod.yml exec redis \
  redis-cli BGSAVE
```

### Restore Database
```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U sentient sentient < backup_20241124.sql
```

---

**Last Updated**: 2025-11-25
