## Sentient Engine – AI Agent Playbook

### Interaction Defaults

- Aim for direct, high-signal answers with file paths, runnable commands, and minimal recap.
- When debugging, always trace the full pipeline (API ↔ Orchestrator ↔ MQTT ↔ Redis ↔ UI ↔ controller) before proposing fixes.
- Deliverables order: concise summary → ordered action steps → copy/paste commands → code changes → validation plan.
- Treat `EventType`, MQTT topics, Redis channels, and shared packages as global contracts—understand downstream impact before editing.

### Architecture & Data Flow

- Event-driven control stack (see `docs/SYSTEM_ARCHITECTURE_v4.md`) where hardware is dumb and orchestration lives centrally.
- Controllers publish `sentient/<room>/<category>/…`; `apps/mqtt-gateway` normalizes to `EventType` payloads on `sentient:events:domain`.
- `apps/orchestrator-service` consumes Redis events, mutates in-memory session state, and emits device commands on `sentient:commands:device`.
- `apps/realtime-gateway` mirrors Redis messages to UI websockets; `apps/sentient-ui` expects shared types from `packages/shared-types`.

### Services & Shared Packages

- `apps/api-service` (NestJS + Prisma) seeds/reads Postgres; migrations via `pnpm --filter api-service prisma:migrate:dev`.
- `apps/device-simulators` + `hardware/Controller Code Teensy` keep MQTT topics honest—use them when reproducing bugs without hardware.
- `packages/core-domain` owns enums/entities; `packages/shared-messaging` exposes `MqttTopicBuilder` + `REDIS_CHANNELS`; `packages/shared-config` centralizes env parsing; `packages/shared-logging` provides the `createLogger({ service })` wrapper.
- Always `pnpm -r build` after editing shared packages so downstream apps pick up the new artifacts (`workspace:*` linking is non-transpiled).

### Local Dev & Deployment Workflow

- Install once with `pnpm install`; run targeted dev servers via `pnpm --filter <app> dev` or the full stack with `pnpm -r dev`.
- Use `./deploy.local.sh [--service <name>] [--skip-build] [--migrate]` to bring up Dockerized dependencies; production mirrors via `deploy.prod.sh`.
- Compose expects `.env.sentient(.local)` for DB/Redis/MQTT credentials; never hardcode secrets in code.
- Hardware builds live under `hardware/compile_teensy.sh` / `compile_all_v2.sh`; outputs drop into `hardware/HEX_OUTPUT` for flashing.

### Debugging & Validation

- Start with logs: `scripts/monitor.sh` aggregates services; fall back to `docker compose logs -f <service>`.
- Inspect each hop: `mosquitto_sub -t 'sentient/#' -v`, `redis-cli MONITOR | grep sentient:events:domain`, `redis-cli PUBLISH …` to replay events, `docker exec sentient_postgres psql …` for DB state.
- UI/WebSocket issues: publish a sample domain event and confirm it arrives in `apps/realtime-gateway` then `apps/sentient-ui` via browser devtools.

### Conventions & Safety

- Keep logic server-side; edge controllers should only report state or execute commands from the Orchestrator.
- Use `createLogger().child({ component })` per module for structured logs; do not `console.log` outside quick debugging.
- When touching MQTT topics or Redis payloads, update both shared builders and downstream consumers (Orchestrator, UI, device simulators).
- Preserve fail-safe behavior for maglocks/e-stop sequences described in `docs/SENTIENT_DATA_FLOW.md` before altering device routines.

### References & Follow-Ups

- System diagrams live in `diagrams/*.mmd`; regenerate after architecture changes.
- UI specs: `docs/UI_PAGES.md`, `docs/UI_Tasks_and_Procedures.md`; deployment ops: `docs/DEPLOYMENT.md`, `scripts/README.md`.
- If anything in this guide feels incomplete, flag it in your reply so we can extend these instructions.
