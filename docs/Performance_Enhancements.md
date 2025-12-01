# UI Animation Performance Analysis & Optimization Plan

**Date:** November 27, 2025  
**Issue:** Sentient Eye animations smooth on LAN but glitchy/laggy over internet  
**Affected Components:** SentientEye, MessagePulse, Overview page, NetworkCanvas  

---

## Executive Summary

The Sentient UI exhibits significant performance degradation when accessed over internet connections compared to LAN. Root cause analysis identified **48 CPU-intensive SVG `<animateMotion>` elements**, **51-keyframe CSS animations without GPU acceleration**, and **unlimited WebSocket pulse creation** triggering React re-renders at 60fps. Network latency amplifies the problem by causing burst arrivals of WebSocket events, creating 10-20 simultaneous animations that overwhelm the browser's rendering pipeline.

**Key Metrics:**
- Circuit traces: **48** (target: **16**)
- Iris critical keyframes: **51** (target: **10**)
- WebSocket event storage: **100** (target: **20**)
- Pulse creation: **Unlimited** (target: **1 per 300ms, max 20 concurrent**)
- GPU acceleration: **None** (target: **All transforms**)

---

## Problem Analysis

### 1. Sentient Eye Component Bottlenecks

**File:** `apps/sentient-ui/src/components/SentientEye/SentientEye.tsx`

#### Circuit Traces (Line 167)
```tsx
{Array.from({ length: 48 }).map((_, i) => {
  // Each trace has 2-3 path segments with kinks
  // Each trace has an SVG <animateMotion> traveling dot
```

**Issues:**
- **48 simultaneous SVG `<animateMotion>` elements** running on CPU
- Each animates for 0.63s to 1.43s with random delays
- No GPU acceleration hints
- Creates 48 separate animation timelines

**Impact:** SVG `<animateMotion>` is CPU-bound and cannot be GPU-accelerated. High computational cost for path interpolation.

---

### 2. CSS Animation Complexity

**File:** `apps/sentient-ui/src/components/SentientEye/SentientEye.css`

#### Iris Animations

| Animation | Duration | Keyframes | Properties | GPU Accelerated |
|-----------|----------|-----------|------------|-----------------|
| `iris-analyzing` | 30s | **28** | `transform: translate()` | ❌ |
| `iris-warning` | 20s | **22** | `transform: translate()` | ❌ |
| `iris-critical` | 10s | **51** | `transform: translate()` | ❌ |
| `rotating-outer-ring` | 9s/6s/3s | 2 | `transform: rotate()` | ⚠️ Partial |

**Critical Issue - `iris-critical` (Lines 370-473):**
```css
@keyframes iris-critical {
  0%, 1% { transform: translate(-50%, -50%); }
  2%, 3% { transform: translate(-75%, -30%); }
  4%, 5% { transform: translate(-25%, -75%); }
  /* ... 48 MORE POSITION CHANGES ... */
  100% { transform: translate(-50%, -50%); }
}
```

**Problems:**
- **51 keyframe steps** = 5.1 position changes per second
- Uses `translate(x, y)` instead of GPU-accelerated `translate3d(x, y, 0)`
- No `will-change` property to hint browser optimization
- No `transform-origin: center` set explicitly
- Recalculates layout on every keyframe

**Why This Matters Over Internet:**
- High latency causes frame drops
- Browser must recalculate transform matrix 5.1 times/second
- Without GPU acceleration, all calculations on main thread
- Competing with WebSocket event processing

---

### 3. MessagePulse React State-Based Animation

**File:** `apps/sentient-ui/src/components/NetworkTopology/MessagePulse.tsx`

#### Current Implementation (Lines 23-39)
```tsx
const animate = () => {
  const elapsed = Date.now() - startTime;
  const newProgress = Math.min(elapsed / duration, 1);
  
  setProgress(newProgress); // ⚠️ TRIGGERS RE-RENDER EVERY FRAME
  
  if (newProgress < 1) {
    requestAnimationFrame(animate);
  } else {
    onComplete(pulse.id);
  }
};

requestAnimationFrame(animate);
```

**Issues:**
- `setProgress()` triggers React re-render **60 times per second**
- Each pulse runs for 600-800ms
- Multiple pulses = multiple `requestAnimationFrame` loops
- Blocks main thread during state updates
- Cannot be GPU-accelerated (JavaScript-driven)

