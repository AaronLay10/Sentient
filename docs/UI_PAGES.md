# Sentient UI Pages Documentation

This document outlines all pages in the Sentient escape room management system, their purpose, functionality, and implementation status.

---

## Navigation Structure

The application uses a sidebar navigation pattern with the following hierarchy:

- System Overview
- Power Control
- System Overview
- Power Control
- System Overview
- Power Control
- System Overview
- Power Control

### Configuration & Management
- Scene Editor
- Controllers
- Devices
- Rooms

### Administration
- Clients
- Users

---

## Page Specifications

### 1. Network Topology
**Route:** `/network`
**Icon:** Network (Lucide)
**Status:** ✅ Implemented & Branded
**File:** [apps/sentient-ui/src/pages/NetworkTopology.tsx](apps/sentient-ui/src/pages/NetworkTopology.tsx)

#### Purpose
Real-time visual monitoring system for the entire escape room infrastructure. Provides a bird's-eye view of all controllers, devices, and their interconnections. Central dashboard featuring the animated Sentient Eye logo that serves as both branding and a real-time system health indicator.

#### Key Features
- Network graph visualization showing MQTT broker as central hub
- Live controller status indicators (online/offline/warning)
- Device connection status
- Animated data pulses showing communication flow
- Room status overview cards
- Real-time updates via WebSocket connection
- Large animated Sentient Eye component
  - Health status indication (healthy/warning/critical/offline)
  - 48 radiating circuit traces (cyan inward, orange outward)
  - Rotating outer ring (speeds up with warnings)
- System health metrics
  - Controller statistics (total/online/offline/warnings/errors)
  - Device statistics (total/operational/warnings/errors)
- Live issue feed with severity indicators
- Click-through to issue sources

#### Technical Details
- Uses React Flow for network graph rendering
- WebSocket integration for live updates
- Tanstack Query for data fetching (5s refetch interval)
- Custom node types for controllers, devices, and MQTT broker

---

### 2. System Overview
**Route:** `/overview`
**Icon:** Eye (Lucide)
**Status:** ⚠️ Implemented, Needs Branding
**File:** [apps/sentient-ui/src/pages/SystemOverviewAlt.tsx](apps/sentient-ui/src/pages/SystemOverviewAlt.tsx)

#### Purpose




#### Technical Details
- Tanstack Query for system health aggregation
- SVG-based animated logo with dynamic styling
- Color-coded health states using CSS custom properties
- Real-time data polling

---

### 3. Power Control
**Route:** `/power-control`
**Icon:** Power (Lucide)
**Status:** ⚠️ Implemented, Needs Branding
**File:** [apps/sentient-ui/src/pages/PowerControl.tsx](apps/sentient-ui/src/pages/PowerControl.tsx)

#### Purpose
Dedicated interface for managing room power controllers and their relay-controlled devices.

#### Key Features
- Multi-controller management
  - Power Control Upper Right
  - Power Control Lower Right
  - Power Control Lower Left
- Per-controller device lists
- Individual relay control (on/off switches)
- Controller online/offline status
- Last heartbeat timestamps
- Bulk power operations

#### Technical Details
- Fetches devices from API by controller ID
- WebSocket integration for live controller heartbeats
- Real-time device state updates
- Relay number tracking for hardware mapping

---

### 4. Scene Editor
**Route:** `/scenes`
**Icon:** Clapperboard (Lucide)
**Status:** ✅ Implemented & Branded
**File:** [apps/sentient-ui/src/pages/SceneEditor.tsx](apps/sentient-ui/src/pages/SceneEditor.tsx)

#### Purpose
Visual programming interface for creating automated scene sequences and device choreography.

#### Key Features
- **Node Palette (Left Panel - Cyan themed)**
  - Drag-and-drop node library
  - Categorized node types (Triggers, Actions, Logic, Timing)
  - Search functionality
- **Canvas (Center)**
  - Visual flow editor using React Flow
  - Connect nodes to create logic flows
  - Zoom/pan controls
  - Minimap for navigation
- **Properties Panel (Right Panel - Orange themed)**
  - Selected node properties
  - Configuration forms
  - Validation feedback

#### Technical Details
- React Flow (@xyflow/react) for visual programming
- Custom node types for different action categories
- Drag-and-drop from palette to canvas
- Export/import scene definitions (JSON)
- Glass morphism UI with brand styling

---

### 5. Controllers
**Route:** `/controllers`
**Icon:** Cpu (Lucide)
**Status:** ✅ Branded, Not Implemented
**File:** [apps/sentient-ui/src/pages/Controllers.tsx](apps/sentient-ui/src/pages/Controllers.tsx)

