import { memo } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import styles from './PuzzleNode.module.css';

interface Device {
  id: string;
  friendly_name: string;
  device_type: string;
  device_category?: string;
}

interface PuzzleNodeProps {
  id: string;
  data: {
    label: string;
    nodeType: string;
    subtype: string;
    icon: string;
    color: string;
    config?: any;
    devices?: Device[];
    deviceStates?: Record<string, any>;
    roomId?: string;
    onConfigChange?: (nodeId: string, config: any) => void;
  };
  selected?: boolean;
}

export const PuzzleNode = memo(({ id, data, selected }: PuzzleNodeProps) => {
  const { deleteElements } = useReactFlow();

  // Sensors have outputs only, Logic has inputs and outputs, Output (Puzzle Solved) has input only
  // Audio nodes have both inputs and outputs (they're in-line effects in the flow)
  const hasInput = data.nodeType !== 'sensor';
  const hasOutput = data.nodeType !== 'output' || data.nodeType === 'audio';

  // Get current device state value
  const getCurrentValue = () => {
    if (!data.config?.deviceId || !data.deviceStates) {
      return null;
    }
    const state = data.deviceStates[data.config.deviceId];
    if (!state) {
      return null;
    }

    // Debug: Log the state structure
    if (data.nodeType === 'sensor') {
      console.log(`[PuzzleNode] Device ${data.config.deviceId} state:`, state);
    }

    // Extract value based on sensor type
    switch (data.subtype) {
      case 'button':
      case 'switch':
        return state.state || state.value || state.status;
      case 'rfid':
        return state.tag_id || state.tagId || state.value;
      case 'weight':
        return state.weight || state.value;
      case 'keypad':
        return state.code || state.value;
      case 'proximity':
        return state.detected || state.proximity || state.value;
      case 'magnetic':
        return state.contact || state.state || state.value;
      case 'light':
        return state.light_level || state.lightLevel || state.brightness || state.value;
      default:
        return state.value || state.state;
    }
  };

  const currentValue = getCurrentValue();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  // Filter to only sensor devices
  const sensorDevices = data.devices?.filter(d =>
    d.device_category === 'sensor' ||
    d.device_type?.toLowerCase().includes('sensor') ||
    d.device_type?.toLowerCase().includes('button') ||
    d.device_type?.toLowerCase().includes('rfid') ||
    d.device_type?.toLowerCase().includes('keypad') ||
    d.device_type?.toLowerCase().includes('switch')
  ) || [];

  return (
    <div className={`${styles.node} ${selected ? styles.selected : ''}`}>
      {hasInput && <Handle type="target" position={Position.Left} className={styles.handle} />}

      <div className={`${styles.header} drag-handle`}>
        <div
          className={styles.icon}
          style={{
            background: `${data.color}33`,
            color: data.color,
          }}
        >
          {data.icon}
        </div>
        <div className={styles.title}>{data.label}</div>
        {selected && (
          <div
            className={styles.deleteBtn}
            title="Delete node"
            onClick={handleDelete}
          >
            ×
          </div>
        )}
      </div>

      <div
        className={`${styles.body} nopan nodrag`}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Sensor Node */}
        {data.nodeType === 'sensor' && (
          <>
            <div className={styles.field}>
              <div className={styles.label}>Device</div>
              <select
                className={`${styles.dropdown} nopan nodrag`}
                value={data.config?.deviceId || ''}
                onChange={(e) => {
                  e.stopPropagation();
                  const device = data.devices?.find(d => d.id === e.target.value);
                  data.onConfigChange?.(id, {
                    deviceId: e.target.value,
                    deviceName: device?.friendly_name || ''
                  });
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="">Select device...</option>
                {sensorDevices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.friendly_name}
                  </option>
                ))}
              </select>
            </div>

            {/* RFID specific */}
            {data.subtype === 'rfid' && data.config?.deviceId && (
              <div className={styles.field}>
                <div className={styles.label}>Expected Tag</div>
                <input
                  type="text"
                  className={`${styles.dropdown} nopan nodrag`}
                  value={data.config?.expectedTagId || ''}
                  onChange={(e) => {
                    e.stopPropagation();
                    data.onConfigChange?.(id, { expectedTagId: e.target.value });
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder="Tag ID..."
                />
              </div>
            )}

            {/* Keypad specific */}
            {data.subtype === 'keypad' && data.config?.deviceId && (
              <div className={styles.field}>
                <div className={styles.label}>Expected Code</div>
                <input
                  type="text"
                  className={`${styles.dropdown} nopan nodrag`}
                  value={data.config?.expectedCode || ''}
                  onChange={(e) => {
                    e.stopPropagation();
                    data.onConfigChange?.(id, { expectedCode: e.target.value });
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder="Code..."
                />
              </div>
            )}

            {/* Proximity sensor specific */}
            {data.subtype === 'proximity' && data.config?.deviceId && (
              <div className={styles.field}>
                <div className={styles.label}>Condition</div>
                <div className={styles.conditionRow}>
                  <select
                    className={`${styles.dropdown} ${styles.operatorSelect} nopan nodrag`}
                    value={data.config?.operator || '<='}
                    onChange={(e) => {
                      e.stopPropagation();
                      data.onConfigChange?.(id, { operator: e.target.value });
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="=">=</option>
                    <option value="<">{'<'}</option>
                    <option value="<=">{'<='}</option>
                    <option value=">">{'>'}</option>
                    <option value=">=">{'>='}</option>
                    <option value="between">Between</option>
                  </select>
                  {data.config?.operator === 'between' ? (
                    <div className={styles.rangeInputs}>
                      <input
                        type="number"
                        className={`${styles.dropdown} ${styles.rangeInput} nopan nodrag`}
                        value={data.config?.minValue || ''}
                        onChange={(e) => {
                          e.stopPropagation();
                          data.onConfigChange?.(id, { minValue: parseFloat(e.target.value) });
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        placeholder="Min"
                      />
                      <span className={styles.rangeAnd}>&</span>
                      <input
                        type="number"
                        className={`${styles.dropdown} ${styles.rangeInput} nopan nodrag`}
                        value={data.config?.maxValue || ''}
                        onChange={(e) => {
                          e.stopPropagation();
                          data.onConfigChange?.(id, { maxValue: parseFloat(e.target.value) });
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        placeholder="Max"
                      />
                    </div>
                  ) : (
                    <input
                      type="number"
                      className={`${styles.dropdown} ${styles.valueInput} nopan nodrag`}
                      value={data.config?.threshold || ''}
                      onChange={(e) => {
                        e.stopPropagation();
                        data.onConfigChange?.(id, { threshold: parseFloat(e.target.value) });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      placeholder="Distance..."
                    />
                  )}
                </div>
              </div>
            )}

            {/* Weight sensor specific */}
            {data.subtype === 'weight' && data.config?.deviceId && (
              <>
                <div className={styles.field}>
                  <div className={styles.label}>Condition</div>
                  <div className={styles.conditionRow}>
                    <select
                      className={`${styles.dropdown} ${styles.operatorSelect} nopan nodrag`}
                      value={data.config?.operator || '>='}
                      onChange={(e) => {
                        e.stopPropagation();
                        data.onConfigChange?.(id, { operator: e.target.value });
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="=">=</option>
                      <option value="<">{'<'}</option>
                      <option value="<=">{'<='}</option>
                      <option value=">">{'>'}</option>
                      <option value=">=">{'>='}</option>
                      <option value="between">Between</option>
                    </select>
                    {data.config?.operator === 'between' ? (
                      <div className={styles.rangeInputs}>
                        <input
                          type="number"
                          className={`${styles.dropdown} ${styles.rangeInput} nopan nodrag`}
                          value={data.config?.minValue || ''}
                          onChange={(e) => {
                            e.stopPropagation();
                            data.onConfigChange?.(id, { minValue: parseFloat(e.target.value) });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          placeholder="Min"
                        />
                        <span className={styles.rangeAnd}>&</span>
                        <input
                          type="number"
                          className={`${styles.dropdown} ${styles.rangeInput} nopan nodrag`}
                          value={data.config?.maxValue || ''}
                          onChange={(e) => {
                            e.stopPropagation();
                            data.onConfigChange?.(id, { maxValue: parseFloat(e.target.value) });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          placeholder="Max"
                        />
                      </div>
                    ) : (
                      <input
                        type="number"
                        className={`${styles.dropdown} ${styles.valueInput} nopan nodrag`}
                        value={data.config?.threshold || ''}
                        onChange={(e) => {
                          e.stopPropagation();
                          data.onConfigChange?.(id, { threshold: parseFloat(e.target.value) });
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        placeholder="Weight (g)..."
                      />
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Switch specific */}
            {data.subtype === 'switch' && data.config?.deviceId && (
              <div className={styles.field}>
                <div className={styles.label}>Expected State</div>
                <select
                  className={`${styles.dropdown} nopan nodrag`}
                  value={data.config?.expectedState || 'on'}
                  onChange={(e) => {
                    e.stopPropagation();
                    data.onConfigChange?.(id, { expectedState: e.target.value });
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="on">On</option>
                  <option value="off">Off</option>
                </select>
              </div>
            )}

            {/* Light sensor specific */}
            {data.subtype === 'light' && data.config?.deviceId && (
              <div className={styles.field}>
                <div className={styles.label}>Condition</div>
                <div className={styles.conditionRow}>
                  <select
                    className={`${styles.dropdown} ${styles.operatorSelect} nopan nodrag`}
                    value={data.config?.operator || '>='}
                    onChange={(e) => {
                      e.stopPropagation();
                      data.onConfigChange?.(id, { operator: e.target.value });
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="=">=</option>
                    <option value="<">{'<'}</option>
                    <option value="<=">{'<='}</option>
                    <option value=">">{'>'}</option>
                    <option value=">=">{'>='}</option>
                    <option value="between">Between</option>
                  </select>
                  {data.config?.operator === 'between' ? (
                    <div className={styles.rangeInputs}>
                      <input
                        type="number"
                        className={`${styles.dropdown} ${styles.rangeInput} nopan nodrag`}
                        value={data.config?.minValue || ''}
                        onChange={(e) => {
                          e.stopPropagation();
                          data.onConfigChange?.(id, { minValue: parseFloat(e.target.value) });
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        placeholder="Min"
                      />
                      <span className={styles.rangeAnd}>&</span>
                      <input
                        type="number"
                        className={`${styles.dropdown} ${styles.rangeInput} nopan nodrag`}
                        value={data.config?.maxValue || ''}
                        onChange={(e) => {
                          e.stopPropagation();
                          data.onConfigChange?.(id, { maxValue: parseFloat(e.target.value) });
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        placeholder="Max"
                      />
                    </div>
                  ) : (
                    <input
                      type="number"
                      className={`${styles.dropdown} ${styles.valueInput} nopan nodrag`}
                      value={data.config?.threshold || ''}
                      onChange={(e) => {
                        e.stopPropagation();
                        data.onConfigChange?.(id, { threshold: parseFloat(e.target.value) });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      placeholder="Light level..."
                    />
                  )}
                </div>
              </div>
            )}

            {/* Current Value Display - All Sensors */}
            {data.config?.deviceId && (
              <div className={styles.field}>
                <div className={styles.label}>Current Value</div>
                <div className={styles.currentValue}>
                  {currentValue !== null && currentValue !== undefined ? (
                    <span className={styles.valueText}>{String(currentValue)}</span>
                  ) : (
                    <span className={styles.noValue}>No data</span>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Logic Node */}
        {data.nodeType === 'logic' && (
          <div className={styles.field}>
            <div className={styles.hint}>
              {data.subtype === 'sequence' && 'Connect inputs in order'}
              {data.subtype === 'combination' && 'All inputs must match'}
              {data.subtype === 'pattern' && 'Match the pattern'}
              {data.subtype === 'all-of' && 'All must be active (AND)'}
              {data.subtype === 'any-of' && 'Any one active (OR)'}
            </div>
          </div>
        )}

        {/* Output Node - Puzzle Solved */}
        {data.nodeType === 'output' && data.subtype === 'puzzle-solved' && (
          <div className={styles.field}>
            <div className={styles.solvedLabel}>Puzzle Complete</div>
          </div>
        )}

        {/* Audio Node - SCS Audio Server Integration */}
        {data.nodeType === 'audio' && (
          <>
            <div className={styles.field}>
              <div className={styles.label}>Cue ID</div>
              <input
                type="text"
                className={`${styles.dropdown} nopan nodrag`}
                value={data.config?.cueId || ''}
                onChange={(e) => {
                  e.stopPropagation();
                  data.onConfigChange?.(id, { cueId: e.target.value });
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder="e.g., Q1, Q17, Q32..."
              />
            </div>
            <div className={styles.field}>
              <div className={styles.label}>Command</div>
              <select
                className={`${styles.dropdown} nopan nodrag`}
                value={data.config?.command || 'play'}
                onChange={(e) => {
                  e.stopPropagation();
                  data.onConfigChange?.(id, { command: e.target.value });
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="play">Play Cue</option>
                <option value="stop">Stop Cue</option>
                <option value="hotkey">Play Hotkey</option>
                <option value="stop_all">Stop All</option>
                <option value="fade_all">Fade All</option>
              </select>
            </div>
            {/* Test button for audio */}
            <div className={styles.field}>
              <button
                className={`${styles.testButton} nopan nodrag`}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!data.config?.cueId && data.config?.command !== 'stop_all' && data.config?.command !== 'fade_all') {
                    alert('Please enter a cue ID first');
                    return;
                  }
                  try {
                    const { api } = await import('../../lib/api');
                    await api.sendAudioCommand(data.roomId || '', {
                      cue_id: data.config?.cueId || '',
                      command: data.config?.command || 'play',
                      triggered_by: 'puzzle'
                    });
                  } catch (error) {
                    console.error('Failed to send audio command:', error);
                    alert('Failed to send audio command');
                  }
                }}
              >
                Test Audio
              </button>
            </div>
          </>
        )}
      </div>

      {hasOutput && (
        <Handle type="source" position={Position.Right} className={styles.handle} style={{ top: '50%', right: '-7px' }} />
      )}
    </div>
  );
});

PuzzleNode.displayName = 'PuzzleNode';
