# Sentient Engine - Claude Code Context

## Project Overview

**Sentient Engine** is a theatrical control and orchestration platform for escape rooms and interactive environments. It coordinates hardware controllers, devices, game logic, and provides real-time monitoring and control interfaces.

## Architecture Summary

```
Hardware Layer          Messaging Layer         Core Services           Data Layer
─────────────────      ─────────────────       ─────────────────       ─────────────────
Teensy 4.1             MQTT Broker             API Service             PostgreSQL
Raspberry Pi      ───► (sentientengine.ai)  ──► (NestJS/Prisma)    ◄──► (source of truth)
ESP32                  Redis Pub/Sub           Orchestrator            Redis
Physical Devices       (domain events)         MQTT Gateway            (cache/pubsub)
                                               Realtime Gateway
                                               Sentient UI (React)
```

## Repository Structure

```
Sentient/
├── apps/
│   ├── api-service/           # NestJS REST API, Prisma ORM
│   ├── orchestrator-service/  # Game logic engine
│   ├── mqtt-gateway/          # MQTT ↔ Redis translation
│   ├── realtime-gateway/      # WebSocket server
│   ├── sentient-ui/           # React/Vite admin & GM console
│   └── device-simulators/     # Mock controllers for testing
├── packages/
│   ├── shared-types/          # TypeScript interfaces
│   ├── shared-messaging/      # MQTT/Redis channel helpers
│   ├── core-domain/           # EventType enum, entities
│   ├── shared-config/         # Environment helpers
│   └── shared-logging/        # Winston logging utilities
├── hardware/
│   └── Controller Code Teensy/ # Teensy firmware projects
├── docker-compose.yml
├── .env.sentient              # Environment config (gitignored)
└── SYSTEM_ARCHITECTURE_v4.md  # Canonical architecture doc
```

## Domain Model

**Hierarchy:** Client → Venue → Room → Controller → Device

- **Client**: Customer organization (e.g., Paragon Escape Games)
- **Venue**: Physical location (e.g., Paragon-Mesa)
- **Room**: Escape room instance
- **Controller**: Networked compute unit (Teensy, Pi, ESP32, PC)
- **Device**: Hardware endpoint (relay, sensor, maglock, light, motor)
- **Puzzle**: Logical gameplay unit spanning devices
- **Scene**: Grouping of puzzles and effects
- **GameSession**: Single room run-through

## Critical Conventions

### Naming: snake_case Everywhere
- Database columns: `controller_id`, `device_type`, `created_at`
- MQTT topics: `paragon/clockwork/commands/...`
- API JSON fields: `{ "device_id": "...", "room_id": "..." }`
- Config files and identifiers

### MQTT Topic Structure (Category-First)
```
<tenant>/<room_id>/<category>/<controller_id>/<device_id>/<action>

Categories:
- commands/   → Commands TO controllers
- sensors/    → Sensor data FROM controllers
- status/     → Controller heartbeats, connection state
- acknowledgement/ → Command execution confirmations

Examples:
paragon/clockwork/commands/power_control_upper_right/main_lighting_24v/power_on
paragon/clockwork/sensors/power_control_upper_right/main_lighting_24v/state
paragon/clockwork/status/power_control_upper_right/heartbeat
```

### Redis Channels
```typescript
REDIS_CHANNELS = {
  DOMAIN_EVENTS: 'sentient:events:domain',      // All domain events
  DEVICE_COMMANDS: 'sentient:commands:device',  // Commands to devices
  STATUS_REQUEST: 'sentient:commands:status_request'
}
```

### EventType Enum (packages/core-domain)
Always import, never redefine:
- `DEVICE_STATE_CHANGED`
- `CONTROLLER_HEARTBEAT`
- `CONTROLLER_ONLINE` / `CONTROLLER_OFFLINE`
- `PUZZLE_SOLVED`
- `SCENE_ADVANCED`

## Data Flow Patterns

### Sensor → UI (Telemetry)
```
Controller → MQTT (sensors/*) → MQTT Gateway → Redis (domain events)
→ Orchestrator (game logic) → Redis → Realtime Gateway → WebSocket → UI
```

### UI → Device (Commands)
```
UI → API Service → Redis (commands:device) → MQTT Gateway
→ MQTT (commands/*) → Controller → Device
```

### Controller Registration
```
Controller boots → MQTT (sentient/system/register/controller)
→ MQTT Gateway → API (POST /internal/controllers/register) → PostgreSQL
```

## Development Commands

