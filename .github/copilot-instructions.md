# Sentient Engine – AI Coding Agent Guide

## Interaction Defaults

- Provide direct, high-signal answers with file paths and runnable commands; assume experienced developer context.
- Pair reasoning with concrete steps; never restate prior context or invent architecture changes.
- When debugging, request exact logs and trace end-to-end (API ↔ Orchestrator ↔ MQTT ↔ Redis ↔ UI ↔ controllers).
- Deliverables flow: short summary → actionable steps → copy/paste commands → code → validation plan.
- Before modifying cross-cutting concerns (EventType enum, MQTT topics, Redis channels), understand impact across all services.

## Architecture Snapshot

- **Sentient Engine** (see `docs/SYSTEM_ARCHITECTURE_v4.md`) is a theatrical control platform for escape rooms, coordinating Teensy 4.1, Raspberry Pi, ESP32 controllers plus connected devices (relays, sensors, maglocks, motors, lighting).
- Controllers publish to topics (`sentient/<room>/<category>/…`); MQTT Gateway normalizes to `EventType` payloads → `sentient:events:domain`; Orchestrator and Realtime consume, UI mirrors via WS, commands return on `sentient:commands:device` → MQTT device command topics.
- PostgreSQL holds clients/venues/rooms/controllers/devices via Prisma; Redis backs pub/sub and transient session state; MQTT broker lives at `sentientengine.ai:1883` (external, host-network binding locally).
- Design principles: **hardware-dumb/software-smart** (all game logic centralized), event-driven, shared types across monorepo, **safety-first** (maglocks fail-safe, e-stop flows documented in `docs/SENTIENT_DATA_FLOW.md`).

## Repo & Runtime Basics

- **Monorepo** managed with pnpm workspaces (`pnpm-workspace.yaml`); requires Node ≥22 and pnpm ≥10 (`pnpm install` once at root).
- `pnpm -r dev` runs all service watchers in parallel; target single app with `pnpm --filter <app> dev`.
- `docker-compose.yml` provisions Postgres 15, Redis 7, nginx, and every service container built from repo Dockerfiles.
- `.env.sentient` or `.env.sentient.local` (not committed) seeds compose env vars; mirror it locally when bringing up services.
- **Local deployment:** `./deploy.local.sh` (supports `--skip-build`, `--service <name>`, `--migrate` flags); production via `deploy.prod.sh`.

## Core Services & Roles

- `apps/api-service` (NestJS + Prisma) exposes HTTP auth/config; schema lives in `apps/api-service/prisma/schema.prisma`; migrations via `pnpm --filter api-service prisma:migrate:dev`.
- `apps/orchestrator-service` listens to Redis domain events, stores sessions in-memory, and emits commands through `EventPublisher`.
- `apps/mqtt-gateway` bridges Mosquitto ↔ REST; subscribes to `sentient|paragon/<room>/<category>/…` topics, registers hardware via `/internal/*`, and publishes `sentient:events:domain`; requires `INTERNAL_REG_TOKEN`.
- `apps/realtime-gateway` exposes WS on `WS_PORT` (3002 default) and rebroadcasts Redis events via `SentientWebSocketServer` for UI subscribers.
- `apps/sentient-ui` (Vite/React) consumes API (port 3001) and WS 3002; components live under `apps/sentient-ui/src` and expect shared types.
- `apps/device-simulators` mocks controllers/devices over MQTT using `MqttTopicBuilder` + `EventType`; use when hardware is offline.

## Shared Packages & Messaging

- `packages/core-domain` hosts enums/entities (`EventType` enum: `DEVICE_STATE_CHANGED`, `CONTROLLER_HEARTBEAT`, `PUZZLE_SOLVED`, etc.); **always import, never redefine** these constants.
- `packages/shared-messaging` centralizes MQTT topic builders (`MqttTopicBuilder.deviceState()`, `MqttTopicBuilder.deviceCommand()`) and Redis channel helpers (`REDIS_CHANNELS.DOMAIN_EVENTS = 'sentient:events:domain'`, `REDIS_CHANNELS.DEVICE_COMMANDS = 'sentient:commands:device'`).
- `packages/shared-config` exposes env schemas + builders for DB/Redis/MQTT; wire new services through these helpers.
- `packages/shared-logging` wraps winston; use `createLogger({ service })` and `.child()` per component to keep structured metadata.
- `packages/shared-types` contains TypeScript interfaces shared across services and UI.
- **Critical:** All packages must `pnpm build` before consuming services can import them; monorepo uses workspace protocol (`workspace:*`).

