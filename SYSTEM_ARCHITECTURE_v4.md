# Sentient Engine  
**System Architecture – Idealized Unified Design**

**Version:** 4.0.0  
**Status:** Target / Reference Architecture (Authoritative Design)  

---

## 1. Purpose & Scope

Sentient Engine is a **theatrical control and orchestration platform** for escape rooms and similar interactive environments.

The platform coordinates:

- **Controllers**  
  - Teensy 4.1 nodes  
  - Raspberry Pi (3/4/5)  
  - ESP32 / similar microcontrollers  
  - Music players / media PCs  
  - Windows/Linux PCs running Sentient agents
- **Devices** – hardware endpoints connected to controllers:  
  - relays, sensors, maglocks, lighting, audio, motors, stepper motors, actuators, etc.
- **Room displays and AV** – Pi/browser-based displays, speakers, projectors
- **Game logic and scene progression**
- **Multi-client operations** across venues and rooms
- **Safety-critical operations** – e-stops, maglock release, sensor monitoring for safe motion
- **Live director controls** for game masters

This document describes the **ideal unified architecture** for Sentient Engine:

- Logical components and their responsibilities  
- Technologies and frameworks  
- Data and messaging design  
- Network and security model  
- Repository and file structure  

It is intentionally **prescriptive**: this is the design we optimize toward, even if the current implementation differs.

---

## 2. System Identity & Design Philosophy

**Platform Name:** Sentient Engine  
**Runtime OS:** Ubuntu (24.x) on x86_64  
**Primary Deployment:** On-prem single-server per site (e.g., Paragon-Mesa), cloud-capable in future  
**Core Language:** TypeScript (Node.js) for all backend and orchestration logic  

### Design Principles

1. **Hardware-dumb, Software-smart**  
   - Controllers (Teensy, Pi, ESP32, etc.) are deterministic field I/O modules.  
   - All story, puzzle, and scene logic lives centrally in Sentient services.

2. **Single Source of Truth**  
   - PostgreSQL is the canonical database for clients, rooms, controllers, devices, scenes, sessions, and events.

3. **Event-Driven Real-Time**  
   - MQTT for controller/device communication.  
   - WebSockets for UI real-time updates.  
   - Domain events flow through the system as first-class citizens.

4. **Strong Boundaries**  
   - Clear separation between:
     - Controller/device IO (MQTT Gateway)  
     - Game logic (Orchestrator)  
     - API & configuration (API Service)  
     - Realtime delivery (Realtime Gateway)  
     - UI (GM, admin, room displays)  

5. **Monorepo, Shared Types**  
   - A single repository with shared TypeScript types and domain models used across all services, UIs, and simulators.

6. **Safety First**  
   - Maglocks fail-safe by design.  
   - Dedicated safety flows and states separate from “fun game logic”.

---

## 3. High-Level Architecture

### 3.1 Logical Component Overview

```mermaid
flowchart LR
    subgraph Users
        GM[Game Master]
        Tech[Technician]
        Admin[Admin / Owner]
    end

    subgraph UI[UI Layer]
        SentientUI[Sentient UI\n(Admin Dashboard)]
    end

    subgraph Edge[Hardware Layer]
        Controller[Controllers\n(Teensy / Pi / ESP32 / PCs)]
        Devices[Devices\n(relays, sensors, locks, lights, motors)]
        Displays[In-Room Displays\n(via Controllers)]
    end

    subgraph Broker[Messaging Layer]
        MQTT[(Mosquitto Broker)]
    end

    subgraph Core[Core Services]
        API[API Service\n(config, CRUD, auth)]
        ORCH[Orchestrator Service\n(game & scene logic)]
        MQTTGW[MQTT Gateway\n(controller/device ↔ domain)]
        RTGW[Realtime Gateway\n(WebSockets)]
        JOBS[Jobs & Analytics Service]
    end

    subgraph Data[Data Layer]
        PG[(PostgreSQL)]
        REDIS[(Redis Cache / PubSub)]
    end

    Users --> SentientUI

    SentientUI <-->|HTTP / WS| API
    SentientUI <-->|WS| RTGW

    API <-->|SQL| PG
    ORCH <-->|SQL| PG
    JOBS <-->|SQL| PG

    ORCH <-->|Pub/Sub| REDIS
    RTGW <-->|Pub/Sub| REDIS
    MQTTGW <-->|Pub/Sub| REDIS

    Controller <--> Devices
    Controller <--> Displays
    Controller <--> MQTT
    MQTTGW <--> MQTT
```

