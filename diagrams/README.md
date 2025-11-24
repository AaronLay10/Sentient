# Sentient Engine Diagrams

This directory contains Mermaid diagram files that can be imported into Lucidchart or other diagramming tools.

## Files

- `high-level-architecture.mmd` - Complete system architecture overview
- `01-controller-registration.mmd` - Controller startup and registration flow
- `02-device-state-change.mmd` - Sensor event processing (hardware → UI)
- `03-device-command.mmd` - Command execution (UI → hardware)
- `04-heartbeat.mmd` - Controller health monitoring
- `05-scene-execution.mmd` - Orchestrated scene choreography
- `06-websocket-broadcast.mmd` - Real-time WebSocket event fanout

## How to Import into Lucidchart

### Method 1: Direct Mermaid Import (Easiest)

1. Open Lucidchart (https://lucid.app)
2. Click **Import Data** or **Import** → **Import from Mermaid**
3. Copy the contents of any `.mmd` file
4. Paste into Lucidchart's Mermaid import dialog
5. Click **Import** and let Lucidchart auto-layout the diagram
6. Customize colors, positioning, and styling as needed

### Method 2: Use Mermaid Live Editor

1. Open Mermaid Live Editor (https://mermaid.live)
2. Paste the `.mmd` file contents
3. Click **Export** → **SVG** or **PNG**
4. Import the exported image into Lucidchart
5. Trace over with Lucidchart shapes for full editability

### Method 3: Manual Recreation

Use the diagrams as reference and manually recreate them in Lucidchart:

- Use **Flowchart** shapes for architecture diagrams
- Use **Sequence Diagram** shapes for flow diagrams
- Apply Sentient brand colors:
  - Primary Cyan: `#00d9ff`
  - Primary Orange: `#ffa832`
  - Dark Background: `#1a2332`
  - Accent Purple: `#8b5cf6`

## Customization Tips

After importing:

- Adjust spacing and alignment for clarity
- Add company logo and branding
- Use containers/swimlanes for grouping
- Add legends for icon/color meanings
- Export as PDF for documentation or presentations

## Source

These diagrams are extracted from:

- `/Users/aaron/Sentient/SENTIENT_DATA_FLOW.md`
- `/Users/aaron/Sentient/SYSTEM_ARCHITECTURE_v4.md`

For detailed explanations of each flow, refer to the main documentation.
