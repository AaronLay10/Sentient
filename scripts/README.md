# Sentient Engine - Utility Scripts

Utility scripts for monitoring and managing the Sentient Engine in production.

## Deployment

**Production:** [`deploy.sh`](../deploy.sh)

```bash
# On the server
cd /opt/sentient
./deploy.sh                      # Full deploy
./deploy.sh --skip-build         # Skip pnpm install and Docker build
./deploy.sh --service api-service # Deploy single service
```

**Local convenience:** [`deploy.local.sh`](../deploy.local.sh)

```bash
# From repo root
./deploy.local.sh                       # Build + start default local stack
./deploy.local.sh --skip-build          # Reuse existing images
./deploy.local.sh --service sentient-ui # Only bring up the UI container
```

## Monitoring

### [`monitor.sh`](./monitor.sh)

Interactive dashboard for monitoring services and viewing logs.

```bash
./scripts/monitor.sh
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

## Recovery

### [`rollback.sh`](./rollback.sh)

Interactive menu for rollback and recovery operations.

```bash
./scripts/rollback.sh
```

**Features**:

- Rollback to previous Docker image
- Restore database from backup
- Emergency stop/restart
- List available backups

## Quick Reference

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f [service]

# Restart service
docker compose -f docker-compose.prod.yml restart [service]

# Check status
docker compose -f docker-compose.prod.yml ps

# Enter container shell
docker compose -f docker-compose.prod.yml exec api-service sh

# Database access
docker compose -f docker-compose.prod.yml exec postgres psql -U sentient sentient
```

## See Also

- [`deploy.local.sh`](../deploy.local.sh) - Local stack helper honoring `.env.sentient.local`
- [DEPLOYMENT.md](../DEPLOYMENT.md) - Complete deployment guide
- [Sentient_Engine_Deployment_Guide.md](../Sentient_Engine_Deployment_Guide.md) - Server setup guide
