# Plan: Implement Device Command Execution with Critical State Tracking and Performance Logging

The scene editor sends device commands with real-time state synchronization. Database `current_state` is the authoritative source, refetched on WebSocket events. Scene nodes display live state with color-coded badges. Execution is sequential with acknowledgement-based progression and 5-second timeout. All commands, acknowledgements, errors, and latency metrics logged to database table for performance analysis and troubleshooting. On failure, modal shows resume/cancel with diagnostic details. Concurrent execution blocked. SessionStorage preserves execution state with navigation warning.

## Steps

1. **Add `sendDeviceCommand()` function** to `apps/sentient-ui/src/lib/api.ts` calling `POST /devices/:deviceId/command` with `{ device_id, command, payload }` - insert after scene methods around line 310

2. **Update device query** in `SceneEditor.tsx` with `refetchOnMount: 'always'`, `staleTime: 0`, trigger `refetch()` on WebSocket `device_state_changed` events to reload fresh `current_state` from database

3. **Add live state display badge** in `SceneNode.tsx` showing `device.current_state`: green "ACTIVE"/"ON" for truthy, gray "INACTIVE"/"OFF" for falsy, tooltip with raw JSON - insert at top of device node body around line 140

4. **Update `handleDeviceChange`** to clear action/payload: `onConfigChange(id, { deviceId: value, deviceName: device.friendly_name, action: '', payload: {} })` - line 73

5. **Update `handleActionChange`** to initialize payload: `onConfigChange(id, { ...config, action: value, payload: {} })` - line 86

6. **Add conditional parameter inputs** after action dropdown: brightness range (0-255, default 128, step 1) when action includes "brightness", color select (yellow/red/green/blue/white/purple/orange) when includes "color", duration number (positive ms, default 1000) when includes "duration" with inline handlers - around line 190

7. **Update test button** to call `api.sendDeviceCommand(deviceId, action, payload || {})` and log command timestamp - line 51

8. **Implement acknowledgement-based execution** in `SceneEditor.tsx` with latency tracking: traverse from scene-start, execute commands recording `command_sent_at` timestamp, wait for acknowledgement with 5s timeout calculating `latency_ms = ack_received_at - command_sent_at`, log all metrics (command, ack, latency, errors) to console and prepare for database logging, handle timer delays, block concurrent execution, show error modal with resume/cancel + diagnostic + copy button, persist to sessionStorage, add beforeunload warning - replace current placeholder around line 140

## Further Considerations

### 1. Database Log Schema Design

Need `CommandLog` table with fields: `id`, `scene_id`, `node_id`, `device_id`, `controller_id`, `action`, `payload`, `command_sent_at`, `acknowledgement_received_at`, `latency_ms`, `success`, `error_message`, `timeout`, `user_id`, `created_at`. Should this be separate table or extend existing Events table?

**Recommendation: Separate `CommandLog` table** - Events tracks domain events, CommandLog tracks execution performance and debugging, different query patterns and retention policies.

### 2. Latency Alerting Thresholds

If latency consistently exceeds thresholds (warning at 200ms, critical at 1s), should system alert technicians? Could indicate network issues, controller overload, or hardware failures.

**Recommendation: Phase 2 dashboard feature** - implement logging first, analyze latency distributions across devices/controllers, then set data-driven alert thresholds based on actual performance baselines.

### 3. Log Retention and Cleanup

High-frequency command logging could grow database quickly. Should implement automatic cleanup (delete logs older than 30 days) or archival (move to cold storage)?

**Recommendation: Start with 90-day retention** - theatrical systems need debugging history for intermittent issues, implement cleanup job once storage impact is measured, prioritize keeping error logs longer than success logs.

## Implementation Details

### API Integration

- **Endpoint**: `POST /devices/:deviceId/command`
- **Request Body**: `{ device_id: string, command: string, payload?: Record<string, any> }`
- **Response**: `{ success: boolean, device_id: string, command: string, payload?: any }`
- **Error Handling**: 404 if device not found, 500 on MQTT publish failure

### State Management

- **Database**: Single source of truth for `current_state` field on Device model
- **Refetch Strategy**: Trigger on WebSocket `device_state_changed` events, never cache
- **State Conflicts**: Database value always wins, log warnings if WebSocket event differs

### Execution Flow

1. User clicks "Run Scene" or node test button
2. Check for concurrent execution - block if active
3. Traverse scene graph from scene-start node
4. For each device node:
   - Record `command_sent_at = Date.now()`
   - Call `api.sendDeviceCommand(deviceId, action, payload)`
   - Set visual state: node shows green pulse
   - Create Promise that resolves on matching WebSocket event or rejects on 5s timeout
   - On acknowledgement: calculate latency, log to console, mark node acknowledged (blue badge)
   - On timeout: halt execution, show error modal with resume/cancel options
