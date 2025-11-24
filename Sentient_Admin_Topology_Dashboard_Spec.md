# Sentient Admin – Integrated Real-Time Topology & Message Flow Dashboard

This document describes how to integrate a **real-time system visualizer** into the **Sentient Admin UI**. It is intended as a blueprint you can use (and feed to tools like Copilot in VS Code) to re-create the feature.

The goal is for the Admin UI to show:

- Rooms, controllers, and devices  
- Core services (API, Orchestrator, MQTT Gateway, Realtime Gateway, MQTT broker, Redis, Postgres)  
- Live message flows between nodes (MQTT, Redis events, WebSockets, API calls)  
- Per-room and per-node state (online/offline, active sessions, recent events)

---

## 1. Concept Overview

We add a **System Topology & Live Flows** view inside the existing **Sentient Admin UI**.

This view contains:

1. **Topology Graph** – interactive node-link diagram showing:
   - Rooms
   - Controllers
   - Devices
   - Core backend services
   - Infra components

2. **Live Event Stream** – a scrollable list of real-time events (puzzle solved, controller offline, MQTT messages, etc.) with filters.

3. **Node Details Panel** – when a node is selected, show metadata and recent events for that node.

The Admin UI receives real-time events over **WebSockets** from the Realtime Gateway and initial static topology via **HTTP** from the API service.

---

## 2. Placement in the Admin UI

Assume the Admin UI is a **Next.js + React** app at:

```text
apps/admin-ui/
```

Add a new route:

- Using App Router:
  ```text
  apps/admin-ui/app/admin/topology/page.tsx
  ```
- Or, using Pages Router:
  ```text
  apps/admin-ui/pages/admin/topology.tsx
  ```

Navigation entry:

- Add **“Topology & Live Flows”** to the Admin sidebar/nav.

---

## 3. Data Model and Endpoints

### 3.1 Static Topology – HTTP

Admin UI fetches initial topology from the API service, e.g.:

```http
GET /api/admin/rooms/topology
```

Suggested response shape:

```ts
type RoomTopologyResponse = {
  rooms: Array<{
    id: string;
    name: string;
    status: 'online' | 'offline' | 'maintenance';
    controllers: Array<{
      id: string;
      name: string;
      status: 'online' | 'offline';
      devices: Array<{
        id: string;
        name: string;
        type: string;  // 'lock' | 'sensor' | 'light' | etc.
        status: 'online' | 'offline' | 'unknown';
      }>;
    }>;
  }>;
  services: Array<{
    name: string;            // 'api-service' | 'orchestrator-service' | etc.
    type: 'core' | 'infra';
    status: 'online' | 'degraded' | 'offline';
  }>;
};
```

The Admin UI uses this to construct initial nodes and edges.

### 3.2 Live Events – WebSocket

Admin UI connects to Realtime Gateway via WebSocket:

- URL from env: `NEXT_PUBLIC_WS_URL`, e.g.:
  - Dev: `ws://localhost:3002`
  - Prod: `wss://admin.sentientengine.com/ws`

Incoming messages are JSON events:

```ts
export type TopologyEvent = {
  id: string;
  type: 'room' | 'controller' | 'device' | 'service' | 'infra';
  subtype: string;           // 'state_update', 'puzzle_solved', 'controller_offline', etc.
  timestamp: string;         // ISO time
  roomId?: string;
  controllerId?: string;
  deviceId?: string;
  serviceName?: string;
  payload?: any;
};
```

Example events:

```json
{
  "id": "evt-123",
  "type": "device",
  "subtype": "state_update",
  "timestamp": "2025-11-23T17:12:34.567Z",
  "roomId": "room_egypt",
  "controllerId": "ctrl_pharaoh",
  "deviceId": "dev_sarcophagus_lid",
  "payload": {
    "state": "OPEN",
    "source": "mqtt"
  }
}
```

```json
{
  "id": "evt-456",
  "type": "service",
  "subtype": "puzzle_solved",
  "timestamp": "2025-11-23T17:13:00.001Z",
  "roomId": "room_egypt",
  "serviceName": "orchestrator-service",
  "payload": {
    "puzzleId": "puzzle_ankh",
    "solver": "device:dev_ankh_reader"
  }
}
```

