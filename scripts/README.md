# Sentient Engine - Deployment Scripts

This directory contains automation scripts for deploying, monitoring, and managing the Sentient Engine in production.

## Scripts Overview

### 🚀 [`deploy.sh`](./deploy.sh)
**Full deployment automation script**

Builds Docker images, pushes to registry, and deploys to production server.

```bash
export PRODUCTION_HOST="your-server.com"
export GHCR_USERNAME="yourusername"
export GITHUB_TOKEN="ghp_xxx"
./deploy.sh
```

**Options**:
- `./deploy.sh` - Full deployment with build
- `./deploy.sh --skip-build` - Deploy without building
- `./deploy.sh --status` - Show deployment status
- `./deploy.sh --help` - Show help

### ↩️ [`rollback.sh`](./rollback.sh)
**Rollback and recovery script**

Interactive menu for rolling back deployments or restoring from backups.

```bash
export PRODUCTION_HOST="your-server.com"
./rollback.sh
```

**Features**:
- Rollback to previous Docker image version
- Restore database from backup
- Emergency stop/restart
- List available backups
- Show current status

### 📊 [`monitor.sh`](./monitor.sh)
**Monitoring and log viewer**

Interactive dashboard for monitoring services and viewing logs.

```bash
export PRODUCTION_HOST="your-server.com"
./monitor.sh
```

**Features**:
- View service status
- Monitor resource usage
- View logs (with filtering)
- Run health checks
- Database statistics
- MQTT statistics
- Recent error logs
- Live auto-refresh dashboard
- Export metrics report

## Quick Start

### Prerequisites

1. **Local Machine**:
   - Docker installed
   - SSH access to production server
   - GitHub token with `write:packages` scope

2. **Production Server**:
   - Docker and Docker Compose installed
   - SSH key authentication configured
   - Directory structure created (`/srv/sentient`)

### First Deployment

1. **Set environment variables**:
   ```bash
   export PRODUCTION_HOST="your-server.com"
   export PRODUCTION_USER="root"
   export GHCR_USERNAME="yourgithubuser"
   export GITHUB_TOKEN="ghp_your_token"
   export PRODUCTION_DOMAIN="your-domain.com"
   ```

2. **Run deployment**:
   ```bash
   ./deploy.sh
   ```

3. **Monitor deployment**:
   ```bash
   ./monitor.sh
   # Select option 8 for live dashboard
   ```

### Subsequent Deployments

**If using GitHub Actions** (recommended):
- Just push to main branch
- Deployment happens automatically

**If deploying manually**:
```bash
# Quick deploy (images already built)
./deploy.sh --skip-build

# Or full deployment with rebuild
./deploy.sh
```

## Common Workflows

### Deploy New Version

```bash
# 1. Build and push images
export PRODUCTION_HOST="server.com"
export GHCR_USERNAME="username"
export GITHUB_TOKEN="token"
./deploy.sh

# 2. Monitor health
./monitor.sh
# Select option 4 (Health checks)

# 3. Check logs for errors
./monitor.sh
# Select option 7 (Recent errors)
```

### Rollback After Failed Deploy

```bash
# 1. Run rollback script
./rollback.sh

# 2. Select option 1 (Rollback Docker images)

# 3. Enter previous image tag (e.g., main-abc1234)

# 4. Confirm rollback

# 5. Verify status
./monitor.sh
# Select option 1 (Service status)
```

### Investigate Production Issue

```bash
# 1. Check service status
./monitor.sh
# Select option 1

# 2. View recent errors
./monitor.sh
# Select option 7

# 3. View specific service logs
./monitor.sh
# Select option 3
# Choose problematic service
# Follow logs in real-time

# 4. Check resource usage
./monitor.sh
# Select option 2

# 5. Export metrics for analysis
./monitor.sh
# Select option 9
```

### Emergency Response

```bash
# Quick stop all services
./rollback.sh
# Select option 5 (Emergency stop)

# Or restart all services
./rollback.sh
# Select option 6 (Emergency restart)

# Check status
./deploy.sh --status
```

## Environment Variables

### Required for All Scripts
```bash
PRODUCTION_HOST      # Server hostname or IP
PRODUCTION_USER      # SSH username (default: root)
```

### Required for deploy.sh (with build)
```bash
GHCR_USERNAME        # GitHub Container Registry username
GITHUB_TOKEN         # GitHub personal access token
PRODUCTION_DOMAIN    # Production domain name
```

### Optional
```bash
DEPLOY_DIR          # Remote deploy directory (default: ~/sentient-deploy)
BACKUP_DIR          # Backup directory (default: /srv/sentient/backups)
```

## Saving Environment Variables

Create a `.env.deploy` file (add to `.gitignore`):

```bash
# .env.deploy
export PRODUCTION_HOST="sentient.example.com"
export PRODUCTION_USER="deploy"
export GHCR_USERNAME="yourusername"
export GITHUB_TOKEN="ghp_xxxxxxxxxxxx"
export PRODUCTION_DOMAIN="sentient.example.com"
```

Then source before running scripts:
```bash
source .env.deploy
./deploy.sh
```

## Troubleshooting

### SSH Connection Failed

```bash
# Test SSH connection
ssh -v $PRODUCTION_USER@$PRODUCTION_HOST

# Check SSH key permissions
chmod 600 ~/.ssh/id_rsa

# Add SSH key to agent
ssh-add ~/.ssh/id_rsa
```

### Docker Build Failed

```bash
# Check Docker is running
docker ps

# Try building single service
cd /path/to/sentient
docker build -f apps/api-service/Dockerfile .

# Check for syntax errors
docker compose -f docker-compose.prod.yml config
```

### Health Check Failed

```bash
# SSH to server and check manually
ssh $PRODUCTION_USER@$PRODUCTION_HOST
cd ~/sentient-deploy
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs api-service
curl http://localhost/health
```

### Service Won't Start

```bash
# View logs
./monitor.sh
# Select option 3 → problematic service

# Check environment variables on server
ssh $PRODUCTION_USER@$PRODUCTION_HOST "cat ~/sentient-deploy/.env.production"

# Try manual restart
ssh $PRODUCTION_USER@$PRODUCTION_HOST "cd ~/sentient-deploy && docker compose -f docker-compose.prod.yml restart service-name"
```

## Best Practices

1. **Test in Staging First**
   - Always test deployments in staging environment
   - Never deploy untested code to production

2. **Monitor After Deployment**
   - Use `monitor.sh` live dashboard for 30 minutes post-deploy
   - Watch for errors and resource spikes

3. **Keep Rollback Ready**
   - Note the current image tag before deploying
   - Have `rollback.sh` ready in another terminal

4. **Regular Backups**
   - Database backups run automatically daily
   - Test restore process monthly

5. **Secure Your Tokens**
   - Never commit tokens to git
   - Use `.env.deploy` file (in `.gitignore`)
   - Rotate tokens regularly

## Additional Documentation

- [DEPLOYMENT.md](../DEPLOYMENT.md) - Complete deployment guide
- [DEPLOYMENT_AUTOMATION.md](../DEPLOYMENT_AUTOMATION.md) - Automation details
- [DEPLOYMENT_CHECKLIST.md](../DEPLOYMENT_CHECKLIST.md) - Deployment checklist

## Getting Help

If scripts fail or you encounter issues:

1. Run with bash debug mode: `bash -x ./script.sh`
2. Check the script's internal comments
3. Review logs on production server
4. Check GitHub Actions logs (if using CI/CD)

---

**Note**: All scripts require SSH key-based authentication to the production server. Password authentication is not supported.
