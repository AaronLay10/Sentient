# Sentient Engine - Production Deployment Guide

This guide covers deploying the Sentient Engine to a production server.

## Prerequisites

### Server Requirements
- Ubuntu 22.04 LTS or similar Linux distribution
- Docker Engine 24.0+ and Docker Compose V2
- 4GB+ RAM recommended
- 20GB+ disk space
- Static IP address or domain name
- Ports 80, 443 (HTTPS), 1883 (MQTT), 9001 (MQTT WebSocket)

### Local Requirements
- Docker and Docker Compose
- Access to GitHub Container Registry (GHCR) or Docker Hub
- SSH access to production server

## Pre-Deployment Checklist

- [ ] Server provisioned with Docker installed
- [ ] Domain name configured (if using SSL)
- [ ] SSL certificates obtained (Let's Encrypt or commercial)
- [ ] GitHub Container Registry access configured
- [ ] Production secrets generated (see below)
- [ ] Backup strategy planned

## Step 1: Generate Production Secrets

Generate secure secrets for production:

```bash
# JWT Secret (32 characters)
openssl rand -base64 32

# Internal Registration Token (64 hex characters)
openssl rand -hex 32

# Database password
openssl rand -base64 32

# Redis password
openssl rand -base64 24
```

## Step 2: Configure Environment

1. Copy the example environment file:
```bash
cp .env.production.example .env.production
```

2. Edit `.env.production` and replace ALL `CHANGE_ME_*` values with the secrets generated above.

3. Update the `DOMAIN` and `GHCR_USERNAME` values with your actual values.

**CRITICAL**: Never commit `.env.production` to version control!

## Step 3: Prepare SSL Certificates

### Option A: Let's Encrypt (Recommended)

On the production server:

```bash
# Install certbot
sudo apt install certbot

# Generate certificates
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates to deployment location
sudo mkdir -p /srv/sentient/ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /srv/sentient/ssl/sentient.crt
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem /srv/sentient/ssl/sentient.key
sudo chmod 644 /srv/sentient/ssl/sentient.crt
sudo chmod 600 /srv/sentient/ssl/sentient.key
```

### Option B: Self-Signed (Development/Internal Only)

```bash
# On production server
sudo mkdir -p /srv/sentient/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /srv/sentient/ssl/sentient.key \
  -out /srv/sentient/ssl/sentient.crt \
  -subj "/CN=sentient.local"
sudo chmod 644 /srv/sentient/ssl/sentient.crt
sudo chmod 600 /srv/sentient/ssl/sentient.key
```

## Step 4: Build Production Images

Build all services locally:

```bash
# Build API Service
docker build -f apps/api-service/Dockerfile -t ghcr.io/yourusername/sentient-api:latest .

# Build Orchestrator Service
docker build -f apps/orchestrator-service/Dockerfile -t ghcr.io/yourusername/sentient-orchestrator:latest .

# Build MQTT Gateway
docker build -f apps/mqtt-gateway/Dockerfile -t ghcr.io/yourusername/sentient-mqtt-gateway:latest .

# Build Realtime Gateway
docker build -f apps/realtime-gateway/Dockerfile -t ghcr.io/yourusername/sentient-realtime:latest .

# Build Sentient UI
docker build -f apps/sentient-ui/Dockerfile -t ghcr.io/yourusername/sentient-ui:latest .
```

**Note**: Replace `yourusername` with your actual GitHub username or organization.

## Step 5: Push Images to Registry

```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u yourusername --password-stdin

# Push all images
docker push ghcr.io/yourusername/sentient-api:latest
docker push ghcr.io/yourusername/sentient-orchestrator:latest
docker push ghcr.io/yourusername/sentient-mqtt-gateway:latest
docker push ghcr.io/yourusername/sentient-realtime:latest
docker push ghcr.io/yourusername/sentient-ui:latest
```

## Step 6: Deploy to Production Server

### Copy Files to Server

```bash
# Create deployment directory on server
ssh user@your-server "mkdir -p ~/sentient-deploy"

# Copy necessary files
scp docker-compose.prod.yml user@your-server:~/sentient-deploy/
scp .env.production user@your-server:~/sentient-deploy/
scp -r nginx user@your-server:~/sentient-deploy/
scp -r mosquitto user@your-server:~/sentient-deploy/
```

### Create Data Directories

On the production server:

```bash
sudo mkdir -p /srv/sentient/data/{postgres,redis,mqtt}
sudo mkdir -p /srv/sentient/logs/{nginx,mqtt}
sudo chown -R $USER:$USER /srv/sentient
```

### Start Services

```bash
cd ~/sentient-deploy

# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Start services
docker compose -f docker-compose.prod.yml up -d

# Check service status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

## Step 7: Initialize Database

On first deployment, initialize the database:

```bash
# Run Prisma migrations
docker compose -f docker-compose.prod.yml exec api-service pnpm prisma:db:push

# Optional: Seed with initial data
docker compose -f docker-compose.prod.yml exec api-service pnpm prisma:seed
```

## Step 8: Verify Deployment

### Health Checks

```bash
# Check nginx
curl http://your-server/health

# Check API service
curl http://your-server/api/health

# Check HTTPS
curl https://your-domain.com/health
```

### Access UI

Open your browser to `https://your-domain.com`

Default login (if using seed data):
- Email: `admin@sentient.local`
- Password: `admin123` (CHANGE IMMEDIATELY)

### Test MQTT Connectivity

From a controller or test client:

```bash
# Test MQTT connection
mosquitto_pub -h your-server -p 1883 -t "sentient/system/test" -m '{"test": true}'
```

## Step 9: Configure Firewall

```bash
# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow MQTT (adjust IP range for your network)
sudo ufw allow from 192.168.1.0/24 to any port 1883
sudo ufw allow from 192.168.1.0/24 to any port 9001

# Enable firewall if not already enabled
sudo ufw enable
```

## Post-Deployment

### Set Up Automatic Updates

Create a systemd service for automatic certificate renewal:

```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### Set Up Monitoring

Monitor container health:

```bash
# Add to crontab
*/5 * * * * cd ~/sentient-deploy && docker compose -f docker-compose.prod.yml ps | grep -q "Up" || docker compose -f docker-compose.prod.yml up -d
```

### Set Up Backups

Create a backup script:

```bash
#!/bin/bash
# /usr/local/bin/backup-sentient.sh

BACKUP_DIR="/srv/sentient/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker exec sentient_postgres pg_dump -U sentient sentient_prod > $BACKUP_DIR/sentient_db_$DATE.sql

# Backup Redis
docker exec sentient_redis redis-cli --rdb /data/dump_$DATE.rdb

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
```

Add to crontab:
```bash
0 2 * * * /usr/local/bin/backup-sentient.sh
```

## Troubleshooting

### Check Service Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f api-service
```

### Restart Services

```bash
# Restart all
docker compose -f docker-compose.prod.yml restart

# Restart specific service
docker compose -f docker-compose.prod.yml restart api-service
```

### Check Database Connection

```bash
docker compose -f docker-compose.prod.yml exec api-service pnpm prisma db pull
```

### Clear Redis Cache

```bash
docker compose -f docker-compose.prod.yml exec redis redis-cli FLUSHALL
```

## Updates and Maintenance

### Update to New Version

```bash
# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Restart services with new images
docker compose -f docker-compose.prod.yml up -d

# Run any new migrations
docker compose -f docker-compose.prod.yml exec api-service pnpm prisma:db:push
```

### Scale Services (if needed)

```bash
# Scale orchestrator for high load
docker compose -f docker-compose.prod.yml up -d --scale orchestrator-service=3
```

## Security Recommendations

1. **Change default credentials immediately** after first login
2. **Restrict MQTT access** to your local network only
3. **Enable Redis AUTH** (already configured in docker-compose.prod.yml)
4. **Use strong passwords** for all services
5. **Keep Docker and services updated** regularly
6. **Monitor logs** for suspicious activity
7. **Set up fail2ban** for SSH protection
8. **Use firewall rules** to restrict access

## Emergency Procedures

### Service Down

```bash
docker compose -f docker-compose.prod.yml up -d
```

### Database Corruption

```bash
# Stop services
docker compose -f docker-compose.prod.yml down

# Restore from backup
docker exec sentient_postgres psql -U sentient -d sentient_prod < /srv/sentient/backups/sentient_db_YYYYMMDD_HHMMSS.sql

# Restart
docker compose -f docker-compose.prod.yml up -d
```

### Complete System Failure

```bash
# Stop everything
docker compose -f docker-compose.prod.yml down -v

# Remove all containers and volumes (DATA LOSS!)
docker system prune -a --volumes

# Redeploy from scratch (follow deployment steps)
```

## Support

For issues or questions:
- Check logs first: `docker compose logs`
- Review [SYSTEM_ARCHITECTURE_v4.md](SYSTEM_ARCHITECTURE_v4.md)
- Contact system administrator

---

**Last Updated**: 2025-11-24