**Calculation:**
- 10 concurrent pulses × 60fps = **600 state updates per second**
- Each update: React reconciliation → virtual DOM diff → real DOM update

**Over Internet:**
- Latency causes burst arrivals (10-20 events at once)
- Suddenly 10-20 new pulses created simultaneously
- 600-1200 state updates/second during bursts
- Main thread blocked → animation stutters

---

### 4. Unlimited Pulse Creation

**File:** `apps/sentient-ui/src/pages/Overview.tsx`

#### Controller-to-Eye Pulses (Lines 268-302)
```tsx
useEffect(() => {
  if (!wsEvents.length || !controllerNodes.length) return;
  const latestEvent = wsEvents[0];
  
  // ⚠️ NO THROTTLING - creates pulse for EVERY event
  setMessagePulses(prev => [...prev, {
    id: pulseId,
    fromX: node.x,
    fromY: node.y,
    toX: 0,
    toY: 0,
    type: 'controller-to-eye',
    createdAt: Date.now(),
  }]);
}, [wsEvents, controllerNodes]);
```

#### Device-to-Controller Pulses (Lines 304-347)
```tsx
useEffect(() => {
  if (!wsEvents.length) return;
  const latestEvent = wsEvents[0];
  
  // ⚠️ NO THROTTLING - creates pulse for EVERY device event
  setMessagePulses(prev => [...prev, { /* ... */ }]);
}, [wsEvents, deviceNodes, controllerNodes]);
```

**Issues:**
- **Zero throttling or debouncing**
- Every `controller_heartbeat`, `device_state_changed`, etc. creates new pulse
- With 34 controllers + 212 devices, high event frequency
- Pulse array has **no maximum size limit**

**Real-World Scenario:**
```
Network hiccup → 5 seconds of buffered events
34 controllers × 5 heartbeats = 170 events
212 devices × 2 state changes = 424 events
Total: 594 pulses created in burst
Each pulse: 600-800ms animation
Result: Massive DOM churn, 35,000+ state updates
```

---

### 5. WebSocket Event Storage

**File:** `apps/sentient-ui/src/hooks/useWebSocket.ts`

#### Event Array (Line 56)
```tsx
setEvents((prev) => [message.data!, ...prev].slice(0, 100));
```

**Current State:**
- Stores last **100 events** in array
- Triggers re-render on every new event
- Array spread creates new array (memory allocation)

**Issues:**
- 100-item array is excessive for UI needs
- Every WebSocket message triggers state update
- Spreads entire array on every event
- High memory churn during bursts

---

## Performance Impact Over Internet

### Network Latency Amplification Effect

**LAN (Low Latency):**
```
Event arrives → Process → Render (5-10ms)
Smooth stream, spaced 100-500ms apart
Animations run continuously without stutters
```

**WAN (High Latency - 100-300ms):**
```
Events buffer → Burst arrival → Process all → Massive re-render
10-20 events arrive simultaneously
10-20 new pulses created at once
600-1200 state updates/second spike
Browser rendering pipeline overwhelmed
Animations stutter, frames dropped
```

### Browser Rendering Pipeline Blocking

**Without Optimizations:**
1. WebSocket burst arrives (10-20 events)
2. React state updates (10-20 `setMessagePulses` calls)
3. Virtual DOM reconciliation (10-20 new components)
4. Real DOM updates (10-20 new pulse divs)
5. Layout recalculation (pulse positions)
6. Paint (pulse colors, shadows)
7. Composite (layer management)
8. **Meanwhile:** 48 SVG `<animateMotion>` calculating paths on CPU
9. **Meanwhile:** 51-keyframe iris animation recalculating transforms
10. **Meanwhile:** 10-20 `requestAnimationFrame` loops updating React state

**Result:** Main thread saturated, frame budget (16.67ms @ 60fps) exceeded, animations stutter.

---

## Optimization Plan

### Priority 1: Reduce Animation Count (High Impact)

#### A. Reduce Circuit Traces from 48 to 16

**File:** `apps/sentient-ui/src/components/SentientEye/SentientEye.tsx` (Line 167)

**Change:**
```tsx
// Before
{Array.from({ length: 48 }).map((_, i) => {

// After
{Array.from({ length: 16 }).map((_, i) => {
```

**Impact:** 
- Reduces `<animateMotion>` CPU load by **66%**
- Cuts SVG path calculation cost by **66%**
- Visual impact minimal (still plenty of circuit traces for effect)