---

## 4. Core Domain Model

Sentient Engine uses a consistent domain model across controllers, services, and UIs.

### 4.1 Primary Entities

- **Client**
  A customer account (e.g., Paragon Escape Games).

- **Venue**
  A physical location belonging to a client (e.g., Paragon-Mesa).

- **Room**  
  A specific escape room / attraction instance at a venue.

- **Controller**  
  A networked compute unit responsible for one or more devices inside a room:
  - Teensy 4.1 nodes
  - Raspberry Pi nodes
  - ESP32s
  - Media PCs / Windows machines
  - Any future hardware that can run a Sentient “agent” or firmware

- **Device**
  A hardware endpoint attached to a controller:
  - Sensors (buttons, proximity, hall effect, pressure mats)
  - Relays, MOSFET drivers, motor controllers
  - Maglocks, solenoids, actuators
  - LEDs, light fixtures, DMX channels
  - Audio triggers, displays

  Device state is persisted in the database (`current_state`, `state_updated_at`) so that:
  - UI can display accurate state immediately on page load/refresh
  - State survives service restarts
  - Historical state changes can be tracked

- **Puzzle**  
  Logical unit of gameplay. May span multiple devices and controllers. Ties game rules to physical state.

- **Scene**  
  Grouping of puzzles, environmental effects, and narrative beats. Scenes often map to “chapters” or acts in a room.

- **GameSession**  
  A single run-through of a room by a team of players, with its own timeline, events, and outcome.

- **Event**  
  Timestamped domain event such as:
  - `device_state_changed`
  - `puzzle_solved`
  - `scene_advanced`
  - `hint_used`
  - `emergency_stop_triggered`
  - `controller_offline`

### 4.2 Relationships

- A **Client** has many **Venues**.
- A **Venue** has many **Rooms**.  
- A **Room** has many **Controllers**.  
- A **Controller** has many **Devices**.  
- A **Puzzle** references one or more **Devices** (and therefore Controllers) as inputs/outputs.  
- A **Scene** references many **Puzzles**, and optionally Devices directly for environmental effects.  
- A **GameSession** belongs to a Room and is associated with many Events.

### 4.3 Global Naming Conventions (CRITICAL)

All identifiers across the stack use **snake_case**:

- Database table and column names  
- MQTT topic segments  
- API JSON fields  
- Config files and scene definitions  

This avoids translation bugs and keeps mental overhead low.

---

## 5. Service Architecture

All core services are **TypeScript/Node.js** applications, containerized with Docker.

### 5.1 API Service (`apps/api-service`)

**Role:** Public backend for UIs & integrations.

**Responsibilities:**

- Client & venue management
- Room, controller, device, puzzle, and scene configuration  
- User, role, and permission management  
- GameSession lifecycle APIs (create, start, stop, pause, resume)  
- Auth (login, token issuance, session tracking)  
- Querying historical events and analytics summaries  

**Tech:**

- Node.js + TypeScript  
- Framework: NestJS or Fastify (modular architecture)  
- ORM: Prisma (PostgreSQL)  
- Auth: JWT, bcrypt for password hashing  

**Key Example Endpoints:**

- `POST /api/v1/auth/login`  
- `GET /api/v1/clients/:client_id/rooms`  
- `GET /api/v1/rooms/:room_id/controllers`  
- `GET /api/v1/controllers/:controller_id/devices`  
- `POST /api/v1/rooms/:room_id/game_sessions`  
- `POST /api/v1/game_sessions/:id/halt`  