5. For timer nodes: `await new Promise(resolve => setTimeout(resolve, duration_ms))`
6. On completion: clear execution state from sessionStorage
7. On error: persist failed node to sessionStorage for resume functionality

### Visual Feedback States

- **Idle**: Default node appearance
- **Running**: Green pulsing border animation
- **Acknowledged**: Blue border with checkmark badge, shown for 2s then clears
- **Failed**: Red border with error icon
- **Current State Badge**: Top of device node body, green/gray badge showing device state

### Parameter UI Rendering

```typescript
// Detect parameter requirements from action_id
const needsBrightness = action.toLowerCase().includes('brightness');
const needsColor = action.toLowerCase().includes('color');
const needsDuration = action.toLowerCase().includes('duration');

// Render conditional inputs
{needsBrightness && (
  <div className={styles.field}>
    <label>Brightness (0-255)</label>
    <input
      type="range"
      min="0"
      max="255"
      step="1"
      value={config.payload?.brightness || 128}
      onChange={(e) => {
        const brightness = parseInt(e.target.value);
        onConfigChange(id, {
          ...config,
          payload: { ...config.payload, brightness }
        });
      }}
    />
    <span>{config.payload?.brightness || 128}</span>
  </div>
)}

{needsColor && (
  <div className={styles.field}>
    <label>Color</label>
    <select
      value={config.payload?.color || 'white'}
      onChange={(e) => {
        onConfigChange(id, {
          ...config,
          payload: { ...config.payload, color: e.target.value }
        });
      }}
    >
      <option value="yellow">Yellow</option>
      <option value="red">Red</option>
      <option value="green">Green</option>
      <option value="blue">Blue</option>
      <option value="white">White</option>
      <option value="purple">Purple</option>
      <option value="orange">Orange</option>
    </select>
  </div>
)}

{needsDuration && (
  <div className={styles.field}>
    <label>Duration (ms)</label>
    <input
      type="number"
      min="0"
      step="100"
      value={config.payload?.duration || 1000}
      onChange={(e) => {
        const duration = parseInt(e.target.value);
        onConfigChange(id, {
          ...config,
          payload: { ...config.payload, duration }
        });
      }}
    />
  </div>
)}
```

### Error Modal Structure

```typescript
interface ExecutionError {
  nodeId: string;
  nodeName: string;
  deviceId: string;
  deviceName: string;
  controllerId: string;
  action: string;
  payload: any;
  timeout: number; // 5000ms
  lastKnownState: any;
  attemptCount: number;
  timestamp: Date;
}

// Modal shows:
// - Failed node name and icon
// - Device friendly name
// - Controller ID
// - Action attempted
// - Payload sent
// - Last known state from database
// - Timeout duration (5000ms)
// - Attempt number if resumed multiple times
// - Buttons: "Resume from [Node Name]", "Cancel Execution", "Copy Error Details"
```

### SessionStorage Schema

```typescript
interface ExecutionState {
  sceneId: string;
  sceneName: string;
  startedAt: Date;
  completedNodes: string[]; // Array of node IDs
  currentNodeId: string;
  failedNode?: ExecutionError;
  totalNodes: number;
}

// Save to sessionStorage key: 'sentient_scene_execution_state'
// Clear on successful completion or user cancellation
// Load on component mount to check for interrupted execution
```

### Concurrent Execution Prevention

```typescript
// Check sessionStorage for active execution
const activeExecution = sessionStorage.getItem(
  "sentient_scene_execution_state"
);
if (activeExecution && action === "start_new_execution") {
  showModal({
    title: "Scene Execution In Progress",
    message:
      "Another scene execution is currently active. Cancel it to start a new execution.",
    buttons: [
      { label: "Cancel Current Execution", action: () => clearExecution() },
      { label: "Go Back", action: () => closeModal() },
    ],
  });
  return;
}
```

### Navigation Warning

```typescript
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    const activeExecution = sessionStorage.getItem(
      "sentient_scene_execution_state"
    );
    if (activeExecution) {
      e.preventDefault();
      e.returnValue =
        "Scene execution in progress. Progress will be lost if you leave.";
      return e.returnValue;
    }
  };

  window.addEventListener("beforeunload", handleBeforeUnload);
  return () => window.removeEventListener("beforeunload", handleBeforeUnload);
}, []);
```

## Database Schema Addition

### CommandLog Table (Prisma Schema)