---

#### B. Simplify Iris Critical Animation

**File:** `apps/sentient-ui/src/components/SentientEye/SentientEye.css` (Lines 370-473)

**Change:** Reduce from 51 keyframes to 10 strategic positions
```css
@keyframes iris-critical {
  0% { transform: translate3d(-50%, -50%, 0); }
  10% { transform: translate3d(-75%, -30%, 0); }
  20% { transform: translate3d(-25%, -75%, 0); }
  30% { transform: translate3d(-80%, -60%, 0); }
  40% { transform: translate3d(-20%, -40%, 0); }
  50% { transform: translate3d(-50%, -80%, 0); }
  60% { transform: translate3d(-70%, -20%, 0); }
  70% { transform: translate3d(-30%, -70%, 0); }
  80% { transform: translate3d(-60%, -40%, 0); }
  90% { transform: translate3d(-40%, -60%, 0); }
  100% { transform: translate3d(-50%, -50%, 0); }
}
```

**Impact:**
- Reduces keyframe calculations by **80%**
- Uses `translate3d()` for GPU acceleration
- Still conveys "erratic scanning" effect

---

### Priority 2: Add GPU Acceleration (High Impact)

#### A. Add will-change Hints

**File:** `apps/sentient-ui/src/components/SentientEye/SentientEye.css`

**Changes:**
```css
.eye-iris {
  position: absolute;
  width: 80px;
  height: 80px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  will-change: transform; /* ← ADD THIS */
}

.rotating-outer-ring {
  animation: rotate 9s linear infinite;
  transform-origin: center;
  will-change: transform; /* ← ADD THIS */
}
```

**Impact:**
- Hints browser to create GPU layer
- Isolates animation from main rendering
- Reduces paint/layout recalculations

---

#### B. Convert All Transforms to translate3d

**File:** `apps/sentient-ui/src/components/SentientEye/SentientEye.css`

**Changes:** Apply to all iris animations (lines 179-473)
```css
/* Before */
@keyframes iris-analyzing {
  0%, 12% { transform: translate(-50%, -50%); }
  13%, 15% { transform: translate(-82%, -76%); }
}

/* After */
@keyframes iris-analyzing {
  0%, 12% { transform: translate3d(-50%, -50%, 0); }
  13%, 15% { transform: translate3d(-82%, -76%, 0); }
}
```

**Why:** `translate3d()` forces GPU compositing layer, `translate()` stays on CPU.

---

### Priority 3: Convert MessagePulse to Pure CSS (Critical)

#### Replace React State Animation with CSS

**File:** `apps/sentient-ui/src/components/NetworkTopology/MessagePulse.tsx`

**Current (Lines 23-39):**
```tsx
const animate = () => {
  setProgress(newProgress); // 60fps re-renders
  requestAnimationFrame(animate);
};
```

**New Implementation:**
```tsx
import { useEffect, useRef } from 'react';
import './MessagePulse.css';

export const MessagePulse: React.FC<MessagePulseProps> = ({ pulse, onComplete }) => {
  const duration = pulse.type === 'device-to-controller' ? 600 : 800;
  const pulseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Just wait for CSS animation to complete
    const timer = setTimeout(() => {
      onComplete(pulse.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [pulse.id, duration, onComplete]);

  // Calculate line angle/length once
  const dx = pulse.toX - pulse.fromX;
  const dy = pulse.toY - pulse.fromY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return (
    <div
      ref={pulseRef}
      className="message-pulse"
      style={{
        '--from-x': `${pulse.fromX}px`,
        '--from-y': `${pulse.fromY}px`,
        '--to-x': `${pulse.toX}px`,
        '--to-y': `${pulse.toY}px`,
        '--duration': `${duration}ms`,
        left: pulse.fromX,
        top: pulse.fromY,
        width: length,
        transform: `rotate(${angle}deg)`,
      } as React.CSSProperties}
    >
      <div className="pulse-dot" />
    </div>
  );
};
```