```bash
# Install dependencies (run at repo root)
pnpm install

# Build shared packages (required before services can import them)
pnpm -r build

# Run all services in dev mode
pnpm -r dev

# Run single service
pnpm --filter api-service dev
pnpm --filter sentient-ui dev

# Docker operations
docker compose up -d                    # Start all containers
docker compose logs -f <service>        # View service logs
docker compose down                     # Stop all containers

# Database operations
pnpm --filter api-service prisma:migrate:dev
pnpm --filter api-service prisma:db:push

# Deployment
./deploy.local.sh                       # Local deployment
./deploy.local.sh --skip-build          # Skip build step
./deploy.local.sh --service api-service # Single service
```

## Environment Variables

Required in `.env.sentient`:
```
DATABASE_URL=postgres://...
REDIS_URL=redis://...
MQTT_URL=mqtt://sentientengine.ai:1883
MQTT_USERNAME=...
MQTT_PASSWORD=...
INTERNAL_REG_TOKEN=...
API_PORT=3001
WS_PORT=3002
JWT_SECRET=...
```

## Service Ports

| Service | Port | Protocol |
|---------|------|----------|
| API Service | 3001 | HTTP |
| Realtime Gateway | 3002 | WebSocket |
| PostgreSQL | 5432 | SQL |
| Redis | 6379 | Redis |
| MQTT Broker | 1883 | MQTT |

## Debugging Workflow

1. **Capture logs**: `docker compose logs -f <service>` or `scripts/monitor.sh`
2. **Trace pipeline**: Controller → MQTT → Gateway → Redis → Orchestrator → UI
3. **Validate at each hop**:
   - MQTT: `mqtt sub -t 'sentient/#'`
   - Redis: `redis-cli MONITOR | grep sentient:events:domain`
   - DB: `docker exec -it sentient_postgres psql -U postgres -d sentient`
4. **Test UI updates**: `redis-cli PUBLISH sentient:events:domain '{...}'`

## UI Architecture (sentient-ui)

- **Framework**: React 19 + Vite 7 + TypeScript
- **State**: TanStack React Query v5
- **Scene Editor**: React Flow v12
- **Icons**: Lucide React
- **Styling**: CSS Modules with glass morphism, cyan/orange theme

### Key Pages
- `/network` - Network topology visualization
- `/overview` - System health dashboard
- `/power-control` - Power controller management
- `/scenes` - Visual scene editor
- `/controllers`, `/devices` - Hardware management
- `/rooms`, `/clients`, `/users` - Configuration

## Hardware Controllers

### Teensy 4.1 Firmware Pattern
```cpp
void loop() {
  loop_hardware();    // Scan inputs, update outputs
  loop_mqtt();        // MQTT connection, publish/subscribe
  loop_diagnostics(); // Health reporting, watchdog
}
```

### Command Acknowledgement Flow
1. Controller receives command on `commands/<controller>/<device>/<action>`
2. Executes physical action
3. Publishes acknowledgement to `acknowledgement/<controller>/<device>/<action>`
4. MQTT Gateway converts to domain event → UI updates

## Key Files to Reference

- `SYSTEM_ARCHITECTURE_v4.md` - Canonical architecture documentation
- `SENTIENT_DATA_FLOW.md` - Detailed message flow diagrams
- `apps/api-service/prisma/schema.prisma` - Database schema
- `packages/shared-messaging/src/` - MQTT/Redis helpers
- `packages/core-domain/src/` - EventType enum, domain entities

## Design Principles

1. **Hardware-dumb, Software-smart**: Controllers are I/O modules; all game logic is centralized
2. **Single Source of Truth**: PostgreSQL for persistent state
3. **Event-Driven Real-Time**: MQTT for hardware, WebSockets for UI, Redis for service communication
4. **Strong Boundaries**: Clear separation between IO, game logic, API, and UI
5. **Safety First**: Maglocks fail-safe, dedicated safety flows

## Common Patterns

### Adding a New Device Type
1. Define device properties in `packages/shared-types`
2. Add device registration handling in `mqtt-gateway`
3. Update Prisma schema if needed
4. Add UI controls in `sentient-ui`

### Adding a New Scene Node
1. Define node type in `packages/shared-types`
2. Add node component in `apps/sentient-ui/src/components/SceneEditor/`
3. Register in node palette
4. Implement execution logic in Orchestrator

### Cross-Service Changes
Before modifying: EventType enum, MQTT topics, Redis channels
- Understand impact across ALL services
- Update shared packages first
- Rebuild packages before testing services