#### Purpose
Manage and monitor all hardware controllers (Raspberry Pi, ESP32, Arduino) in the system.

#### Planned Features
- Controller list with status indicators
- Add/edit/delete controllers
- Controller configuration (IP, credentials, MQTT topics)
- Device assignment to controllers
- Firmware version tracking
- Remote restart/reboot controls
- Log viewer
- Health metrics (CPU, memory, uptime)

#### Data Model
```typescript
interface Controller {
  id: string;
  friendly_name: string;
  controller_type: 'RPI' | 'ESP32' | 'ARDUINO';
  ip_address: string;
  status: 'online' | 'offline' | 'warning' | 'error';
  firmware_version: string;
  last_heartbeat: string;
  uptime: number;
  assigned_devices: number;
}
```

---

### 6. Devices
**Route:** `/devices`
**Icon:** Boxes (Lucide)
**Status:** ✅ Branded, Not Implemented
**File:** [apps/sentient-ui/src/pages/Devices.tsx](apps/sentient-ui/src/pages/Devices.tsx)

#### Purpose
Comprehensive IoT device management for all escape room hardware.

#### Planned Features
- Device inventory with filtering/search
- Add/edit/delete devices
- Device configuration
  - Friendly name
  - Device type (lock, light, sensor, audio, etc.)
  - Category assignment
  - Controller assignment
  - Pin/GPIO mapping
- Device testing controls
- State history viewer
- Bulk operations

#### Data Model
```typescript
interface Device {
  id: string;
  friendly_name: string;
  device_type: string;
  device_category: string;
  controller_id: string;
  status: 'operational' | 'warning' | 'error' | 'offline';
  properties: {
    gpio_pin?: number;
    relay_number?: number;
    i2c_address?: string;
    [key: string]: any;
  };
  last_seen: string;
}
```

---

### 7. Rooms
**Route:** `/rooms`
**Icon:** Layout (Lucide)
**Status:** ✅ Implemented & Branded
**File:** [apps/sentient-ui/src/pages/Rooms.tsx](apps/sentient-ui/src/pages/Rooms.tsx)

#### Purpose
Manage escape rooms and game spaces within the system.

#### Key Features
- Room list with client/venue hierarchy
- Create/edit/delete rooms
- Form validation
- Client and venue selection dropdowns
- Empty state handling
- Loading states

#### Data Model
```typescript
interface Room {
  id: string;
  name: string;
  client_id: string;
  venue_id: string;
  created_at: string;
}
```

#### Technical Details
- Hierarchical data fetching (Clients → Venues → Rooms)
- Cascading dropdowns for data relationships
- RESTful API integration with proper auth headers
- Glass card UI with cyan accents

---

### 8. Clients
**Route:** `/clients`
**Icon:** Building2 (Lucide)
**Status:** ✅ Implemented & Branded
**File:** [apps/sentient-ui/src/pages/Clients.tsx](apps/sentient-ui/src/pages/Clients.tsx)

#### Purpose
Manage customer organizations and escape room operators who use the Sentient system.

#### Key Features
- Client list with creation dates
- Create/edit/delete clients
- Cascade delete warning (deletes all venues, rooms, and data)
- Client ID display for reference
- Timestamp formatting

#### Data Model
```typescript
interface Client {
  id: string;
  name: string;
  created_at: string;
}
```

#### Technical Details
- Top-level entity in the data hierarchy
- Orange-themed branding (complementary to cyan)
- Warning on delete due to cascade implications
- RESTful CRUD operations

---

### 9. Users
**Route:** `/users`
**Icon:** Users (Lucide)
**Status:** ✅ Implemented & Branded
**File:** [apps/sentient-ui/src/pages/Users.tsx](apps/sentient-ui/src/pages/Users.tsx)

#### Purpose
User account and permission management for the Sentient system.

#### Key Features
- User list with role badges
- Create/edit/delete users
- Role-based access control
- Client assignment
- Password management (create only, not shown on edit)
- Color-coded role badges with icons

#### Roles & Permissions
- **OWNER** (Orange badge) - Full system access
- **GM** (Blue badge) - Game Master - Run games and monitor
- **TECH** (Cyan badge) - Technician - Hardware management
- **VIEWER** (Gray badge) - Read-only access

#### Data Model
```typescript
interface User {
  id: string;
  email: string;
  role: 'OWNER' | 'GM' | 'TECH' | 'VIEWER';
  client_id: string;
  created_at: string;
}
```

