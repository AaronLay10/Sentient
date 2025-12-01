# Sentient Engine

**Theatrical Control Platform for Escape Rooms**

Sentient Engine is a comprehensive, event-driven control system that orchestrates hardware devices (Teensy 4.1, Raspberry Pi, ESP32), sensors, actuators, lighting, and audio for immersive escape room experiences. Built on a hardware-dumb/software-smart architecture where all game logic lives centrally while edge devices remain simple and stateless.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** ≥22
- **pnpm** ≥10
- **Docker** & Docker Compose
- **Git**

### Local Development

```bash
# Clone repository
git clone https://github.com/AaronLay10/Sentient.git
cd Sentient

# Install dependencies
pnpm install

# Start local development stack
./deploy.local.sh

# Or start specific services
./deploy.local.sh --service sentient-ui --skip-build
```

### Production Deployment

```bash
# On production server
./deploy.prod.sh

# Deploy single service
./deploy.prod.sh --service api-service
```

---

## 📚 Documentation

### Core Architecture
- **[SYSTEM_ARCHITECTURE_v4.md](docs/SYSTEM_ARCHITECTURE_v4.md)** - Complete system architecture, design decisions, component boundaries
- **[SENTIENT_DATA_FLOW.md](docs/SENTIENT_DATA_FLOW.md)** - Event flows, MQTT topics, Redis channels, WebSocket broadcasts
- **[BRANDING.md](docs/BRANDING.md)** - Brand guidelines, Sentient Eye design, color palette, UI components

### Deployment & Operations
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Production deployment workflows and procedures
- **[Sentient_Engine_Deployment_Guide.md](docs/Sentient_Engine_Deployment_Guide.md)** - Complete server setup guide (Ubuntu, Docker, networking)
- **[Mac_Studio_Sentient_Setup_Guide.md](docs/Mac_Studio_Sentient_Setup_Guide.md)** - Local development environment setup

### UI & Frontend
- **[UI_PAGES.md](docs/UI_PAGES.md)** - Complete UI page specifications, routes, components
- **[UI_Tasks_and_Procedures.md](docs/UI_Tasks_and_Procedures.md)** - Operational procedures and user workflows
- **[Sentient_Admin_Topology_Dashboard_Spec.md](docs/Sentient_Admin_Topology_Dashboard_Spec.md)** - Network topology dashboard specifications

### Performance & Optimization
- **[Performance_Enhancements.md](docs/Performance_Enhancements.md)** - Performance analysis, optimization strategies, metrics

### Developer Guides
- **[CLAUDE.md](docs/CLAUDE.md)** - Quick reference for AI coding agents
- **[docs/UI_BUILD_VARIABLES.md](docs/UI_BUILD_VARIABLES.md)** - Vite environment configuration

---

## 🏗️ Repository Structure

```
Sentient/
├── apps/                          # Service applications (monorepo)
│   ├── api-service/               # NestJS REST API + Prisma ORM
│   ├── orchestrator-service/      # Game logic & session management
│   ├── mqtt-gateway/              # MQTT ↔ Redis bridge
│   ├── realtime-gateway/          # WebSocket server for UI
│   ├── sentient-ui/               # Vite + React admin console
│   └── device-simulators/         # Hardware simulators for testing
├── packages/                      # Shared libraries
│   ├── core-domain/               # Domain entities & enums
│   ├── shared-config/             # Environment configuration
│   ├── shared-logging/            # Winston logging utilities
│   ├── shared-messaging/          # MQTT & Redis helpers
│   └── shared-types/              # Shared TypeScript interfaces
├── hardware/                      # Firmware & hardware docs
│   ├── Controller Code Teensy/    # Teensy 4.1 firmware projects
│   ├── Custom Libraries/          # Arduino libraries
│   ├── Raspberry Pis/             # Pi launchers & scripts
│   └── HEX_OUTPUT/                # Compiled firmware binaries
├── docs/                          # Documentation (this is the place!)
├── scripts/                       # Deployment & monitoring utilities
├── diagrams/                      # Mermaid diagram sources
├── nginx/                         # Reverse proxy configuration
├── mosquitto/                     # MQTT broker config
└── docker-compose.yml             # Unified Docker orchestration
```

---

## 🔧 Key Technologies

- **Backend:** Node.js, NestJS, Prisma ORM, PostgreSQL, Redis
- **Frontend:** React, Vite, TanStack Query, Recharts
- **Messaging:** MQTT (Mosquitto), Redis Pub/Sub, WebSocket
- **Hardware:** Teensy 4.1, Raspberry Pi, ESP32, Arduino
- **Infrastructure:** Docker, Docker Compose, nginx, Ubuntu Server

