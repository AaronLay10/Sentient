# UI Build-Time Environment Variables

## Overview

The Sentient UI uses **Vite**, which requires environment variables to be **baked into the compiled JavaScript** at build time. This means the URLs cannot be changed at runtime—they must be set during `docker compose build`.

## Required Variables

Add these to `.env.sentient` or `.env.sentient.prod`:

```bash
UI_VITE_API_URL=https://sentientengine.ai/api
UI_VITE_WS_URL=wss://sentientengine.ai/ws
```

## How It Works

1. **Docker Compose** reads `UI_VITE_*` variables from `.env.sentient`
2. Passes them as **build arguments** to the Dockerfile
3. **Vite** embeds them into the compiled JavaScript during build
4. The production nginx container serves the compiled bundle

## Deployment

### Automated (Recommended)
```bash
./deploy.sh
```
The deploy script automatically exports `UI_VITE_*` variables before building.

### Manual Build
```bash
# Export variables first
export $(grep "^UI_VITE_" .env.sentient | xargs)

# Then build
docker compose build sentient-ui
docker compose up -d sentient-ui
```

## Troubleshooting

### Browser Shows "Connection Refused"
**Cause:** Browser cached old JavaScript with `localhost` URLs

**Fix:** Hard refresh on the client browser
- Chrome/Chromium: `Ctrl + Shift + R` or `Ctrl + F5`
- Or: Open DevTools (F12) → Right-click refresh → "Empty Cache and Hard Reload"

### Check Compiled URLs
```bash
# Should show production URLs, not localhost
docker exec sentient_ui grep -o "sentientengine.ai" /usr/share/nginx/html/assets/*.js | head -5
```

### Verify Build Args
```bash
# Check what Docker Compose will use
docker compose config | grep -A2 "VITE_"
```

## Development vs Production

| Environment | API URL | WebSocket URL |
|-------------|---------|---------------|
| **Local Dev** | `http://localhost:3001` | `ws://localhost:3002` |
| **Production** | `https://sentientengine.ai/api` | `wss://sentientengine.ai/ws` |

Use `.env.sentient.local` for development with localhost values.
Use `.env.sentient.prod` for production with domain values.
