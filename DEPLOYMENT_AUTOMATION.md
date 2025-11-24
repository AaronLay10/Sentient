# Sentient Engine - Deployment Automation Guide

This guide covers the automated deployment workflows and scripts for the Sentient Engine.

## Table of Contents

1. [Overview](#overview)
2. [GitHub Actions CI/CD](#github-actions-cicd)
3. [Manual Deployment Scripts](#manual-deployment-scripts)
4. [Rollback & Recovery](#rollback--recovery)
5. [Monitoring & Logs](#monitoring--logs)
6. [Setup Instructions](#setup-instructions)

---

## Overview

The Sentient Engine supports two deployment methods:

1. **Automated CI/CD** via GitHub Actions (recommended)
2. **Manual deployment** via shell scripts

Both methods:
- Build Docker images for all services
- Push images to GitHub Container Registry (GHCR)
- Deploy to production server via SSH
- Run health checks
- Support rollback capabilities

---

## GitHub Actions CI/CD

### Workflow: `deploy-production.yml`

**Location**: `.github/workflows/deploy-production.yml`

**Triggers**:
- Push to `main` branch (automatic)
- Manual workflow dispatch (via GitHub UI)

**Jobs**:

1. **Build and Test**
   - Installs dependencies with pnpm
   - Runs linter (if configured)
   - Runs tests (if configured)
   - Builds shared packages

2. **Build Images**
   - Builds Docker images for all services in parallel
   - Tags images with `latest` and commit SHA
   - Pushes to GitHub Container Registry
   - Uses layer caching for faster builds

3. **Deploy**
   - Connects to production server via SSH
   - Copies deployment files
   - Creates `.env.production` from GitHub Secrets
   - Pulls latest images
   - Runs database migrations
   - Starts all services
   - Runs health checks

4. **Notify on Failure**
   - Logs failure information
   - Can be extended with Slack/Discord notifications

### Required GitHub Secrets

Configure these in your repository settings (`Settings → Secrets and variables → Actions`):

#### Server Access
- `PRODUCTION_HOST` - Server hostname or IP
- `PRODUCTION_USER` - SSH username (e.g., `root`)
- `SSH_PRIVATE_KEY` - SSH private key for server access
- `PRODUCTION_DOMAIN` - Your production domain name

#### Database
- `POSTGRES_USER` - PostgreSQL username (e.g., `sentient`)
- `POSTGRES_PASSWORD` - PostgreSQL password
- `POSTGRES_DB` - Database name (e.g., `sentient_prod`)

#### Services
- `REDIS_PASSWORD` - Redis password
- `JWT_SECRET` - JWT secret key (32+ characters)
- `INTERNAL_REG_TOKEN` - Internal registration token (64+ characters)

### Setup GitHub Actions

1. **Generate SSH Key Pair**:
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/sentient_deploy
   ```

2. **Add Public Key to Server**:
   ```bash
   ssh-copy-id -i ~/.ssh/sentient_deploy.pub user@your-server
   ```

3. **Add Private Key to GitHub Secrets**:
   - Copy the private key content: `cat ~/.ssh/sentient_deploy`
   - Add to GitHub as `SSH_PRIVATE_KEY` secret

4. **Add All Other Secrets** listed above

5. **Push to Main Branch** - deployment will trigger automatically

### Manual Workflow Dispatch

To manually trigger deployment:

1. Go to GitHub repository
2. Click `Actions` tab
3. Select `Deploy to Production` workflow
4. Click `Run workflow`
5. Optionally check "Skip tests" for emergency deploys

### Viewing Deployment Status

- Go to `Actions` tab in GitHub repository
- Click on the latest workflow run
- View logs for each job

---

## Manual Deployment Scripts

### `scripts/deploy.sh`

Full deployment script for manual deployments.

**Usage**:
```bash
# Set environment variables
export PRODUCTION_HOST="your-server.com"
export PRODUCTION_USER="root"
export GHCR_USERNAME="yourgithubuser"
export GITHUB_TOKEN="ghp_your_token_here"
export PRODUCTION_DOMAIN="your-domain.com"

# Run deployment
./scripts/deploy.sh
```

**Options**:
```bash
./scripts/deploy.sh              # Full deployment with build
./scripts/deploy.sh --skip-build # Deploy without rebuilding images
./scripts/deploy.sh --status     # Show deployment status
./scripts/deploy.sh --help       # Show help
```

**What it does**:
1. Checks prerequisites (Docker, SSH, etc.)
2. Tests SSH connection
3. Builds Docker images (optional)
4. Pushes images to GHCR (optional)
5. Prepares production server directories
6. Copies deployment files
7. Deploys services
8. Runs health checks
9. Cleans up old images

**Interactive Prompts**:
- Confirms deployment before proceeding
- Asks whether to build new images
- Shows deployment status at the end

---

## Rollback & Recovery

### `scripts/rollback.sh`

Interactive rollback and recovery script.

**Usage**:
```bash
export PRODUCTION_HOST="your-server.com"
export PRODUCTION_USER="root"

./scripts/rollback.sh
```

**Features**:

1. **Rollback Docker Images**
   - Revert to previous image tag
   - Automatically backs up current state first
   - Pulls specified image version
   - Restarts services

2. **Rollback Database**
   - Lists available database backups
   - Restores from selected backup
   - Backs up current database first
   - Handles service restarts

3. **List Backups**
   - Shows all available database backups
   - Displays file sizes and dates

4. **Show Status**
   - Current service status
   - Recent logs (last 50 lines)

5. **Emergency Stop**
   - Stops all services immediately
   - Use for critical issues

6. **Emergency Restart**
   - Restarts all services
   - Use when services are unresponsive

**Example Rollback Workflow**:
```bash
# Run rollback script
./scripts/rollback.sh

# Select option 1 (Rollback Docker images)
# Enter previous image tag (e.g., main-abc1234)
# Confirm rollback
# Script automatically:
#   - Backs up current database
#   - Updates docker-compose
#   - Pulls old images
#   - Restarts services
```

**Finding Image Tags**:
```bash
# View available tags on GHCR
# Go to: https://github.com/yourusername?tab=packages
# Or use GitHub API:
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/users/yourusername/packages/container/sentient-api/versions
```

---

## Monitoring & Logs

### `scripts/monitor.sh`

Interactive monitoring and log viewer.

**Usage**:
```bash
export PRODUCTION_HOST="your-server.com"
export PRODUCTION_USER="root"

./scripts/monitor.sh
```

**Features**:

1. **Service Status**
   - Shows all container states
   - CPU/Memory usage
   - Uptime

2. **Resource Usage**
   - Docker container stats
   - Disk usage
   - Docker disk usage

3. **View Logs**
   - Select specific service or all services
   - Choose number of lines to display
   - Follow logs in real-time
   - Supports all services including nginx

4. **Health Checks**
   - HTTP/HTTPS endpoints
   - API service
   - Database connection
   - Redis connection
   - MQTT broker

5. **Database Statistics**
   - Database size
   - Table sizes
   - Connection count

6. **MQTT Statistics**
   - Broker stats via `$SYS` topics
   - Active connections
   - Message rates

7. **Recent Errors**
   - Last hour of error logs
   - Filters for "error", "exception", "fail"
   - Helps identify issues quickly

8. **Live Dashboard**
   - Auto-refreshing status view
   - Service health
   - Updates every 5 seconds

9. **Export Metrics**
   - Generates comprehensive report
   - Saves to timestamped file
   - Includes all key metrics

**Example Usage**:
```bash
# Run monitor script
./scripts/monitor.sh

# Select option 3 (View logs)
# Choose service (e.g., api-service)
# Enter number of lines (e.g., 100)
# Follow logs? (y/n)

# Or use live dashboard
# Select option 8
# Press Ctrl+C to exit
```

---

## Setup Instructions

### Initial Setup

1. **Clone Repository**:
   ```bash
   git clone https://github.com/yourusername/sentient.git
   cd sentient
   ```

2. **Configure Environment**:
   ```bash
   cp .env.production.example .env.production
   # Edit .env.production with production values
   ```

3. **Generate Secrets**:
   ```bash
   # JWT Secret
   openssl rand -base64 32

   # Internal Token
   openssl rand -hex 32

   # Database Password
   openssl rand -base64 32

   # Redis Password
   openssl rand -base64 24
   ```

4. **Set Up Server**:
   ```bash
   # Install Docker on server
   curl -fsSL https://get.docker.com | sh

   # Create directory structure
   ssh user@server "sudo mkdir -p /srv/sentient/{data,logs,ssl}"
   ssh user@server "sudo chown -R $USER:$USER /srv/sentient"

   # Copy SSL certificates
   scp your-cert.crt user@server:/srv/sentient/ssl/sentient.crt
   scp your-key.key user@server:/srv/sentient/ssl/sentient.key
   ```

5. **Choose Deployment Method**:
   - **GitHub Actions**: Configure secrets and push to main
   - **Manual**: Run `./scripts/deploy.sh`

### First Deployment

For first-time deployments, follow [DEPLOYMENT.md](DEPLOYMENT.md) for complete setup.

**Quick Start** (if server is already prepared):
```bash
# Via GitHub Actions
git push origin main

# Or manually
export PRODUCTION_HOST="your-server.com"
export GHCR_USERNAME="yourusername"
export GITHUB_TOKEN="ghp_xxx"
./scripts/deploy.sh
```

### Subsequent Deployments

**Automatic** (GitHub Actions):
- Just push to main branch
- Deployment happens automatically

**Manual**:
```bash
# Skip build if images are already pushed
./scripts/deploy.sh --skip-build
```

---

## Troubleshooting

### GitHub Actions Deployment Fails

**Check logs**:
- Go to Actions tab → Failed workflow → View logs

**Common issues**:
1. **SSH Connection Failed**
   - Verify `SSH_PRIVATE_KEY` secret is correct
   - Test: `ssh -i key user@server`

2. **Image Push Failed**
   - Check GHCR permissions
   - Verify `GITHUB_TOKEN` has `write:packages` scope

3. **Health Check Failed**
   - SSH to server and check logs: `docker compose logs`
   - Verify services are running: `docker compose ps`

### Manual Deployment Fails

**SSH Issues**:
```bash
# Test connection
ssh -v user@server

# Check SSH key permissions
chmod 600 ~/.ssh/id_rsa
```

**Docker Build Fails**:
```bash
# Check Docker is running
docker ps

# Try building single service
docker build -f apps/api-service/Dockerfile .
```

**Health Check Fails**:
```bash
# SSH to server
ssh user@server

# Check service logs
cd ~/sentient-deploy
docker compose -f docker-compose.prod.yml logs

# Check container status
docker compose -f docker-compose.prod.yml ps
```

### Service Won't Start

**Check logs**:
```bash
./scripts/monitor.sh
# Select option 3 → View logs
# Select problematic service
```

**Common fixes**:
```bash
# Restart service
ssh user@server "cd ~/sentient-deploy && docker compose -f docker-compose.prod.yml restart service-name"

# Rebuild service
docker compose -f docker-compose.prod.yml up -d --build service-name

# Check environment variables
ssh user@server "cat ~/sentient-deploy/.env.production"
```

### Database Migration Issues

**Manual migration**:
```bash
ssh user@server "cd ~/sentient-deploy && \
  docker compose -f docker-compose.prod.yml exec api-service pnpm prisma:db:push"
```

**Reset and re-migrate** (CAUTION - DATA LOSS):
```bash
# Backup first!
ssh user@server "docker exec sentient_postgres pg_dump -U sentient sentient_prod > backup.sql"

# Reset
ssh user@server "cd ~/sentient-deploy && \
  docker compose -f docker-compose.prod.yml exec api-service pnpm prisma:migrate:reset"
```

---

## Best Practices

### Deployment Strategy

1. **Use Staging First**
   - Test changes in staging environment
   - Run full test suite
   - Verify manually before production

2. **Deploy During Low Traffic**
   - Schedule deployments during off-hours
   - Notify stakeholders

3. **Monitor After Deployment**
   - Watch logs for 30 minutes post-deploy
   - Check error rates
   - Verify all features working

4. **Keep Rollback Plan Ready**
   - Know the previous stable image tag
   - Have database backup
   - Be ready to execute rollback script

### Security

1. **Protect Secrets**
   - Never commit `.env.production`
   - Use GitHub Secrets for CI/CD
   - Rotate secrets regularly

2. **Limit SSH Access**
   - Use SSH keys, not passwords
   - Restrict SSH to specific IPs
   - Use separate deploy key

3. **Review Logs**
   - Check for security events
   - Monitor failed login attempts
   - Watch for unusual traffic patterns

### Maintenance

1. **Regular Backups**
   - Automated daily database backups
   - Test restore process monthly
   - Keep 7 days of backups

2. **Update Dependencies**
   - Update Docker images monthly
   - Apply security patches promptly
   - Test updates in staging first

3. **Monitor Resources**
   - Check disk space weekly
   - Monitor memory usage
   - Clean up old Docker images

---

## Quick Reference

### Environment Variables

```bash
# Required for all scripts
export PRODUCTION_HOST="your-server.com"
export PRODUCTION_USER="root"

# Required for deploy.sh (with build)
export GHCR_USERNAME="yourusername"
export GITHUB_TOKEN="ghp_xxx"
export PRODUCTION_DOMAIN="your-domain.com"
```

### Common Commands

```bash
# Deploy
./scripts/deploy.sh

# Monitor
./scripts/monitor.sh

# Rollback
./scripts/rollback.sh

# Check status
ssh user@server "cd ~/sentient-deploy && docker compose -f docker-compose.prod.yml ps"

# View logs
ssh user@server "cd ~/sentient-deploy && docker compose -f docker-compose.prod.yml logs -f service-name"

# Restart service
ssh user@server "cd ~/sentient-deploy && docker compose -f docker-compose.prod.yml restart service-name"
```

---

## Additional Resources

- [DEPLOYMENT.md](DEPLOYMENT.md) - Full deployment guide
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Deployment checklist
- [SYSTEM_ARCHITECTURE_v4.md](SYSTEM_ARCHITECTURE_v4.md) - System architecture
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

---

**Last Updated**: 2025-11-24