```json
{
  "id": "evt-789",
  "type": "infra",
  "subtype": "controller_offline",
  "timestamp": "2025-11-23T17:14:10.000Z",
  "roomId": "room_egypt",
  "controllerId": "ctrl_pharaoh"
}
```

---

## 4. UI Layout

### 4.1 General Layout

Page `/admin/topology`:

- Header:
  - Title: **System Topology & Live Flows**
  - Controls: room filter, event type filter, pause/resume button

- Main:
  - Left (≈ 70% width):
    - **TopologyGraph** – visual graph of nodes & edges
  - Right (≈ 30% width):
    - **EventsPanel** – live events list
    - **NodeDetailsPanel** – shown when a node is selected

### 4.2 React Component Structure

Suggested tree:

```text
apps/admin-ui/
  app/admin/topology/page.tsx              # page entry
  components/topology/TopologyPage.tsx     # page container
  components/topology/FiltersBar.tsx
  components/topology/TopologyGraph.tsx
  components/topology/EventsPanel.tsx
  components/topology/NodeDetailsPanel.tsx
  hooks/useTopologyStore.ts
  hooks/useTopologyWebSocket.ts
  lib/topology/types.ts
  lib/topology/layout.ts
```

---

## 5. Types and State Store

### 5.1 Types (`lib/topology/types.ts`)

```ts
export type NodeType = 'room' | 'controller' | 'device' | 'service' | 'infra';

export type TopologyNode = {
  id: string;
  type: NodeType;
  label: string;
  roomId?: string;
  controllerId?: string;
  deviceId?: string;
  serviceName?: string;
  status?: 'online' | 'offline' | 'degraded' | 'unknown';
};

export type TopologyEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  lastEvent?: TopologyEvent;
  lastEventAt?: string;
};

export type TopologyEvent = {
  id: string;
  type: NodeType | 'service' | 'infra';
  subtype: string;
  timestamp: string;
  roomId?: string;
  controllerId?: string;
  deviceId?: string;
  serviceName?: string;
  payload?: any;
};
```

### 5.2 Store (`hooks/useTopologyStore.ts`)

Use Zustand or React Context. Store should hold:

- `rooms` and `services` (from HTTP)
- `nodes: TopologyNode[]`
- `edges: TopologyEdge[]`
- `events: TopologyEvent[]`
- `selectedNode?: TopologyNode`
- `filters` (room, type, severity)
- `paused: boolean`

Example actions:

- `setTopology(data: RoomTopologyResponse)`
- `addEvent(event: TopologyEvent)`
- `applyEventToGraph(event: TopologyEvent)`
- `setSelectedNode(nodeId: string)`
- `setFilters(filters)`
- `setPaused(paused: boolean)`

---

## 6. WebSocket Hook

`hooks/useTopologyWebSocket.ts`:

- Connect to `process.env.NEXT_PUBLIC_WS_URL`
- On `message`, parse JSON to `TopologyEvent`
- If not paused:
  - `addEvent(event)`
  - `applyEventToGraph(event)`

Pseudo-code:

```ts
import { useEffect } from 'react';
import { useTopologyStore } from './useTopologyStore';
import { TopologyEvent } from '@/lib/topology/types';

export function useTopologyWebSocket() {
  const addEvent = useTopologyStore((s) => s.addEvent);
  const applyEventToGraph = useTopologyStore((s) => s.applyEventToGraph);
  const paused = useTopologyStore((s) => s.paused);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!wsUrl) return;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[Topology WS] connected');
    };

    ws.onmessage = (event) => {
      if (paused) return;
      try {
        const data: TopologyEvent = JSON.parse(event.data);
        addEvent(data);
        applyEventToGraph(data);
      } catch (err) {
        console.error('Error parsing topology event', err);
      }
    };

    ws.onclose = () => {
      console.log('[Topology WS] disconnected');
    };

    return () => {
      ws.close();
    };
  }, [addEvent, applyEventToGraph, paused]);
}
```

---

## 7. Topology Graph Rendering

### 7.1 Layout Concept

First version can use a simple layered layout:

- Column 1: Infra (Postgres, Redis, MQTT broker)
- Column 2: Core services (API, Orchestrator, MQTT Gateway, Realtime Gateway, Jobs)
- Column 3: Rooms
- Column 4: Controllers
- Column 5: Devices