---

### 5.2 Orchestrator Service (`apps/orchestrator-service`)

**Role:** The central brain that runs game logic.

**Responsibilities:**

- Load room, controller, device, puzzle, and scene configuration from Postgres  
- Maintain per-room state machines for active GameSessions  
- Process events from controllers/devices (via MQTT Gateway)  
- Apply game rules:
  - Puzzle gating and dependencies
  - Scene transitions
  - Timeouts and timed events
  - Safety/lockdown behaviors
- Emit domain events (e.g., `puzzle_solved`, `scene_advanced`)  
- Issue high-level commands to controllers/devices via MQTT Gateway  

**Tech:**

- Node.js + TypeScript  
- Domain-driven design:
  - `domain/` – entities, value objects, domain events  
  - `application/` – use cases, orchestrators, handlers  
- Uses Redis pub/sub for real-time internal events  
- Uses Postgres for persisted state and replayability  

---

### 5.3 MQTT Gateway Service (`apps/mqtt-gateway`)

**Role:** Translation layer between controller/device topics and domain events/commands.

**Responsibilities:**

- Connect to the Mosquitto MQTT broker  
- Subscribe to all controller/device state topics  
- Validate and normalize payloads (JSON schema, versioning)  
- Convert low-level controller/device states into domain events for the Orchestrator  
- Accept outgoing commands from Orchestrator (via Redis) and publish to controller/device command topics

**Tech:**

- Node.js + TypeScript  
- MQTT client library  
- Redis pub/sub for communication with Orchestrator  

**Topic Patterns (Sentient v4 Standard):**

The category-first structure enables efficient MQTT broker filtering and system-wide monitoring:

- Device commands:
  - `<tenant>/<room_id>/commands/<controller_id>/<device_id>/<action>`
  - Example: `paragon/clockwork/commands/power_control_upper_right/main_lighting_24v/power_on`

- Device state/sensors:
  - `<tenant>/<room_id>/sensors/<controller_id>/<device_id>/<sensor_name>`
  - Example: `paragon/clockwork/sensors/power_control_upper_right/main_lighting_24v/state`

- Controller status (heartbeats, connection):
  - `<tenant>/<room_id>/status/<controller_id>/<event_type>`
  - Example: `paragon/clockwork/status/power_control_upper_right/heartbeat`

- Command acknowledgements (controllers confirm command execution):
  - `<tenant>/<room_id>/acknowledgement/<controller_id>/<device_id>/<command>`
  - Example: `paragon/clockwork/acknowledgement/power_control_upper_right/main_lighting_24v/power_on`
  - Controllers publish to this topic immediately after executing a command
  - Enables real-time UI feedback without waiting for next heartbeat

- Full status reports (controller reports all device states):
  - `<tenant>/<room_id>/status/<controller_id>/full`
  - Example: `paragon/clockwork/status/power_control_upper_right/full`
  - Payload contains current state of all devices managed by controller
  - Used for UI refresh and state synchronization

- System registration (new controllers/devices):
  - `sentient/system/register/controller`
  - `sentient/system/register/device`

**Rationale:**
- **Category-first** enables efficient wildcard subscriptions: `paragon/+/commands/#` subscribes to all commands across all rooms
- **Tenant scoping** (`paragon`, `sentient`) allows multi-tenancy on single broker
- **Room isolation** prevents cross-room interference
- **Action/sensor at end** makes wildcard filtering more powerful

Example command payload:

```json
{
  "device_id": "main_lighting_24v"
}
```

Example sensor state payload:

```json
{
  "v": 1,
  "controller_id": "power_control_upper_right",
  "device_id": "main_lighting_24v",
  "state": {
    "on": true,
    "relay_number": 1
  },
  "timestamp": "2025-01-22T12:34:56.789Z"
}
```

---

### 5.4 Realtime Gateway Service (`apps/realtime-gateway`)

**Role:** WebSocket hub for all Sentient UIs.

**Responsibilities:**

