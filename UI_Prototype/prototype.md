Here's a comprehensive summary for Claude Code:

---

## SENTIENT ENGINE - UI/UX Design Summary

### Project Overview
Sentient Engine is a real-time orchestration platform for escape room automation at Paragon Escape Games. It manages 31+ Teensy microcontrollers, MQTT networks, and multi-room audio synchronization across 14 zones in four themed rooms. The system is designed to run rooms autonomously without human game masters.

### Design Direction
**Aesthetic:** Sleek, professional, premium SaaS-style dashboard (NOT sci-fi/Tron)
- Dark theme with warm accents (orange eye, subtle purple/cyan gradients)
- Clean typography: DM Sans + Inter for UI, JetBrains Mono for data
- Card-based layout with soft borders, backdrop blur, rounded corners
- Pastel/muted node colors by room, smooth animations

### Core Views

#### 1. Network Overview Dashboard
**Layout:**
- Top navigation bar with logo (orange eye icon), nav tabs, system status
- Left sidebar: Active Rooms cards, Node Status summary
- Center: Large circular network topology visualization (fills vertical space)
- Right sidebar: System Metrics, Throughput graph, Audio Zones
- Bottom status bar

**Network Visualization:**
- Central orange/amber glowing "eye" representing Sentient core
- Concentric rings with tick marks
- **Controllers** = larger nodes (Teensys, RPis, servers) connected directly to eye
- **Devices** = smaller nodes branching off their parent controllers
- Each room has distinct color: Infrastructure (green), Pharaohs (cyan), Clockwork (amber), Quantum (purple), Haunting (pink)
- Animated pulses travel along connections when heartbeats/sensor events occur
- Hover for tooltip with device details
- Click node to trigger command pulse

**Key Data Displayed:**
- Room status with timers and puzzle progress
- Node counts (controllers, devices, online, warnings)
- System metrics (latency, CPU, memory, MQTT clients, topics)
- Message throughput graph (rolling 60s)
- Audio zone levels (14 zones)

#### 2. Scene Editor (Flow-Based Visual Programming)
**Purpose:** Visually configure scene orchestration - puzzles, effects, audio cues, sensor triggers, timing

**Layout:**
- Left sidebar: Component palette (draggable nodes)
- Center: Canvas with grid background for node placement
- Right sidebar: Scene properties and selected node configuration
- Bottom toolbar: Select, Pan, Zoom, Fit, Delete controls

**Node Types:**
| Type | Color | Examples |
|------|-------|----------|
| Trigger | Orange (#ff8c42) | Scene Start |
| Sensor | Green (#34d399) | Button Press, RFID Scan, Weight Sensor |
| Puzzle | Blue (#6366f1) | Sequence Check, Combination Lock, Pattern Match |
| Effect | Pink (#f472b6) | Lighting, Servo/Motor, Fog Machine, Mag Lock |
| Audio | Cyan (#22d3ee) | Sound Effect, Background Music, Voice Line |
| Logic | Purple (#a78bfa) | Delay, Branch, Loop |
| Timer | Yellow (#fbbf24) | Countdown Timer |

**Node Structure:**
- Header: Icon, title, menu button
- Body: Configurable fields/status
- Ports: Input (left), Output (right), some nodes have multiple outputs (Branch has "Else")

**Interactions:**
- Drag from palette to canvas to create nodes
- Drag nodes to reposition
- Connect output ports to input ports (bezier curves)
- Click to select, properties panel updates
- Delete selected nodes

### Technical Implementation Notes

**For Network View:**
```javascript
// MQTT WebSocket integration pattern
client.subscribe('sentient/+/heartbeat');
client.subscribe('sentient/+/sensor/#');

client.on('message', (topic, payload) => {
    const [, deviceId, eventType] = topic.split('/');
    const node = findNodeById(deviceId);
    if (node) createPulse(node, eventType);
});
```

**Network Data Structure:**
```javascript
const networkDef = [
    { 
        id: 'PHR-M', 
        name: 'Pharaohs Main', 
        type: 'Teensy 4.1', 
        room: 'Pharaohs', 
        devices: [
            { id: 'PHR-SARC', name: 'Sarcophagus', type: 'Servo' },
            { id: 'PHR-T1', name: 'Torch 1', type: 'LED' },
            // ...
        ]
    },
    // ...
];
```

**Scene Editor Data Structure:**
```javascript
const sceneData = {
    nodes: [
        { id: 'node-1', type: 'trigger', subtype: 'scene-start', x: 80, y: 200 },
        { id: 'node-2', type: 'logic', subtype: 'delay', x: 320, y: 120 },
        // ...
    ],
    connections: [
        { from: 'node-1', fromPort: 'output', to: 'node-2', toPort: 'input' },
        // ...
    ]
};
```

### CSS Variables (Design Tokens)
```css
:root {
    --bg-dark: #0d0d12;
    --bg-card: rgba(18, 18, 24, 0.95);
    --bg-hover: rgba(255, 255, 255, 0.03);
    
    --accent-orange: #ff8c42;
    --accent-blue: #6366f1;
    --accent-cyan: #22d3ee;
    --accent-green: #34d399;
    --accent-pink: #f472b6;
    --accent-purple: #a78bfa;
    
    --text-primary: #ffffff;
    --text-secondary: #a1a1aa;
    --text-muted: #52525b;
    
    --border-subtle: rgba(255, 255, 255, 0.06);
    
    --font-sans: 'DM Sans', 'Inter', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
}
```

### Files Created
1. `sentient-sleek.html` - Network Overview Dashboard
2. `sentient-scene-editor.html` - Scene Flow Editor

### Next Steps / Future Views
- **Rooms** - Individual room configuration and status
- **Puzzles** - Puzzle logic configuration
- **Effects** - Effect sequencing and parameters
- **Settings/Config** - System configuration

---

This should give Claude Code everything needed to implement these interfaces in your actual tech stack.