```prisma
model CommandLog {
  id                        String    @id @default(cuid())
  scene_id                  String?
  scene                     Scene?    @relation(fields: [scene_id], references: [id], onDelete: SetNull)
  node_id                   String?   // Scene node identifier
  device_id                 String
  device                    Device    @relation(fields: [device_id], references: [id], onDelete: Cascade)
  controller_id             String
  controller                Controller @relation(fields: [controller_id], references: [id], onDelete: Cascade)
  action                    String
  payload                   Json?
  command_sent_at           DateTime
  acknowledgement_received_at DateTime?
  latency_ms                Int?      // Calculated: ack_received - command_sent
  success                   Boolean   @default(false)
  error_message             String?
  timeout                   Boolean   @default(false)
  user_id                   String?
  user                      User?     @relation(fields: [user_id], references: [id], onDelete: SetNull)
  created_at                DateTime  @default(now())

  @@index([device_id])
  @@index([controller_id])
  @@index([scene_id])
  @@index([created_at])
  @@index([success])
  @@index([latency_ms])
}
```

### Migration Strategy

1. Create Prisma migration: `pnpm --filter api-service prisma:migrate:dev --name add_command_log_table`
2. Deploy to production: `pnpm --filter api-service prisma:migrate:deploy`
3. Add logging endpoint: `POST /api/command-logs` (internal only, called by scene editor)
4. Implement cleanup job: scheduled task to delete logs older than 90 days

## Performance Considerations

### Target Latency

- **Nominal**: < 50ms (command sent → acknowledgement received)
- **Warning**: 50-200ms (log warning, continue execution)
- **Critical**: 200-1000ms (log critical warning, continue execution)
- **Timeout**: > 5000ms (halt execution, show error modal)

### Metrics to Track

1. **Command-to-Acknowledgement Latency**: Primary performance indicator
2. **Database Refetch Time**: Time to load fresh device states
3. **WebSocket Event Propagation**: Time from controller ack → UI event
4. **Scene Execution Duration**: Total time from start to completion
5. **Timeout Rate**: Percentage of commands that timeout
6. **Retry Success Rate**: Percentage of resumed executions that succeed

### Optimization Opportunities

1. **Batched Device State Fetching**: Instead of refetching all devices, fetch only updated device
2. **WebSocket Event Filtering**: Subscribe only to room-specific events
3. **Optimistic State Updates**: Update UI immediately on command send, revert on timeout
4. **Connection Pooling**: Reuse MQTT connections for multiple commands
5. **Parallel Execution**: For independent device nodes (no shared dependencies), execute in parallel

## Testing Strategy

### Unit Tests

- `sendDeviceCommand()` API function
- Parameter input rendering logic (brightness/color/duration detection)
- State display badge formatting (truthy/falsy logic)
- Latency calculation accuracy

### Integration Tests

1. **Happy Path**: Send command → receive acknowledgement → verify state update
2. **Timeout Scenario**: Send command → no acknowledgement → timeout after 5s → show error modal
3. **Resume Execution**: Timeout → click resume → continue from failed node
4. **Concurrent Execution Block**: Start execution → attempt second execution → blocked with modal
5. **Timer Node Delay**: Execute timer node → verify delay duration → continue to next node

### Manual Testing Checklist

- [ ] Test button sends command and device responds
- [ ] State badge updates on acknowledgement
- [ ] Parameter inputs (brightness/color/duration) render correctly
- [ ] Parameter values persist in scene graph JSON
- [ ] Scene execution traverses nodes in correct order
- [ ] Timer nodes delay execution by specified duration
- [ ] Timeout shows error modal with correct diagnostic info
- [ ] Resume from failed node continues execution
- [ ] Cancel execution clears sessionStorage
- [ ] Navigation warning appears when execution active
- [ ] Concurrent execution blocked with warning modal
- [ ] Latency logged to console with correct calculations
- [ ] Database state always displayed (never stale cached data)

## Success Criteria

1. ✅ Device commands sent from scene editor reach controllers via MQTT
2. ✅ Controller acknowledgements flow back through WebSocket to UI
3. ✅ Device `current_state` in database updates on acknowledgements
4. ✅ Scene nodes display live device state from database (< 100ms refresh)
5. ✅ Scene execution runs sequentially with acknowledgement-based progression
6. ✅ Command-to-acknowledgement latency measured and logged
7. ✅ Timeout after 5s shows error modal with resume/cancel options
8. ✅ Execution state persists in sessionStorage for resume functionality
9. ✅ Concurrent execution prevented with warning modal
10. ✅ Parameter inputs (brightness/color/duration) render and persist correctly
11. ✅ All execution events logged to console (database logging Phase 2)
12. ✅ Sub-50ms latency target achieved for majority of commands

## Phase 2 Enhancements

1. **Database Command Logging**: Implement CommandLog table and logging endpoint
2. **Latency Dashboard**: Real-time latency monitoring with historical charts
3. **Alert Thresholds**: Automated alerts for high latency or timeout rates
4. **Parallel Execution**: Execute independent device nodes simultaneously
5. **Advanced Parameter UI**: Custom inputs for device-specific parameters
6. **Execution History**: View past scene executions with timing breakdown
7. **Automated Testing**: Continuous latency testing against target thresholds
8. **Log Cleanup Job**: Scheduled task for 90-day retention policy