- Accept WebSocket connections from:
  - Sentient UI
  - Any authorized clients
- Authenticate clients using JWT on connection
- Join clients to per-room / per-client channels
  - e.g., `room:<room_id>`, `client:<client_id>`
- Listen for domain events via Redis pub/sub and fan-out to connected sockets
- Accept control commands from UIs (skip puzzle, trigger hint, force open lock) and forward them to Orchestrator/API  

**Tech:**

- Node.js + TypeScript  
- WebSocket server (`ws` or `socket.io`)  
- Redis pub/sub  

---

### 5.5 Jobs & Analytics Service (`apps/jobs-service`)

**Role:** Background and scheduled work.

**Responsibilities:**

- Aggregate GameSession data into summaries  
- Cleanup of old events/logs  
- Analytics for:
  - Hint usage
  - Puzzle bottlenecks
  - Room utilization
- Optional exports to CSV or external BI tools  

**Tech:**

- Node.js + TypeScript  
- Scheduling via `node-cron` or similar  
- Talks directly to Postgres and Redis  

---

### 5.6 Web Frontend (Sentient UI)

#### 5.6.1 Sentient UI (`apps/sentient-ui`)

**Role:** Unified web interface for configuration, management, and live game master operations.

**Also known as:** Admin UI, Sentient Web

**Features:**

**Authentication:**
- JWT-based login system with session persistence
- Protected routes with automatic token validation and expiry handling

**Network Visualization:**
- Real-time network topology view with circular radial layout
- Animated pulses showing controller/device communication
- Room-based color coding and health status indicators
- Live metrics sidebar with throughput graphs

**Scene Editor:**
- Flow-based visual programming interface using React Flow
- Drag-and-drop node palette with 22+ component types:
  - Triggers (scene start, timers)
  - Sensors (buttons, RFID, weight sensors)
  - Puzzles (sequences, combinations, patterns)
  - Effects (lights, servos, fog, maglocks)
  - Audio (SFX, music, voice)
  - Logic (delays, branches, loops)
- Properties panel for node/scene configuration

**Configuration & Management:**
- Client & venue management (CRUD operations)
- Room configuration with hierarchical client → venue → room structure
- User management with role-based access control (OWNER, GM, TECH, VIEWER)
- Controller and device inventory
- Scene graphs and puzzle definitions

**Live Game Master Operations:**
- GM Console with real-time device monitoring
- Event feed showing controller heartbeats and state changes
- Session controls for active game rooms
- Power control interface for room controllers
- Multi-room overview dashboard

**Tech:**

- React 19 + Vite 7 (TypeScript)
- React Flow v12 for scene editor
- TanStack React Query v5 for state management
- Lucide React icons
- Custom CSS with Sentient Eye branding (cyan/orange theme)
- Communication:
  - REST (API Service) for config and history
  - WebSockets (Realtime Gateway) for live updates

**Note:** In-room player displays (countdown timers, story text, etc.) are handled by controller-based display systems, not web UIs.

---

## 6. Hardware Layer

### 6.1 Controller Abstraction

A **Controller** is any networked compute unit that:

- Connects to the MQTT broker  
- Manages one or more Devices  
- Runs a lightweight Sentient “agent” or firmware  
- Exposes a consistent configuration model (controller_id, room_id, device map)

Controllers can be:

- Microcontrollers (Teensy 4.1, ESP32)  
- Single-board computers (Raspberry Pi)  
- Full PCs (Windows/Linux boxes running specialized control apps)  

### 6.1.1 Teensy 4.1 Controllers

**Role:** Real-time I/O modules (fast sensors, motors, locks).

**Firmware Pattern:**

- `loop_hardware()` – scan inputs, update outputs, basic conditioning
- `loop_mqtt()` – maintain MQTT connection, publish device state, apply received commands
- `loop_diagnostics()` – health reporting, watchdog, uptime, error codes

**Command Handling with Acknowledgements:**

