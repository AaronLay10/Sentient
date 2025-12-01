# Sentient Neural Engine - Brand Guidelines

## Overview

The **Sentient Neural Engine** is a distributed control system for escape room automation. Our brand identity is centered around two core visual elements: the **Sentient Eye** and the **Neural Sidebar**, creating a cohesive cybernetic aesthetic that emphasizes real-time monitoring, interconnectivity, and intelligent control.

---

## Logo & Identity

### Primary Logo: The Sentient Eye

The Sentient Eye is our primary brand mark - a hyper-detailed cybernetic eye that serves as both logo and status indicator.

#### Visual Design

**Core Structure:**
- **Sclera (Eye White)**: Dark base with radiating circuit traces
- **Iris**: Multi-layered concentric rings with cyan/orange circuit segments
- **Pupil**: Dark center with highlight for depth
- **Outer Rings**: Rotating HUD elements with tick marks and segments
- **Circuit Traces**: 48 radiating lines in cyan and orange with animated data pulses

**Color Composition:**
- Primary: Cyan (#00d9ff) - represents data flow inward (monitoring)
- Secondary: Orange (#ffaa32) - represents energy flow outward (control)
- Accent: Yellow (#ffcc44) - highlights and circuit nodes
- Background: Dark navy/black gradient

**Animation Behavior:**
- Outer ring rotates continuously (10s rotation)
- Circuit traces pulse with data flow:
  - **Cyan traces**: Data flowing INWARD (system → eye)
  - **Orange traces**: Energy flowing OUTWARD (eye → system)
- Animation speeds: 0.6s - 1.4s per pulse (randomized)
- Scan line sweeps vertically for retro-futuristic effect

#### Health Status Indication

The Sentient Eye dynamically changes to reflect system health:

| Status | Ring Color | Rotation Speed | Iris Glow |
|--------|-----------|----------------|-----------|
| **Healthy** | Cyan + Orange | Normal (10s) | Cyan soft glow |
| **Warning** | Orange + Yellow | Faster (6s) | Orange pulsing |
| **Critical** | Red + Dark Red | Fastest (3s) | Red intense glow |
| **Offline** | Gray | Stopped | No glow |

#### Usage Guidelines

**Sidebar Logo (MiniSentientEye)**
- Size: 120px × 120px
- Placement: Top center of sidebar
- Animation: Always active when system is online
- Paired with "SENTIENT" wordmark below

**Page Headers/Status Displays**
- Minimum size: 64px × 64px
- Use as real-time health indicator
- Always animate when displaying live data
- Maintain cyan/orange color balance

**Never:**
- Use static images (eye must always animate when online)
- Change the cyan/orange ratio (50/50 balance is brand identity)
- Remove circuit traces (they're essential to the design)
- Use on light backgrounds (design requires dark canvas)

---

## Navigation System: The Neural Sidebar

The sidebar is the command center for the entire Sentient system, designed with precision and clarity.

### Visual Characteristics

**Structure:**
- Width: Fixed 280px
- Background: Dark panel with subtle glow border
- Corner brackets: Decorative technical elements
- Neural grid background: Subtle circuit pattern
- Scanning line: Animated vertical sweep

**Header Section:**
- Mini Sentient Eye (120px) - centered logo/status indicator
- "SENTIENT" wordmark in Orbitron font with cyan gradient
- "Neural Engine" subtitle in muted text

**Navigation Links:**
- Icon + Label format (Lucide icons, 20px)
- Active state: Cyan glow and bright text
- Hover state: Subtle cyan border glow
- Font: Rajdhani for labels, maintaining readability

**Footer Section:**
- System version display
- Muted styling for non-critical info

### Navigation Icon System

We use **Lucide React** icons exclusively for consistency. All icons are 20px with 2px stroke weight.

| Feature | Icon | Reasoning |
|---------|------|-----------|
| **Network Topology** | Network | Visual network/nodes concept |
| **Overview** | Eye | Matches Sentient Eye brand |
| **GM Console** | Activity | Real-time monitoring waves |
| **Power Control** | Power | Electrical power symbol |
| **Scene Editor** | Clapperboard | Film/scene direction |
| **Controllers** | Cpu | Hardware/processor |
| **Devices** | Boxes | Multiple connected items |
| **Rooms** | Layout | Architectural layout |
| **Clients** | Building2 | Company/organization |
| **Users** | Users | People management |

### Sidebar CSS Utilities

**Glow Border:**
```css
.glow-border {
  border: 1px solid rgba(0, 217, 255, 0.15);
  box-shadow: 0 0 20px rgba(0, 217, 255, 0.1);
}
```

**Corner Brackets:**
Decorative technical elements in the corners using pseudo-elements:
```css
.corner-brackets::before,
.corner-brackets::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  border: 2px solid var(--accent-cyan);
}
```

**Active Navigation Link:**
```css
.nav-link.active {
  color: var(--accent-cyan);
  background: rgba(0, 217, 255, 0.1);
  border-left: 3px solid var(--accent-cyan);
  box-shadow: 0 0 15px rgba(0, 217, 255, 0.3);
}
```

---

## Color Palette

### Primary Colors (Sentient Eye Inspired)

Our color palette is extracted from the Sentient Eye logo, creating a cohesive cybernetic aesthetic.

| Color Name | Hex Code | RGB | Usage |
|------------|----------|-----|-------|
| **Cyan (Primary)** | `#00d9ff` | `0, 217, 255` | Primary accent, links, active states, primary buttons |
| **Orange (Secondary)** | `#ffaa32` | `255, 170, 50` | Warnings, secondary accents, energy indicators |
| **Yellow (Highlight)** | `#ffcc44` | `255, 204, 68` | Highlights, important notifications, progress |
| **Green (Success)** | `#00ff88` | `0, 255, 136` | Healthy status, success states, online indicators |
| **Red (Critical)** | `#ff3355` | `255, 51, 85` | Errors, critical alerts, offline states |

### Background Colors

| Color Name | Hex Code | RGB | Usage |
|------------|----------|-----|-------|
| **BG Primary** | `#0a0e1a` | `10, 14, 26` | Main background, body |
| **BG Secondary** | `#0f1419` | `15, 20, 25` | Secondary panels, input backgrounds |
| **BG Tertiary** | `#151b26` | `21, 27, 38` | Raised surfaces, hover states |
| **BG Card** | `#1a2332` | `26, 35, 50` | Cards, modals, elevated content |

### Status Colors

| Status | Color | Hex | Usage |
|--------|-------|-----|-------|
| **Healthy** | Green | `#00ff88` | Online systems, successful operations |
| **Warning** | Orange | `#ffaa32` | Degraded performance, non-critical issues |
| **Critical** | Red | `#ff3355` | Failures, errors, offline systems |
| **Offline** | Gray | `#666677` | Disconnected, inactive systems |
| **Unknown** | Purple-Gray | `#8888aa` | Uncertain state, initializing |

### Text Colors

| Color Name | Hex Code | Usage |
|------------|----------|-------|
| **Text Primary** | `#e8f0ff` | Main content, headings |
| **Text Secondary** | `#a8b8d8` | Supporting text, labels |
| **Text Muted** | `#6677aa` | Disabled text, metadata |

---

## Typography

### Font Families

#### Orbitron (Display/Headers)
- **Usage**: Headings (H1-H6), buttons, labels, technical displays
- **Weights**: 400, 500, 600, 700, 800, 900
- **Characteristics**: Futuristic, geometric, tech-forward
- **Letter Spacing**: 0.05em - 0.1em
- **Text Transform**: UPPERCASE for maximum impact

**Example:**
```css
h1 {
  font-family: 'Orbitron', monospace;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
```

#### Rajdhani (Body Text)
- **Usage**: Body copy, paragraphs, UI text, data displays
- **Weights**: 300, 400, 500, 600, 700
- **Characteristics**: Clean, readable, modern
- **Line Height**: 1.6

**Example:**
```css
body {
  font-family: 'Rajdhani', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  line-height: 1.6;
}
```

### Typography Scale

| Element | Font | Size | Weight | Transform |
|---------|------|------|--------|-----------|
| **H1** | Orbitron | 2.5rem (40px) | 700 | UPPERCASE |
| **H2** | Orbitron | 2rem (32px) | 700 | UPPERCASE |
| **H3** | Orbitron | 1.5rem (24px) | 600 | UPPERCASE |
| **H4** | Orbitron | 1.25rem (20px) | 600 | UPPERCASE |
| **Body** | Rajdhani | 1rem (16px) | 400 | None |
| **Small** | Rajdhani | 0.875rem (14px) | 400 | None |
| **Button** | Orbitron | 0.875rem (14px) | 600 | UPPERCASE |

### Gradient Headers

H1 headers use a signature gradient for maximum brand impact:
```css
h1 {
  background: linear-gradient(135deg, #00d9ff, #ffaa32, #00d9ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 20px rgba(0, 217, 255, 0.3);
}
```

---

## Visual Effects

### Glow Effects

Glows are a signature element of the Sentient brand, creating depth and energy.

| Glow Type | CSS Value | Usage |
|-----------|-----------|-------|
| **Cyan Glow** | `0 0 20px rgba(0, 217, 255, 0.3), 0 0 40px rgba(0, 217, 255, 0.15)` | Primary elements, active states |
| **Orange Glow** | `0 0 20px rgba(255, 170, 50, 0.3), 0 0 40px rgba(255, 170, 50, 0.15)` | Warnings, energy indicators |
| **Yellow Glow** | `0 0 20px rgba(255, 204, 68, 0.3), 0 0 40px rgba(255, 204, 68, 0.15)` | Highlights, focus states |
| **Green Glow** | `0 0 20px rgba(0, 255, 136, 0.3), 0 0 40px rgba(0, 255, 136, 0.15)` | Healthy status, success |
| **Red Glow** | `0 0 20px rgba(255, 51, 85, 0.3), 0 0 40px rgba(255, 51, 85, 0.15)` | Critical alerts, errors |

### Shadows

| Shadow Type | CSS Value | Usage |
|-------------|-----------|-------|
| **Small** | `0 2px 8px rgba(0, 0, 0, 0.4)` | Subtle elevation |
| **Medium** | `0 4px 16px rgba(0, 0, 0, 0.6)` | Cards, panels |
| **Large** | `0 8px 32px rgba(0, 0, 0, 0.8)` | Modals, popovers |

### Glass Effects

For overlays and floating panels:
```css
.glass-effect {
  background: rgba(26, 35, 50, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 217, 255, 0.15);
}
```

---

## Animations

### Standard Animations

| Animation | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| **Pulse** | 2s | ease-in-out | Status indicators, heartbeat effects |
| **Scan** | 3s | linear | Loading states, progress indicators |
| **Rotate** | 1s | linear | Spinners, loading circles |
| **Glow Pulse** | 2s | ease-in-out | Active elements, focus states |

### Pulse Animation (Signature)
```css
@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(0.95);
  }
}
```

### Interactive Transitions
- **Hover States**: 0.3s ease
- **Click/Active**: Instant (0s)
- **Page Transitions**: 0.4s ease-in-out
- **Modal Fade**: 0.2s ease

---

## UI Components

### Buttons

**Primary Button:**
```css
.btn-primary {
  font-family: 'Orbitron', monospace;
  padding: 0.75rem 1.5rem;
  border: 1px solid #00d9ff;
  background: transparent;
  color: #00d9ff;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  background: #00d9ff;
  color: #0a0e1a;
  box-shadow: 0 0 20px rgba(0, 217, 255, 0.3);
  transform: translateY(-2px);
}
```

**Secondary Button:**
- Use orange accent (`#ffaa32`)
- Same structure as primary

### Cards

```css
.card {
  background: #1a2332;
  border: 1px solid rgba(0, 217, 255, 0.15);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
  transition: all 0.3s ease;
}

.card:hover {
  border-color: rgba(0, 217, 255, 0.4);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8),
              0 0 20px rgba(0, 217, 255, 0.3);
  transform: translateY(-2px);
}
```

### Status Indicators

```css
.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
  animation: pulse 2s ease-in-out infinite;
}

.status-dot.healthy {
  background: #00ff88;
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
}
```

### Inputs

```css
input, textarea, select {
  font-family: 'Rajdhani', sans-serif;
  background: #0f1419;
  border: 1px solid rgba(0, 217, 255, 0.15);
  color: #e8f0ff;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  transition: all 0.3s ease;
}

input:focus {
  outline: none;
  border-color: #00d9ff;
  box-shadow: 0 0 0 3px rgba(0, 217, 255, 0.3);
}
```

---

## Background Patterns

### Neural Grid

A subtle grid pattern that reinforces the "neural network" concept:

```css
.neural-grid {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image:
    linear-gradient(rgba(0, 217, 255, 0.15) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 217, 255, 0.15) 1px, transparent 1px);
  background-size: 50px 50px;
  opacity: 0.1;
  pointer-events: none;
}
```

---

## Layout Patterns

### Neural Grid Background

A signature element that appears throughout the interface:

```css
.neural-grid {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image:
    linear-gradient(rgba(0, 217, 255, 0.15) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 217, 255, 0.15) 1px, transparent 1px);
  background-size: 50px 50px;
  opacity: 0.1;
  pointer-events: none;
}
```

### Circuit Background

Alternative background for panels and cards:

```css
.circuit-bg {
  background: radial-gradient(circle at 20% 50%, rgba(0, 217, 255, 0.03) 0%, transparent 50%),
              radial-gradient(circle at 80% 50%, rgba(255, 170, 50, 0.03) 0%, transparent 50%),
              #0a0e1a;
}
```

### Scan Line Effect

Animated scanning line for retro-futuristic feel:

```css
.scan-line {
  position: absolute;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(0, 217, 255, 0.6) 50%,
    transparent 100%);
  animation: scan 3s linear infinite;
}

@keyframes scan {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
}
```

---

## Accessibility

### Contrast Ratios
- **Body Text**: Minimum 7:1 (AAA)
- **Large Text**: Minimum 4.5:1 (AA)
- **Interactive Elements**: Minimum 3:1

### Focus States
All interactive elements must have visible focus indicators:
- 3px glow in primary cyan
- Border color change to cyan
- Subtle scale/transform

### Motion
- Respect `prefers-reduced-motion` media query
- Provide static alternatives to animated content
- Keep critical animations < 3s duration

---

## Voice & Tone

### Brand Voice
- **Technical**: Precise, data-driven, intelligent
- **Confident**: Authoritative without being cold
- **Futuristic**: Forward-thinking, cutting-edge
- **Efficient**: Clear, concise, no-nonsense

### UI Copy Guidelines
- Use technical terminology appropriately
- Avoid unnecessary jargon when simpler words suffice
- Status messages should be actionable: "Controller PHR-M offline. Check network connection."
- Error messages should guide resolution: "MQTT connection failed. Retry in 5s..."
- ALL-CAPS for alerts and critical states
- Sentence case for body text and descriptions

### Examples
- ✅ "MQTT Broker Online • 47 Clients Connected"
- ✅ "Scene executing: Opening Sequence (Node 3/8)"
- ✅ "Controller PHR-M • Status: HEALTHY • Latency: 12ms"
- ❌ "Everything is working great!" (too casual)
- ❌ "An error occurred" (not specific enough)

---

## File Naming Conventions

### Design Assets
- Logo: `sentient-eye-logo.svg`, `sentient-eye-logo.png`
- Icons: `icon-{name}-{size}.svg` (e.g., `icon-device-24.svg`)
- Backgrounds: `bg-{variant}.png` (e.g., `bg-neural-grid.png`)

### Code Assets
- Components: PascalCase (e.g., `SentientEye.tsx`)
- Styles: kebab-case (e.g., `sentient-eye.module.css`)
- Utilities: camelCase (e.g., `formatDeviceStatus.ts`)

---

## Implementation Notes

### CSS Custom Properties
All brand colors and values are defined as CSS custom properties in `:root`:
```css
:root {
  --accent-cyan: #00d9ff;
  --accent-orange: #ffaa32;
  --bg-primary: #0a0e1a;
  /* ... etc */
}
```

### Dark Mode
The Sentient brand is inherently dark-themed. No light mode alternative is currently planned, as the cyberpunk aesthetic requires a dark canvas.

---

## Core Design Principles

### 1. Always Animated
The Sentient brand is alive. Static elements feel dead:
- The eye always pulses when the system is online
- Scan lines continuously sweep
- Status indicators pulse with their health state
- Navigation highlights glow on hover

### 2. Cyan + Orange Balance
These two colors define the Sentient identity:
- **Cyan**: Data, monitoring, intelligence (cool/analytical)
- **Orange**: Energy, control, power (warm/active)
- Maintain 50/50 balance in major visual elements
- Never use one without the other nearby

### 3. Dark Canvas Required
The brand cannot exist on light backgrounds:
- Glows need darkness to be visible
- Circuit traces require contrast
- Deep blacks enhance the "neural" aesthetic
- Light mode is not supported

### 4. Technical Precision
Every element has purpose and meaning:
- Numbers and data are accurate, not decorative
- Icons represent actual system functions
- Animations reflect real system states
- No arbitrary decorations

### 5. Cyberpunk, Not Sci-Fi
The aesthetic is near-future cybernetic, not distant sci-fi:
- Circuit boards, not holograms
- Industrial tech, not sleek minimalism
- Functional monitoring, not flashy displays
- Grounded in real control systems

---

## Implementation Checklist

When creating new components or pages:

- [ ] Uses CSS custom properties from `:root`
- [ ] Implements neural grid background
- [ ] Uses Orbitron for headings, Rajdhani for body
- [ ] Includes cyan accent color
- [ ] Includes orange accent color
- [ ] Has appropriate glow effects
- [ ] Animates on interaction (hover, focus, active)
- [ ] Uses Lucide icons if icons needed
- [ ] Maintains dark background (#0a0e1a or darker)
- [ ] Status indicators use health color system
- [ ] Respects the 280px sidebar width
- [ ] Interactive elements have 0.3s transitions

---

## Quick Reference

### Key Colors
- **Primary Cyan**: `#00d9ff`
- **Secondary Orange**: `#ffaa32`
- **Background**: `#0a0e1a`
- **Text**: `#e8f0ff`

### Key Fonts
- **Display**: Orbitron (700 weight, UPPERCASE)
- **Body**: Rajdhani (400 weight, normal case)

### Key Animations
- **Pulse**: 2s ease-in-out infinite
- **Scan**: 3s linear infinite
- **Rotate**: 10s (eye ring)
- **Transition**: 0.3s ease (interactive elements)

### Key Components
- **Sentient Eye**: Animated logo/health indicator (120px sidebar, 64px+ elsewhere)
- **Neural Grid**: 50px grid pattern background at 0.1 opacity
- **Sidebar**: 280px fixed width with cyan glow border
- **Nav Links**: Icon (20px) + Label with active state glow

---

**Last Updated**: November 22, 2025
**Version**: 2.0 (Focused on Eye + Sidebar)
**Maintained By**: Sentient Development Team