**New CSS File:** `apps/sentient-ui/src/components/NetworkTopology/MessagePulse.css`
```css
.message-pulse {
  position: absolute;
  height: 2px;
  pointer-events: none;
  contain: layout style paint; /* Isolate rendering */
}

.pulse-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(0, 255, 255, 0.8);
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.6);
  will-change: transform;
  
  /* Pure CSS animation - NO JavaScript! */
  animation: pulse-travel var(--duration, 800ms) linear forwards;
}

@keyframes pulse-travel {
  from {
    transform: translateX(0) scale(0.5);
    opacity: 0;
  }
  10% {
    opacity: 1;
    transform: translateX(10%) scale(1);
  }
  90% {
    opacity: 1;
    transform: translateX(90%) scale(1);
  }
  to {
    opacity: 0;
    transform: translateX(100%) scale(0.5);
  }
}
```

**Impact:**
- **Eliminates 600-1200 React state updates per second**
- GPU-accelerated via `will-change: transform`
- Offloads animation to compositor thread
- Frees main thread for WebSocket processing
- **Massive performance gain**

---

### Priority 4: Throttle Pulse Creation (High Impact)

#### Add Rate Limiting to Overview Page

**File:** `apps/sentient-ui/src/pages/Overview.tsx`

**Add at top of component (after other hooks):**
```tsx
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';

// ... existing state ...

// Throttle pulse creation
const lastPulseTime = useRef(0);
const MAX_CONCURRENT_PULSES = 20;
```

**Modify controller pulse creation (Line 268):**
```tsx
useEffect(() => {
  if (!wsEvents.length || !controllerNodes.length) return;
  
  // Throttle: max 1 pulse per 300ms
  const now = Date.now();
  if (now - lastPulseTime.current < 300) return;
  
  // Limit concurrent pulses
  if (messagePulses.length >= MAX_CONCURRENT_PULSES) return;
  
  lastPulseTime.current = now;
  
  const latestEvent = wsEvents[0];
  // ... rest of pulse creation logic ...
}, [wsEvents, controllerNodes, messagePulses.length]);
```

**Apply same throttling to device pulses (Line 304).**

**Impact:**
- Maximum **3.3 pulses per second** (vs unlimited)
- Caps concurrent pulses at **20** (vs 100+)
- Prevents burst overload
- Smooth animation even during network hiccups

---

### Priority 5: Reduce Memory Overhead (Medium Impact)

#### A. Reduce WebSocket Event Storage

**File:** `apps/sentient-ui/src/hooks/useWebSocket.ts` (Line 56)

**Change:**
```tsx
// Before
setEvents((prev) => [message.data!, ...prev].slice(0, 100));

// After
setEvents((prev) => [message.data!, ...prev].slice(0, 20));
```

**Impact:**
- Reduces memory by **80%**
- Fewer array allocations per event
- 20 events is sufficient for UI display

---

#### B. Add CSS Containment

**Files:** All component CSS files

**Add to key animated elements:**
```css
.sentient-eye-container {
  contain: layout style paint;
}

.message-pulse {
  contain: layout style paint;
}

.controller-node {
  contain: layout style;
}

.device-node {
  contain: layout style;
}
```

**Impact:**
- Isolates rendering calculations
- Prevents cascade of layout recalculations
- Browser can optimize each container independently

---

## Implementation Checklist

### Phase 1: Quick Wins (1-2 hours)
- [ ] Reduce circuit traces from 48 to 16
- [ ] Add `will-change: transform` to `.eye-iris` and `.rotating-outer-ring`
- [ ] Reduce WebSocket event storage from 100 to 20
- [ ] Add pulse throttling (300ms, max 20 concurrent)

### Phase 2: Critical Optimizations (2-4 hours)
- [ ] Convert all `translate()` to `translate3d()` in iris animations
- [ ] Simplify `iris-critical` from 51 to 10 keyframes
- [ ] Rewrite MessagePulse to use pure CSS animation
- [ ] Remove `requestAnimationFrame` state updates

### Phase 3: Polish (1-2 hours)
- [ ] Add CSS containment to all animated components
- [ ] Test on throttled connection (Chrome DevTools: Fast 3G)
- [ ] Measure frame rate improvements
- [ ] Document performance metrics

---

## Testing Strategy

### Local Testing
```bash
# Chrome DevTools → Network → Throttling → Fast 3G
# Performance panel → Record → Check frame rate

# Before optimization target: 20-30 FPS over throttled connection
# After optimization target: 55-60 FPS over throttled connection
```

### Metrics to Track
1. **Frame Rate:** Chrome Performance panel
2. **Main Thread Activity:** Reduce yellow/red blocks
3. **GPU Memory:** Layers panel (should see composited layers)
4. **DOM Node Count:** Performance monitor (should stay <5000)
5. **React Component Renders:** React DevTools Profiler