When a controller receives a command:
1. Execute the physical action (toggle relay, move motor, etc.)
2. Publish acknowledgement to `<tenant>/<room>/acknowledgement/<controller>/<device>/<command>`
3. Include new device state in acknowledgement payload

Example acknowledgement payload:
```json
{
  "v": 1,
  "controller_id": "power_control_upper_right",
  "device_id": "main_lighting_24v",
  "command_acknowledged": "power_on",
  "state": 1,
  "timestamp": "2025-01-22T12:34:56.789Z"
}
```

Teensy firmware:

- Does **not** contain puzzle logic
- Only implements deterministic I/O behavior per configuration
- **Must** publish acknowledgements after executing commands for real-time UI feedback  

### 6.1.2 Pi / PC Controllers

Used where more complex local behavior is needed:

- Media playback  
- Complex device protocols  
- Bridging legacy hardware  

They still follow the same model:

- Identify as a controller in Sentient  
- Manage devices (logical)  
- Communicate via MQTT using the same topic structure  

### 6.2 Devices

Devices are physical endpoints attached to controllers:

- Inputs: switches, sensors, encoders, RFID readers, keypads  
- Outputs: relays, LEDs, DMX channels, audio triggers, motors  

From the Sentient Engine perspective, Devices are:

- Defined and configured in the API / Admin UI  
- Known by `device_id` and `controller_id`  
- Exposed over MQTT as per-topic state/command channels  

### 6.3 Safety & Maglocks

Safety is enforced by both hardware and software layers:

- Maglock circuits wired to **fail safe** on power loss or hard emergency stop  
- Safety relays and e-stop circuits are **hardware-domain**, not just software  
- Sentient can:
  - release doors
  - drop power to locks
  - log safety events  

…but cannot prevent a physical e-stop from releasing them.

---

## 7. Data Architecture

### 7.1 PostgreSQL (Primary DB)

PostgreSQL holds all persistent data:

- Clients, venues, rooms  
- Controllers, controller types, controller configs  
- Devices, device types, device configs  
- Puzzles, scenes, scene graphs  
- GameSessions (metadata)  
- Events (fine-grained logs)  
- Users, roles, permissions  
- Audit logs  

Access layer:

- Prisma schemas in `infra/migrations` and `apps/api-service`  
- Migrations versioned and applied through a controlled pipeline  

### 7.2 Redis (Cache & Event Bus)

Redis is used for:

- Caching frequently-used configurations (room layouts, controller/device maps)
- Pub/sub channels for:
  - Events from MQTT Gateway → Orchestrator
  - Domain events from Orchestrator → Realtime Gateway
  - Commands from Sentient UI → Orchestrator

**Key Redis Channels:**

- `sentient:events:domain` - Domain events broadcast to all services:
  - `device_state_changed` - Device state updates (from controller acknowledgements)
  - `controller_heartbeat` - Controller liveness signals
  - `controller_online` / `controller_offline` - Connection state changes

- `sentient:commands:status_request` - Request current status from a controller:
  - API Service publishes when UI needs fresh state
  - MQTT Gateway subscribes and forwards to controller via MQTT

**State Persistence Flow:**

1. Controller executes command and publishes acknowledgement to MQTT
2. MQTT Gateway receives acknowledgement and publishes `device_state_changed` to Redis
3. HeartbeatEventHandler in API Service receives event and persists state to PostgreSQL
4. Realtime Gateway receives event and pushes to connected WebSocket clients
5. UI updates in real-time; page refresh loads persisted state from database  

---

## 8. Messaging & Protocols

### 8.1 MQTT Design

**Broker:** Mosquitto, running in Docker on the services VLAN.

**Topic Standards (snake_case, hierarchical, category-first):**

All topics follow the pattern: `<tenant>/<room_id>/<category>/<controller_id>/<device_id>/<action_or_sensor>`

- Device commands:
  - `<tenant>/<room_id>/commands/<controller_id>/<device_id>/<action>`
  - Example: `paragon/clockwork/commands/power_control_upper_right/main_lighting_24v/power_on`

