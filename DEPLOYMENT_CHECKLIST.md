# Sentient Engine - Production Deployment Checklist

Use this checklist when deploying to production. Check off each item as you complete it.

## Pre-Deployment

### Environment Setup
- [ ] Server provisioned with Ubuntu 22.04 LTS
- [ ] Docker Engine 24.0+ installed
- [ ] Docker Compose V2 installed
- [ ] Server has adequate resources (4GB RAM, 20GB disk)
- [ ] Static IP or domain name configured
- [ ] DNS records pointing to server (if using domain)

### Security & Credentials
- [ ] Generated JWT secret (32 chars): `openssl rand -base64 32`
- [ ] Generated internal token (64 chars): `openssl rand -hex 32`
- [ ] Generated database password: `openssl rand -base64 32`
- [ ] Generated Redis password: `openssl rand -base64 24`
- [ ] Copied `.env.production.example` to `.env.production`
- [ ] Updated all `CHANGE_ME_*` values in `.env.production`
- [ ] Updated `DOMAIN` and `GHCR_USERNAME` in `.env.production`
- [ ] Verified `.env.production` is in `.gitignore`

### SSL Certificates
- [ ] SSL certificates obtained (Let's Encrypt or self-signed)
- [ ] Certificates copied to `/srv/sentient/ssl/sentient.crt`
- [ ] Private key copied to `/srv/sentient/ssl/sentient.key`
- [ ] Certificate permissions set (644 for .crt, 600 for .key)

### GitHub Container Registry
- [ ] GitHub Personal Access Token created with `write:packages` scope
- [ ] Logged into GHCR: `docker login ghcr.io`
- [ ] Updated image names in `docker-compose.prod.yml` with your username

## Build & Push

### Build Images
- [ ] Built api-service image
- [ ] Built orchestrator-service image
- [ ] Built mqtt-gateway image
- [ ] Built realtime-gateway image
- [ ] Built sentient-ui image

### Push to Registry
- [ ] Pushed api-service image to GHCR
- [ ] Pushed orchestrator-service image to GHCR
- [ ] Pushed mqtt-gateway image to GHCR
- [ ] Pushed realtime-gateway image to GHCR
- [ ] Pushed sentient-ui image to GHCR

## Server Setup

### File Transfer
- [ ] Created deployment directory: `mkdir -p ~/sentient-deploy`
- [ ] Copied `docker-compose.prod.yml` to server
- [ ] Copied `.env.production` to server
- [ ] Copied `nginx/` directory to server
- [ ] Copied `mosquitto/` directory to server

### Directory Structure
- [ ] Created data directories: `/srv/sentient/data/{postgres,redis,mqtt}`
- [ ] Created log directories: `/srv/sentient/logs/{nginx,mqtt}`
- [ ] Set proper ownership: `chown -R $USER:$USER /srv/sentient`
- [ ] SSL directory exists: `/srv/sentient/ssl/`

## Deployment

### Start Services
- [ ] Pulled images: `docker compose -f docker-compose.prod.yml pull`
- [ ] Started services: `docker compose -f docker-compose.prod.yml up -d`
- [ ] Verified all containers running: `docker compose -f docker-compose.prod.yml ps`
- [ ] Checked for errors in logs: `docker compose -f docker-compose.prod.yml logs`

### Database Initialization
- [ ] Ran database migrations: `docker compose exec api-service pnpm prisma:db:push`
- [ ] Seeded database (optional): `docker compose exec api-service pnpm prisma:seed`
- [ ] Verified database connection

## Verification

### Health Checks
- [ ] HTTP health check passes: `curl http://server/health`
- [ ] HTTPS health check passes: `curl https://domain/health`
- [ ] API health check passes: `curl https://domain/api/health`
- [ ] All services show "healthy" in `docker ps`

### Functionality Tests
- [ ] UI accessible at `https://domain/`
- [ ] Can log in to admin interface
- [ ] Controllers page loads correctly
- [ ] Devices page loads correctly
- [ ] WebSocket connection established (check browser console)
- [ ] MQTT broker accepting connections on port 1883
- [ ] Controller can register via MQTT
- [ ] Device can register via MQTT
- [ ] Real-time updates working in UI

### Security Verification
- [ ] HTTP redirects to HTTPS
- [ ] SSL certificate valid (no browser warnings)
- [ ] Changed default admin password
- [ ] Verified internal services not exposed externally (postgres, redis)
- [ ] MQTT only accessible from local network
- [ ] Redis password authentication working

## Post-Deployment

### Firewall Configuration
- [ ] Opened port 80 (HTTP): `sudo ufw allow 80/tcp`
- [ ] Opened port 443 (HTTPS): `sudo ufw allow 443/tcp`
- [ ] Restricted MQTT to local network: `sudo ufw allow from 192.168.1.0/24 to any port 1883`
- [ ] Restricted MQTT WS to local network: `sudo ufw allow from 192.168.1.0/24 to any port 9001`
- [ ] Firewall enabled: `sudo ufw enable`

### Monitoring Setup
- [ ] Set up container health monitoring cron job
- [ ] Configured log rotation (already in docker-compose)
- [ ] Set up disk space monitoring
- [ ] Configured alert notifications (optional)

### Backup Setup
- [ ] Created backup script at `/usr/local/bin/backup-sentient.sh`
- [ ] Made script executable: `chmod +x /usr/local/bin/backup-sentient.sh`
- [ ] Added backup cron job: `0 2 * * * /usr/local/bin/backup-sentient.sh`
- [ ] Tested backup script manually
- [ ] Verified backup retention (7 days)

### SSL Renewal (Let's Encrypt only)
- [ ] Enabled certbot timer: `sudo systemctl enable certbot.timer`
- [ ] Started certbot timer: `sudo systemctl start certbot.timer`
- [ ] Verified timer status: `sudo systemctl status certbot.timer`

## Documentation

### Operational Docs
- [ ] Documented production credentials in secure password manager
- [ ] Created runbook for common operations
- [ ] Documented emergency contact procedures
- [ ] Noted server IP, domain, and access details
- [ ] Shared deployment info with team (if applicable)

### User Setup
- [ ] Created admin user accounts (if not using seed data)
- [ ] Created tenant accounts
- [ ] Configured rooms and venues
- [ ] Registered initial controllers
- [ ] Tested end-to-end workflow

## Final Verification

### 24-Hour Check
- [ ] All services still running after 24 hours
- [ ] No critical errors in logs
- [ ] Database backups successful
- [ ] Disk space adequate
- [ ] SSL certificate valid

### Load Testing (Optional)
- [ ] Tested with multiple concurrent users
- [ ] Tested MQTT message throughput
- [ ] Verified WebSocket stability under load
- [ ] Checked memory/CPU usage under normal operation

## Rollback Plan

In case of critical issues:

- [ ] Stop services: `docker compose -f docker-compose.prod.yml down`
- [ ] Restore database from backup
- [ ] Roll back to previous image versions
- [ ] Document what went wrong
- [ ] Fix issues and redeploy

---

## Sign-Off

**Deployed by**: _________________

**Date**: _________________

**Server**: _________________

**Domain**: _________________

**Version/Commit**: _________________

**Notes**:
_______________________________________________
_______________________________________________
_______________________________________________

---

**Deployment Status**: ☐ Success ☐ Partial ☐ Rollback Required