### Real-World Testing
- LAN vs WAN comparison
- Mobile device testing (lower GPU power)
- Multiple concurrent users (load testing)

---

## Alternative Approaches (Future Consideration)

### Option A: Performance Mode Toggle
Add user preference to reduce animation complexity:
```tsx
const [performanceMode, setPerformanceMode] = useState<'low' | 'medium' | 'high'>('high');

// Adjust based on mode:
// - Low: 8 circuit traces, simplified iris, no pulses
// - Medium: 16 circuit traces, 10 keyframes, throttled pulses
// - High: 24 circuit traces, full animations
```

### Option B: Auto-Detect Network Latency
Measure WebSocket round-trip time and auto-adjust:
```tsx
useEffect(() => {
  const ping = Date.now() - lastEventTimestamp;
  if (ping > 200) {
    // Switch to low-performance mode
    setCircuitTraces(8);
    setMaxPulses(10);
  }
}, [lastEventTimestamp]);
```

### Option C: Progressive Enhancement
Start with minimal animations, add complexity if frame rate stable:
```tsx
const [fps, setFps] = useState(60);

useEffect(() => {
  // Monitor frame rate
  if (fps > 55) {
    // Can handle more animations
    setCircuitTraces(prev => Math.min(prev + 4, 24));
  } else if (fps < 30) {
    // Reduce load
    setCircuitTraces(prev => Math.max(prev - 4, 8));
  }
}, [fps]);
```

---

## Expected Results

### Before Optimization
- **Circuit traces:** 48 SVG `<animateMotion>` elements
- **Iris animation:** 51 keyframes, CPU-bound
- **MessagePulse:** 600-1200 state updates/second during bursts
- **Pulse creation:** Unlimited, no throttling
- **Frame rate over internet:** 15-25 FPS (choppy)
- **Main thread:** Saturated during WebSocket bursts

### After Optimization
- **Circuit traces:** 16 (66% reduction)
- **Iris animation:** 10 keyframes, GPU-accelerated
- **MessagePulse:** 0 state updates (pure CSS)
- **Pulse creation:** Max 3.3/second, 20 concurrent
- **Frame rate over internet:** 50-60 FPS (smooth)
- **Main thread:** Available for event processing

### Performance Gain Estimate
- **60-70% reduction in main thread load**
- **90% reduction in React re-renders**
- **66% reduction in SVG animation cost**
- **100% elimination of animation-driven state updates**

---

## Files Modified Summary

| File | Changes | Impact |
|------|---------|--------|
| `SentientEye.tsx` | Reduce circuit traces to 16 | High |
| `SentientEye.css` | Add GPU hints, simplify keyframes | High |
| `MessagePulse.tsx` | Pure CSS animation | Critical |
| `MessagePulse.css` | New animation keyframes | Critical |
| `Overview.tsx` | Throttle pulse creation | High |
| `useWebSocket.ts` | Reduce event storage to 20 | Medium |
| `ControllerNode.css` | Add containment | Low |
| `DeviceNode.css` | Add containment | Low |

---

## Conclusion

The animation performance issues stem from three core problems:

1. **CPU-bound animations** (SVG `<animateMotion>`, 2D transforms)
2. **React state-driven animations** (MessagePulse `requestAnimationFrame`)
3. **Unlimited animation creation** (WebSocket burst handling)

Network latency amplifies these issues by causing burst arrivals that create 10-20 simultaneous animations, overwhelming the browser's rendering pipeline.

The optimization plan addresses all three:
- Reduces animation count by 66%
- Moves animations to GPU via `translate3d` and `will-change`
- Eliminates 600-1200 state updates/second by using pure CSS
- Throttles pulse creation to prevent burst overload

**Expected outcome:** Smooth 55-60 FPS performance over internet connections, with main thread freed for WebSocket event processing.

---

## References

- **Browser Rendering Pipeline:** [Google Web Fundamentals - Rendering Performance](https://developers.google.com/web/fundamentals/performance/rendering)
- **CSS will-change:** [MDN - will-change](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change)
- **CSS Containment:** [MDN - CSS Containment](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Containment)
- **React Performance:** [React Docs - Optimizing Performance](https://react.dev/learn/render-and-commit)
- **SVG Animation Performance:** [CSS-Tricks - High Performance Animations](https://css-tricks.com/high-performance-animations/)