- Device state/sensors:
  - `<tenant>/<room_id>/sensors/<controller_id>/<device_id>/<sensor_name>`
  - Example: `paragon/clockwork/sensors/power_control_upper_right/main_lighting_24v/state`

- Controller status:
  - `<tenant>/<room_id>/status/<controller_id>/<event_type>`
  - Example: `paragon/clockwork/status/power_control_upper_right/heartbeat`

**Benefits of category-first structure:**
- System-wide monitoring: `paragon/+/commands/#` captures all commands across all rooms
- Security/ACL by message type: Grant services access only to specific categories
- Better MQTT broker performance with fewer subscription trees
- Aligns with industrial IoT best practices (Sparkplug B, AWS IoT)

**QoS:** Typically QoS 1 for commands and state.
**Auth:** Username/password, per-controller or per-room identities.
**TLS:** Enabled when controllers are on untrusted networks; otherwise VLAN + firewall isolation.

### 8.2 HTTP / WebSocket

- REST endpoints under `/api/v1/...` on API Service.  
- Realtime Gateway exposes a WebSocket endpoint like:
  - `wss://sentientengine.local/ws`  
- Clients:
  - Authenticate using JWT on connection
  - Subscribe to room/client channels for live updates  

---

## 9. Network & Deployment Architecture

### 9.1 Network Segmentation (Example: Paragon-Mesa)

**Core VLANs:**

- **VLAN 20 – Sentient Services**  
  - `192.168.20.0/24`  
  - Hosts: Sentient server, Docker stack (Postgres, Mosquitto, API, ORCH, RTGW, etc.)

- **VLAN 30 – Controllers (Teensy / Pi / PCs)**  
  - `192.168.30.0/24`  
  - All controllers and room displays  
  - Limited, controlled access to Services VLAN only

- **VLAN 50 – Staff (GM / Tech)**  
  - GM PCs, tablets, tech machines  
  - Access to Sentient Web UIs and SSH to server  

Guest WiFi, cameras, and other networks remain isolated.

### 9.2 Firewall Policy (Conceptual)

Simplified LAN IN rules (e.g., UDM Pro):

1. **ALLOW** VLAN 30 → VLAN 20 for:
   - TCP 1883 (MQTT)
   - TCP 80/443 (HTTP/HTTPS for APIs/room UI)
2. **DENY** lateral traffic within VLAN 30 except ESTABLISHED/RELATED.  
3. **ALLOW** VLAN 50 → VLAN 20 for:
   - Web UI (80/443)
   - SSH (22) for admins
   - Observability tools (Grafana)
4. **DENY** Guest VLANs → VLAN 20.

### 9.3 Deployment Model

Primary target:

- **Single Sentient server per site/venue**:
  - Ubuntu 24.x
  - Docker + Docker Compose
  - Application data under `/opt/sentient`

**Docker Compose stack includes:**

- `sentient-postgres`
- `sentient-redis`
- `sentient-mosquitto`
- `api-service`
- `orchestrator-service`
- `mqtt-gateway`
- `realtime-gateway`
- `jobs-service` (future)
- `admin-dashboard` (Sentient UI - typically run separately in dev)
- Observability (future):
  - `prometheus`, `grafana`
  - `loki`, `promtail` (or similar)

---

## 10. Security Architecture

### 10.1 Authentication & Authorization

- JWT-based auth for all UIs and API clients.
- Tokens include: `user_id`, `role`, `client_id`, `iat`, `exp`.  
- Sessions tracked in DB for revocation and auditing.

**Example roles:**

- `OWNER` – Full client control.  
- `GM` – Operate rooms and sessions.  
- `TECH` – Configure controllers/devices/puzzles.  
- `VIEWER` – Read-only access.

Authorization enforced at the API layer, with all operations scoped by client and room.

### 10.2 Secrets Management

- No secrets in Git.  
- `.env.example` committed as a template.  
- `.env.production` exists only on the server.  
- `/opt/sentient/secrets` directory holds:
  - `mosquitto.passwd`
  - TLS certs and keys
  - Database credentials
  - JWT signing keys  