---

## 🎮 Services Overview

| Service | Port | Purpose |
|---------|------|---------|
| **api-service** | 3001 | REST API for configuration & authentication |
| **orchestrator-service** | - | Game session orchestration & logic |
| **mqtt-gateway** | 3003 | MQTT ↔ Redis event normalization |
| **realtime-gateway** | 3002 | WebSocket server for real-time UI updates |
| **sentient-ui** | 3000 | Admin console & game master interface |
| **postgres** | 5432 | PostgreSQL database |
| **redis** | 6379 | Pub/sub & session state |
| **mqtt** | 1883 | Mosquitto MQTT broker |
| **nginx** | 80/443 | Reverse proxy & SSL termination |

---

## 📦 Monorepo Management

```bash
# Install all dependencies
pnpm install

# Build all packages
pnpm -r build

# Run all services in dev mode
pnpm -r dev

# Target specific service
pnpm --filter api-service dev
pnpm --filter sentient-ui dev

# Run database migrations
pnpm --filter api-service prisma:migrate:dev
```

---

## 🔌 Hardware Integration

Sentient Engine supports multiple controller types:
- **Teensy 4.1** - Primary controllers for high-speed I/O
- **Raspberry Pi 4** - Media playback, touchscreen interfaces
- **ESP32** - WiFi-enabled sensors & actuators

See [`hardware/`](hardware/) for firmware, compilation guides, and hardware specifications.

---

## 🛠️ Utility Scripts

- **[`deploy.local.sh`](deploy.local.sh)** - Local development deployment
- **[`deploy.prod.sh`](deploy.prod.sh)** - Production deployment
- **[`scripts/monitor.sh`](scripts/monitor.sh)** - Interactive monitoring dashboard
- **[`scripts/rollback.sh`](scripts/rollback.sh)** - Rollback & recovery utilities

---

## 🌐 MQTT Topics & Events

Controllers communicate via MQTT topics following the pattern:

```
sentient/<room>/<category>/<controller>/<device>/<action>
```

**Examples:**
- `sentient/mesa/status/door_control_1/maglock_1/state` - Device state updates
- `sentient/mesa/commands/door_control_1/maglock_1/unlock` - Device commands
- `sentient/system/register/controller` - Controller registration
- `sentient/system/register/device` - Device registration

See [SENTIENT_DATA_FLOW.md](docs/SENTIENT_DATA_FLOW.md) for complete topic structure and event flows.

---

## 🎨 Branding

**Sentient Eye** - The animated neural eye logo serves as both branding and a real-time system health indicator.

**Color Palette:**
- Primary Cyan: `#00d9ff`
- Primary Orange: `#ffa832`
- Dark Background: `#1a2332`
- Accent Purple: `#8b5cf6`

See [BRANDING.md](docs/BRANDING.md) for complete brand guidelines.

---

## 🔒 Environment Configuration

Required environment variables:

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/sentient
REDIS_URL=redis://localhost:6379
MQTT_URL=mqtt://sentientengine.ai:1883
MQTT_USERNAME=paragon_devices
MQTT_PASSWORD=<secure-password>
INTERNAL_REG_TOKEN=<registration-token>
JWT_SECRET=<jwt-secret>
API_PORT=3001
WS_PORT=3002
```

Copy `.env.sentient.example` to `.env.sentient.local` for local development.

---

## 📊 Monitoring & Health Checks

```bash
# View service logs
docker compose logs -f <service>

# Check service status
docker compose ps

# Database access
docker exec -it sentient_postgres psql -U postgres -d sentient

# Redis monitoring
docker exec -it sentient_redis redis-cli MONITOR

# MQTT monitoring
mosquitto_sub -h localhost -t 'sentient/#' -v

# Interactive dashboard
./scripts/monitor.sh
```

---

## 🤝 Contributing

This is a private repository for Paragon Escape Rooms. For questions or issues, contact the development team.

---

## 📄 License

Proprietary - All rights reserved by Paragon Escape Rooms

---

## 🔗 Related Resources

- **Architecture Diagrams:** [`diagrams/`](diagrams/)
- **Hardware Documentation:** [`hardware/`](hardware/)
- **API Service:** [`apps/api-service/`](apps/api-service/)
- **UI Application:** [`apps/sentient-ui/`](apps/sentient-ui/)

---

**Built with ❤️ for immersive escape room experiences**