Render nodes and edges using SVG or a graph library (e.g., `react-flow`).

Visual cues:

- Node color by `status`:
  - Green: online
  - Red: offline
  - Orange: degraded
  - Gray: unknown
- Edge highlight:
  - If `lastEventAt` is within a recent window (e.g., last 2–5 seconds), draw edge in a different color or animate it.

### 7.2 `TopologyGraph` Component

Responsibilities:

- Read `nodes` and `edges` from the store
- Render nodes in a layout (manual or via library)
- Handle:
  - Hover: show tooltip
  - Click: set selected node in store

---

## 8. Events Panel

`components/topology/EventsPanel.tsx`:

- Displays a scrollable list of `TopologyEvent`
- Filters:
  - Event type (room/controller/device/service/infra)
  - Room ID
  - Subtype (state_update / puzzle_solved / offline / etc.)
- Columns:
  - Timestamp
  - Type / Subtype
  - Node identifiers (room, controller, device, service)
  - Summary text

Behavior:

- New events appear at the top or bottom
- Clicking an event:
  - Focuses and highlights relevant node in graph

Respects `paused` flag:

- When paused, do not update visible list.

---

## 9. Node Details Panel

`components/topology/NodeDetailsPanel.tsx`:

- Reads `selectedNode` and related events from store
- Shows details based on node type:

Examples:

**Room node:**

- ID, name
- Status
- Controllers/devices counts
- Last N events for that room

**Controller node:**

- ID, name
- Room
- Status
- Devices count
- Last connectivity change, last N events

**Device node:**

- ID, name
- Type
- Room & controller
- Last known state (from most recent event payload)
- Last N events

**Service node:**

- Service name
- Status (from `services` data)
- Last health check time (if available)
- Last N service-related events

---

## 10. Topology Page Glue Logic

`components/topology/TopologyPage.tsx`:

- On mount:
  1. Fetch topology:
     ```ts
     const res = await fetch('/api/admin/rooms/topology');
     const data = await res.json();
     setTopology(data);
     ```
  2. Initialize WebSocket: `useTopologyWebSocket()`

- Render:
  - `FiltersBar`
  - A two-column layout:
    - Left: `TopologyGraph`
    - Right: `EventsPanel` + `NodeDetailsPanel`

Example skeleton:

```tsx
export function TopologyPage() {
  const setTopology = useTopologyStore((s) => s.setTopology);

  useEffect(() => {
    async function loadTopology() {
      const res = await fetch('/api/admin/rooms/topology');
      const data = await res.json();
      setTopology(data);
    }
    loadTopology();
  }, [setTopology]);

  useTopologyWebSocket();

  return (
    <div className="flex flex-col h-full">
      <FiltersBar />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 border-r overflow-hidden">
          <TopologyGraph />
        </div>
        <div className="w-[30%] flex flex-col">
          <EventsPanel />
          <NodeDetailsPanel />
        </div>
      </div>
    </div>
  );
}
```

---

## 11. Using This Spec with Copilot

For each file, you can:

- Create the file and paste relevant typedefs or signatures.
- Ask Copilot for implementation:

Examples:

- For `useTopologyStore.ts`:
  > “Implement a Zustand store that manages rooms, services, nodes, edges, events, selectedNode, filters, paused, and exposes setTopology, addEvent, applyEventToGraph, setSelectedNode, setFilters, setPaused.”

- For `TopologyGraph.tsx`:
  > “Render a simple SVG-based graph using nodes and edges from useTopologyStore. Use different colors for node.status and highlight edges with recent lastEventAt.”

- For `EventsPanel.tsx`:
  > “Render a list of events from useTopologyStore with filters and clicking an event selects the associated node.”

Use this spec as your north star while Copilot generates the boilerplate and concrete React/TS code.

---

## 12. Summary

The **Sentient Admin UI** gains a **System Topology & Live Flows** view that:

- Shows the full graph of rooms, controllers, devices, services, and infra
- Streams live events over WebSockets
- Lights up edges and nodes as messages flow
- Provides focused detail per node when selected

This view turns the Admin UI into a **real-time visual cockpit** for the Sentient Engine.