Secrets are mounted into containers as read-only volumes.

---

## 11. Observability

### 11.1 Logging

- All services log in **structured JSON** to stdout.  
- `promtail` or equivalent ships logs to `loki`.  
- Grafana provides per-service and cross-service log views.

### 11.2 Metrics

Prometheus scrapes metrics from:

- API Service – request latency, error rates  
- Orchestrator – events processed, active sessions per room  
- MQTT Gateway – message rates, disconnects, error counts  
- Realtime Gateway – connection counts, events per room  
- System – CPU, memory, disk, network

Grafana dashboards include:

- Room & controller heartbeat  
- MQTT broker health  
- Game session performance (average time, hints, fail rates)  
- System resource utilization on Sentient server  

### 11.3 Alerts (Future)

Prometheus alert rules for:

- Broker unreachable  
- Controller offline > X minutes  
- Orchestrator crash loops  
- DB connection pool saturation  

Alerts can be routed via email, SMS, Slack/Discord, etc.

---

## 12. Repository & File Structure

Sentient Engine uses a **TypeScript monorepo**.

### 12.1 Top-Level Layout

```text
Sentient/                      # repo root
  apps/
    api-service/
    orchestrator-service/
    mqtt-gateway/
    realtime-gateway/
    jobs-service/              # (future)
    admin-dashboard/           # Sentient UI
    device-simulators/
  packages/
    core-domain/
    shared-types/
    shared-config/
    shared-logging/
    shared-messaging/
  infra/
    docker/
      docker-compose.dev.yml
      docker-compose.prod.yml
      docker-compose.override.example.yml
    migrations/
      api-service/
      orchestrator-service/
  docs/
    SYSTEM_ARCHITECTURE_v4.md
    NETWORK_DESIGN.md
    HARDWARE_STANDARDS.md
    OPERATIONS_RUNBOOK.md
  scripts/
    deploy/
      deploy_prod.sh
      restart_stack.sh
    dev/
      seed_db.ts
      load_demo_data.ts
  .env.example
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
  README.md
```

### 12.2 Example Service Layout (API Service)

```text
apps/api-service/
  src/
    main.ts
    app.module.ts
    config/
      env.schema.ts
      index.ts
    modules/
      clients/
      venues/
      rooms/
      controllers/
      devices/
      puzzles/
      scenes/
      game_sessions/
      users/
      auth/
    common/
      guards/
      interceptors/
      filters/
      decorators/
    infrastructure/
      orm/
        prisma/
          schema.prisma
          migrations/
      messaging/
        redis-client.ts
  test/
  Dockerfile
  package.json
  tsconfig.json
```

### 12.3 Example Layout (Orchestrator Service)

```text
apps/orchestrator-service/
  src/
    main.ts
    config/
    domain/
      entities/
        room.ts
        controller.ts
        device.ts
        puzzle.ts
        scene.ts
        game_session.ts
      value_objects/
      events/
    application/
      services/
        game_session_orchestrator.service.ts
        scene_transition.service.ts
      handlers/
        device_event.handler.ts
        puzzle_event.handler.ts
    infrastructure/
      redis/
      persistence/
      mqtt_command_outbox.ts
  Dockerfile
```

### 12.4 Shared Packages

- `packages/core-domain/` – shared domain models, enums, events.  
- `packages/shared-types/` – DTOs, API interfaces, WS payload types.  
- `packages/shared-config/` – env loading and validation helpers.  
- `packages/shared-logging/` – logging utilities.  
- `packages/shared-messaging/` – MQTT/Redis channel conventions and schemas.

---

## 13. Document Status

- This file represents the **ideal unified architecture** of **Sentient Engine**.  
- Implementation should converge toward this design over time.  
- Deviations must be intentional and documented in follow-up design notes.

**Maintainer:** Sentient Engine Architecture  
**Review Cadence:** Revisit after major architectural or product changes.