#### Technical Details
- Password only sent on user creation
- Client dropdown disabled on edit (can't change user's organization)
- Role badges with Shield icon and custom colors
- Cyan-themed primary UI

---

## Design System

### Color Usage by Page
- **Cyan Primary:** Network Topology, Overview, Scene Editor (left panel), Rooms, Users
- **Orange Primary:** Power Control, Scene Editor (right panel), Clients
- **Balanced:** Controllers, Devices (placeholder pages use cyan/orange split)

### Common UI Patterns

#### Page Container
```css
.container {
  background: radial-gradient(circle at 20% 50%, rgba(0, 217, 255, 0.03) 0%, transparent 50%),
              radial-gradient(circle at 80% 50%, rgba(255, 170, 50, 0.03) 0%, transparent 50%),
              var(--bg-primary);
  padding: 40px;
  overflow-y: auto;
}
```

#### Header Pattern
- Icon box (48x48px) with brand color background/border
- Orbitron gradient title (cyan → orange)
- Secondary text subtitle
- Action button (aligned right)

#### Glass Cards
```css
background: rgba(26, 35, 50, 0.8);
backdrop-filter: blur(12px);
border: 1px solid var(--border-color);
box-shadow: 0 0 20px rgba(color, 0.1);
```

#### Form Inputs
- Brand-colored borders on focus
- Uppercase labels with letter-spacing
- 0.3s transitions on all interactive elements
- Cyan or orange glow on focus (0 0 0 3px rgba())

---

## Implementation Priority

### Phase 1: Core Monitoring ✅
- [x] Network Topology
- [x] System Overview (needs branding)
- [x] Scene Editor

### Phase 2: Operations ⚠️
- [x] Power Control (needs branding)
- [ ] Controllers (full implementation)
- [ ] Devices (full implementation)

### Phase 3: Administration ✅
- [x] Rooms
- [x] Clients
- [x] Users

---

## Technical Architecture

### Routing
- React Router v6 with nested routes
- Protected route wrapper for authentication
- DashboardLayout as parent route with `<Outlet />`
- Default redirect: `/` → `/network`

### State Management
- Tanstack Query for server state
- Local React state for UI state
- WebSocket integration via custom hooks
- 5-second refetch intervals for monitoring pages

### Styling
- CSS Modules for component-scoped styles
- CSS Custom Properties for theming
- Glass morphism effects (backdrop-filter)
- Lucide React for consistent iconography

### Data Fetching
- RESTful API: `http://localhost:3001`
- WebSocket: `ws://sentientengine.ai:3002`
- Bearer token authentication via `getAuthToken()`
- Error handling with console logging (production needs improvement)

---

## Future Enhancements

### Controllers Page
- Real-time CPU/memory monitoring
- Network diagnostics
- GPIO pin mapping visualization
- Bulk firmware updates

### Devices Page
- Device testing playground
- State history graphs
- Device grouping/tagging
- Maintenance scheduling


### System Overview
- Predictive health alerts
- Performance trends/graphs
- System uptime tracking
- Capacity planning metrics

---

## Files & Structure

```
apps/sentient-ui/src/
├── pages/
│   ├── NetworkTopology.tsx          # Real-time network visualization
│   ├── NetworkTopology.module.css
│   ├── SystemOverviewAlt.tsx        # Sentient Eye dashboard
│   ├── PowerControl.tsx             # Power controller management
│   ├── SceneEditor.tsx              # Visual scene programming
│   ├── SceneEditor.module.css
│   ├── Controllers.tsx              # Hardware controller CRUD
│   ├── Controllers.module.css
│   ├── Devices.tsx                  # IoT device CRUD
│   ├── Devices.module.css
│   ├── Rooms.tsx                    # Escape room management
│   ├── Rooms.module.css
│   ├── Clients.tsx                  # Customer organization CRUD
│   ├── Clients.module.css
│   ├── Users.tsx                    # User & permission management
│   └── Users.module.css
├── components/
│   ├── Layout/
│   │   └── DashboardLayout.tsx      # Main layout with sidebar
│   ├── SentientEye/
│   │   ├── SentientEye.tsx          # Animated logo component
│   │   └── MiniSentientEye.tsx      # Sidebar logo
│   ├── SceneEditor/
│   │   ├── NodePalette.tsx          # Scene node library
│   │   ├── NodePalette.module.css
│   │   ├── PropertiesPanel.tsx      # Node properties editor
│   │   └── PropertiesPanel.module.css
└── hooks/
    └── useWebSocket.ts              # WebSocket connection hook
```

---

*Last Updated: 2025-01-22*
*Version: 1.0*