## Data Flow & Env Contracts

- Postgres is the source of truth (clients/venues/rooms/controllers/devices defined in Prisma schema); API container runs `pnpm prisma:db:push` on boot.
- Redis Pub/Sub is the backbone: MQTT Gateway publishes to `sentient:events:domain`, Orchestrator + Realtime subscribe, and commands flow back on `sentient:commands:*`.
- MQTT broker runs externally at `sentientengine.ai:1883`; `mqtt-gateway` uses `network_mode: host`, so mind local port collisions.
- Required env vars: `DATABASE_URL`, `REDIS_URL`, `MQTT_URL`, `INTERNAL_REG_TOKEN`, `API_PORT`, `WS_PORT`, `JWT_SECRET`, `MQTT_USERNAME`, `MQTT_PASSWORD`.

## Debugging Loop

- Capture failing logs first (`scripts/monitor.sh` or `docker compose logs -f <service>`), trace the whole pipeline (controller → MQTT → gateway → Redis → orchestrator → UI).
- Validate data at each hop: `redis-cli MONITOR | grep sentient:events:domain`, `redis-cli PUBLISH sentient:events:domain '{...}'` to repro UI behavior, `mqtt sub -t 'sentient/#'` to inspect controller chatter.
- Verify DB state via `docker exec -it sentient_postgres psql -U postgres -d sentient -c "SELECT ..."` before assuming orchestration bugs.
- Use `pnpm --filter <service> dev` for hot reload while iterating; restart dockerized dependents if env vars change.

## Dev/Ops & Tooling

- `pnpm -r build` before Docker builds; bring up targeted stacks with `docker compose up api-service orchestrator-service mqtt-gateway realtime-gateway sentient-ui`.
- Deployments go through `deploy.local.sh` or `deploy.prod.sh`; `scripts/monitor.sh` provides live service/log dashboards, and `scripts/rollback.sh` handles image/db recovery.
- Inspect services via `docker compose logs -f <service>` and DB via `docker exec -it sentient_postgres psql -U postgres -d sentient -c "SELECT ..."`.
- UI/WebSocket validation: publish a fake event (`redis-cli PUBLISH sentient:events:domain '{...}'`) and confirm it lands in the browser DevTools feed.
- Docker compose uses `docker-compose.yml` (base) + `docker-compose.dev.yml` (overrides); specify both with `-f` flags or rely on deploy scripts.

## Hardware & Edge Controllers

- Firmware resides under `hardware/Controller Code Teensy/*_v2`; compile with `./hardware/compile_teensy.sh "Controller Code Teensy/<ctrl>/<ctrl>.ino"` or `compile_all_v2.sh` (auto version bump to `hardware/HEX_OUTPUT`).
- Clean artifacts via `hardware/clean_hex_output.sh`; flash with Teensy Loader or `teensy_loader_cli --mcu=TEENSY41 -w hardware/HEX_OUTPUT/<file>.hex`.
- Firmware must register via `sentient/system/register/{controller|device}` topics before streaming. State topics follow `sentient/<room>/status/<controller>/<device>/state`; acknowledgements hit `…/acknowledgement/<command>` for UI immediacy.
- Raspberry Pi launchers + MQTT config scripts live under `hardware/Raspberry Pis` and `hardware/scripts`; register nodes through API before field use.

## Key References

- `docs/SYSTEM_ARCHITECTURE_v4.md` holds canonical component boundaries and mermaid diagrams.
- `docs/SENTIENT_DATA_FLOW.md`, `docs/Sentient_Engine_Deployment_Guide.md`, and `docs/Mac_Studio_Sentient_Setup_Guide.md` cover networking, deployment, and local setup specifics.
- `docs/Sentient_Admin_Topology_Dashboard_Spec.md`, `docs/UI_PAGES.md`, and `docs/UI_Tasks_and_Procedures.md` define current UI behavior.
