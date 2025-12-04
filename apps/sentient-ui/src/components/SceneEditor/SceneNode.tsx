import { memo } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useNavigate } from 'react-router-dom';
import styles from './SceneNode.module.css';

interface Device {
  id: string;
  friendly_name: string;
  device_type: string;
  action_type?: string;
  current_state?: unknown;
  actions?: Array<{
    action_id: string;
    friendly_name?: string;
  }>;
}

interface PuzzleInfo {
  id: string;
  name: string;
  description?: string;
}

interface SceneNodeProps {
  id: string;
  data: {
    label: string;
    nodeType: string;
    subtype: string;
    icon: string;
    color: string;
    config?: any;
    devices?: Device[];
    puzzles?: PuzzleInfo[];
    roomId?: string;
    isRunning?: boolean;
    isAcknowledged?: boolean;
    onConfigChange?: (nodeId: string, config: any) => void;
    onDataChange?: (nodeId: string, data: any) => void;
  };
  selected?: boolean;
}

export const SceneNode = memo(({ id, data, selected }: SceneNodeProps) => {
  const { deleteElements } = useReactFlow();
  const navigate = useNavigate();
  const hasInput = data.nodeType !== 'trigger' || data.subtype === 'timer';
  const hasMultipleOutputs = data.subtype === 'branch';

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  const handleTest = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Device or Video node test
    if ((data.nodeType === 'device' || (data.nodeType === 'media' && data.subtype === 'video')) &&
        data.config?.deviceId && data.config?.action) {
      try {
        const commandSentAt = Date.now();
        const nodeTypeLabel = data.nodeType === 'media' ? '🎬 Video' : '🎮 Device';
        console.log(`${nodeTypeLabel} command:`, {
          deviceId: data.config.deviceId,
          action: data.config.action,
          payload: data.config.payload || {},
          timestamp: new Date(commandSentAt).toISOString()
        });

        // Import api dynamically
        const { api } = await import('../../lib/api');

        // Call the new sendDeviceCommand API
        const result = await api.sendDeviceCommand(
          data.config.deviceId,
          data.config.action,
          data.config.payload || {}
        );

        console.log('✅ Command sent successfully:', result);
        console.log('⏱️  Waiting for acknowledgement from controller...');
      } catch (error) {
        console.error('❌ Error sending command:', error);
      }
    }

    // Audio node test - send audio cue command
    if (data.nodeType === 'audio' && data.config?.cueId) {
      try {
        const { api } = await import('../../lib/api');
        const command = data.config.command || 'play';

        console.log(`🔊 Audio command:`, {
          cueId: data.config.cueId,
          command,
          subtype: data.subtype,
          timestamp: new Date().toISOString()
        });

        // Send audio command via API (which publishes to Redis)
        await api.sendAudioCommand(data.roomId || '', {
          cue_id: data.config.cueId,
          command,
          triggered_by: 'scene'
        });

        console.log('✅ Audio command sent successfully');
      } catch (error) {
        console.error('❌ Error sending audio command:', error);
      }
    }
  };

  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const device = data.devices?.find(d => d.id === e.target.value);
    
    // Clear action and payload when device changes
    data.onConfigChange?.(id, { 
      deviceId: e.target.value,
      deviceName: device?.friendly_name || '',
      action: '',
      payload: {}
    });
  };

  const handleActionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const action = e.target.value;
    
    // Initialize empty payload object for action
    data.onConfigChange?.(id, { 
      ...data.config,
      action: action,
      payload: {}
    });
  };

  return (
    <div className={`${styles.node} ${selected ? styles.selected : ''} ${data.isRunning ? styles.running : ''} ${data.isAcknowledged ? styles.acknowledged : ''}`}>
      {hasInput && <Handle type="target" position={Position.Left} className={styles.handle} />}
      {data.isAcknowledged && (
        <div className={styles.acknowledgeBadge}>✓</div>
      )}

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
          <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
            {((data.nodeType === 'device' && data.config?.deviceId && data.config?.action) ||
              (data.nodeType === 'media' && data.subtype === 'video' && data.config?.deviceId && data.config?.action) ||
              (data.nodeType === 'audio' && data.config?.cueId)) && (
              <div
                className={styles.testBtn}
                title="Test this node"
                onClick={handleTest}
              >
                ▶
              </div>
            )}
            <div 
              className={styles.deleteBtn} 
              title="Delete node (Del/Backspace)"
              onClick={handleDelete}
            >
              ×
            </div>
          </div>
        )}
      </div>

      <div 
        className={`${styles.body} nopan nodrag`}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Device Control Node */}
        {data.nodeType === 'device' && (
          <>
            {/* Live State Display */}
            {data.config?.deviceId && (() => {
              const device = data.devices?.find(d => d.id === data.config.deviceId);
              if (!device) return null;

              const currentState = device.current_state;
              
              // Generate friendly label based on device type and state
              let stateLabel = 'UNKNOWN';
              let stateColor = '#6b7280'; // gray default
              
              if (typeof currentState === 'string') {
                // Handle string states (action friendly names or motor states)
                stateLabel = currentState; // Use the friendly name directly
                
                // Color based on keywords in the state
                const stateLower = currentState.toLowerCase();
                if (stateLower.includes('on') || stateLower.includes('power on')) {
                  stateColor = '#22c55e'; // green
                } else if (stateLower.includes('off') || stateLower.includes('power off')) {
                  stateColor = '#6b7280'; // gray
                } else if (stateLower.includes('up') || stateLower.includes('lift up')) {
                  stateColor = '#3b82f6'; // blue
                } else if (stateLower.includes('down') || stateLower.includes('lift down')) {
                  stateColor = '#f59e0b'; // amber
                } else if (stateLower.includes('stop')) {
                  stateColor = '#6b7280'; // gray
                } else {
                  stateColor = '#8b5cf6'; // purple
                }
              } else if (currentState === true) {
                stateLabel = 'POWER ON';
                stateColor = '#22c55e'; // green
              } else if (currentState === false) {
                stateLabel = 'POWER OFF';
                stateColor = '#6b7280'; // gray
              } else if (typeof currentState === 'number') {
                stateLabel = `VALUE: ${currentState}`;
                stateColor = '#22c55e'; // green
              } else if (typeof currentState === 'object' && currentState !== null) {
                stateLabel = 'ACTIVE';
                stateColor = '#22c55e'; // green
              }
              
              return (
                <div className={styles.field}>
                  <div className={styles.label}>Current State</div>
                  <div 
                    className={styles.stateBadge}
                    style={{ 
                      backgroundColor: `${stateColor}22`,
                      color: stateColor,
                      border: `1px solid ${stateColor}`,
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'help'
                    }}
                    title={`Raw value: ${JSON.stringify(currentState)}`}
                  >
                    {stateLabel}
                  </div>
                </div>
              );
            })()}
            
            <div className={styles.field}>
              <div className={styles.label}>Device</div>
              <select
                className={`${styles.dropdown} nopan nodrag`}
                value={data.config?.deviceId || ''}
                onChange={handleDeviceChange}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="">Select device...</option>
                {data.devices?.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.friendly_name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <div className={styles.label}>Action</div>
              <select
                className={`${styles.dropdown} nopan nodrag`}
                value={data.config?.action || ''}
                onChange={handleActionChange}
                onClick={(e) => e.stopPropagation()}
                disabled={!data.config?.deviceId}
              >
                <option value="">Select action...</option>
                {(() => {
                  const deviceId = data.config?.deviceId;
                  const device = data.devices?.find(d => d.id === deviceId);
                  
                  if (!device?.actions || device.actions.length === 0) {
                    return <option value="" disabled>No actions available</option>;
                  }
                  
                  return device.actions.map((action) => (
                    <option key={action.action_id} value={action.action_id}>
                      {action.friendly_name || action.action_id.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </option>
                  ));
                })()}
              </select>
            </div>
            
            {/* Action Type-Specific Controls */}
            {data.config?.deviceId && (() => {
              const device = data.devices?.find(d => d.id === data.config.deviceId);
              const actionType = device?.action_type;

              return (
                <>
                  {/* RGB LED Controls */}
                  {actionType === 'rgb_led' && (
                    <>
                      <div className={styles.field}>
                        <div className={styles.label}>Color</div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {[
                            { name: 'red', hex: '#ef4444' },
                            { name: 'orange', hex: '#f97316' },
                            { name: 'yellow', hex: '#eab308' },
                            { name: 'green', hex: '#22c55e' },
                            { name: 'blue', hex: '#3b82f6' },
                            { name: 'purple', hex: '#a855f7' },
                            { name: 'pink', hex: '#ec4899' },
                            { name: 'white', hex: '#f8fafc' },
                          ].map((color) => (
                            <div
                              key={color.name}
                              className="nopan nodrag"
                              onClick={(e) => {
                                e.stopPropagation();
                                data.onConfigChange?.(id, {
                                  ...data.config,
                                  payload: { ...data.config.payload, color: color.name }
                                });
                              }}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '4px',
                                backgroundColor: color.hex,
                                border: data.config.payload?.color === color.name ? '2px solid #fff' : '1px solid #333',
                                cursor: 'pointer',
                                boxShadow: data.config.payload?.color === color.name ? '0 0 0 2px #8b5cf6' : 'none',
                              }}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </div>
                      <div className={styles.field}>
                        <div className={styles.label}>Brightness</div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="range"
                            className="nopan nodrag"
                            min="0"
                            max="255"
                            step="1"
                            value={data.config.payload?.brightness ?? 255}
                            onChange={(e) => {
                              e.stopPropagation();
                              data.onConfigChange?.(id, {
                                ...data.config,
                                payload: { ...data.config.payload, brightness: parseInt(e.target.value) }
                              });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ flex: 1 }}
                          />
                          <span style={{ minWidth: '30px', fontSize: '11px', color: '#9ca3af' }}>
                            {data.config.payload?.brightness ?? 255}
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Analog PWM Dimmer Controls */}
                  {actionType === 'analog_pwm' && (
                    <div className={styles.field}>
                      <div className={styles.label}>PWM Value (0-255)</div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="range"
                          className="nopan nodrag"
                          min="0"
                          max="255"
                          step="1"
                          value={data.config.payload?.value ?? 255}
                          onChange={(e) => {
                            e.stopPropagation();
                            data.onConfigChange?.(id, {
                              ...data.config,
                              payload: { ...data.config.payload, value: parseInt(e.target.value) }
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{ flex: 1 }}
                        />
                        <span style={{ minWidth: '30px', fontSize: '11px', color: '#9ca3af' }}>
                          {data.config.payload?.value ?? 255}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Servo Position Controls */}
                  {actionType === 'position_servo' && (
                    <div className={styles.field}>
                      <div className={styles.label}>Position (0-180°)</div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="range"
                          className="nopan nodrag"
                          min="0"
                          max="180"
                          step="1"
                          value={data.config.payload?.position ?? 90}
                          onChange={(e) => {
                            e.stopPropagation();
                            data.onConfigChange?.(id, {
                              ...data.config,
                              payload: { ...data.config.payload, position: parseInt(e.target.value) }
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{ flex: 1 }}
                        />
                        <span style={{ minWidth: '35px', fontSize: '11px', color: '#9ca3af' }}>
                          {data.config.payload?.position ?? 90}°
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Stepper Position Controls */}
                  {actionType === 'position_stepper' && (
                    <>
                      <div className={styles.field}>
                        <div className={styles.label}>Target Position</div>
                        <input
                          type="number"
                          className={`${styles.dropdown} nopan nodrag`}
                          value={data.config.payload?.position ?? 0}
                          onChange={(e) => {
                            e.stopPropagation();
                            data.onConfigChange?.(id, {
                              ...data.config,
                              payload: { ...data.config.payload, position: parseInt(e.target.value) || 0 }
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Steps or position..."
                        />
                      </div>
                      <div className={styles.field}>
                        <div className={styles.label}>Speed</div>
                        <select
                          className={`${styles.dropdown} nopan nodrag`}
                          value={data.config.payload?.speed || 'normal'}
                          onChange={(e) => {
                            e.stopPropagation();
                            data.onConfigChange?.(id, {
                              ...data.config,
                              payload: { ...data.config.payload, speed: e.target.value }
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="slow">Slow</option>
                          <option value="normal">Normal</option>
                          <option value="fast">Fast</option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* Motor Control */}
                  {actionType === 'motor_control' && (
                    <>
                      <div className={styles.field}>
                        <div className={styles.label}>Direction</div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {['forward', 'reverse', 'stop'].map((dir) => (
                            <button
                              key={dir}
                              className="nopan nodrag"
                              onClick={(e) => {
                                e.stopPropagation();
                                data.onConfigChange?.(id, {
                                  ...data.config,
                                  payload: { ...data.config.payload, direction: dir }
                                });
                              }}
                              style={{
                                flex: 1,
                                padding: '6px 8px',
                                fontSize: '11px',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                backgroundColor: data.config.payload?.direction === dir ? '#8b5cf6' : '#374151',
                                color: data.config.payload?.direction === dir ? '#fff' : '#9ca3af',
                              }}
                            >
                              {dir === 'forward' ? '▲' : dir === 'reverse' ? '▼' : '■'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className={styles.field}>
                        <div className={styles.label}>Speed (%)</div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="range"
                            className="nopan nodrag"
                            min="0"
                            max="100"
                            step="5"
                            value={data.config.payload?.speed ?? 100}
                            onChange={(e) => {
                              e.stopPropagation();
                              data.onConfigChange?.(id, {
                                ...data.config,
                                payload: { ...data.config.payload, speed: parseInt(e.target.value) }
                              });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ flex: 1 }}
                          />
                          <span style={{ minWidth: '35px', fontSize: '11px', color: '#9ca3af' }}>
                            {data.config.payload?.speed ?? 100}%
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Trigger (One-Shot) Controls */}
                  {actionType === 'trigger' && (
                    <div className={styles.field}>
                      <div className={styles.label}>Duration (ms)</div>
                      <input
                        type="number"
                        className={`${styles.dropdown} nopan nodrag`}
                        min="0"
                        step="100"
                        value={data.config.payload?.duration ?? 500}
                        onChange={(e) => {
                          e.stopPropagation();
                          data.onConfigChange?.(id, {
                            ...data.config,
                            payload: { ...data.config.payload, duration: parseInt(e.target.value) || 0 }
                          });
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Pulse duration..."
                      />
                    </div>
                  )}

                  {/* Counter Display (Input) */}
                  {actionType === 'counter' && (
                    <div className={styles.field}>
                      <div className={styles.label}>Counter Threshold</div>
                      <input
                        type="number"
                        className={`${styles.dropdown} nopan nodrag`}
                        value={data.config.payload?.threshold ?? 0}
                        onChange={(e) => {
                          e.stopPropagation();
                          data.onConfigChange?.(id, {
                            ...data.config,
                            payload: { ...data.config.payload, threshold: parseInt(e.target.value) || 0 }
                          });
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Trigger at count..."
                      />
                    </div>
                  )}

                  {/* Analog Sensor Threshold (Input) */}
                  {actionType === 'analog_sensor' && (
                    <>
                      <div className={styles.field}>
                        <div className={styles.label}>Condition</div>
                        <select
                          className={`${styles.dropdown} nopan nodrag`}
                          value={data.config.payload?.operator || 'gt'}
                          onChange={(e) => {
                            e.stopPropagation();
                            data.onConfigChange?.(id, {
                              ...data.config,
                              payload: { ...data.config.payload, operator: e.target.value }
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="gt">Greater than</option>
                          <option value="lt">Less than</option>
                          <option value="eq">Equals</option>
                          <option value="gte">Greater or equal</option>
                          <option value="lte">Less or equal</option>
                        </select>
                      </div>
                      <div className={styles.field}>
                        <div className={styles.label}>Threshold Value</div>
                        <input
                          type="number"
                          className={`${styles.dropdown} nopan nodrag`}
                          value={data.config.payload?.threshold ?? 512}
                          onChange={(e) => {
                            e.stopPropagation();
                            data.onConfigChange?.(id, {
                              ...data.config,
                              payload: { ...data.config.payload, threshold: parseInt(e.target.value) || 0 }
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </>
        )}
        
        {/* Button Press Node */}
        {data.nodeType === 'sensor' && data.subtype === 'button' && (
          <>
            <div className={styles.field}>
              <div className={styles.label}>Touchscreen</div>
              <select
                className={`${styles.dropdown} nopan nodrag`}
                value={data.config?.controllerId || ''}
                onChange={(e) => {
                  e.stopPropagation();
                  data.onConfigChange?.(id, { 
                    controllerId: e.target.value,
                    buttonName: '' // Reset button when controller changes
                  });
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="">Select touchscreen...</option>
                {data.devices?.filter(d => d.device_type === 'touchscreen').map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.friendly_name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <div className={styles.label}>Button</div>
              <input
                type="text"
                className={`${styles.dropdown} nopan nodrag`}
                value={data.config?.buttonName || ''}
                onChange={(e) => {
                  e.stopPropagation();
                  data.onConfigChange?.(id, { buttonName: e.target.value });
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder="Enter button name..."
                disabled={!data.config?.controllerId}
              />
            </div>
          </>
        )}

        {/* Effect Node */}
        {data.nodeType === 'effect' && data.config?.device && (
          <div className={styles.field}>
            <div className={styles.label}>Device</div>
            <div className={styles.value}>{data.config.device}</div>
          </div>
        )}
        
        {/* Timer/Delay Nodes */}
        {data.config?.duration && (
          <div className={styles.field}>
            <div className={styles.label}>Duration</div>
            <div className={styles.value}>{data.config.duration}{data.nodeType === 'logic' ? 's' : 'ms'}</div>
          </div>
        )}
        
        {/* Video Playback Node */}
        {data.nodeType === 'media' && data.subtype === 'video' && (
          <>
            <div className={styles.field}>
              <div className={styles.label}>Video Device</div>
              <select
                className={`${styles.dropdown} nopan nodrag`}
                value={data.config?.deviceId || ''}
                onChange={(e) => {
                  e.stopPropagation();
                  const device = data.devices?.find(d => d.id === e.target.value);
                  data.onConfigChange?.(id, { 
                    deviceId: e.target.value,
                    deviceName: device?.friendly_name || '',
                    action: '',
                    payload: {}
                  });
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="">Select device...</option>
                {data.devices?.filter(d => d.device_type === 'video_display').map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.friendly_name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <div className={styles.label}>Action</div>
              <select
                className={`${styles.dropdown} nopan nodrag`}
                value={data.config?.action || ''}
                onChange={(e) => {
                  e.stopPropagation();
                  data.onConfigChange?.(id, { 
                    ...data.config,
                    action: e.target.value,
                    payload: {}
                  });
                }}
                onClick={(e) => e.stopPropagation()}
                disabled={!data.config?.deviceId}
              >
                <option value="">Select action...</option>
                {(() => {
                  const deviceId = data.config?.deviceId;
                  const device = data.devices?.find(d => d.id === deviceId);
                  
                  if (!device?.actions || device.actions.length === 0) {
                    return <option value="" disabled>No actions available</option>;
                  }
                  
                  return device.actions.map((action) => (
                    <option key={action.action_id} value={action.action_id}>
                      {action.friendly_name || action.action_id.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </option>
                  ));
                })()}
              </select>
            </div>
          </>
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
                  data.onConfigChange?.(id, {
                    ...data.config,
                    cueId: e.target.value
                  });
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
                  data.onConfigChange?.(id, {
                    ...data.config,
                    command: e.target.value
                  });
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="play">Play Cue</option>
                <option value="stop">Stop Cue</option>
                <option value="hotkey">Play Hotkey</option>
                <option value="hotkey_on">Hotkey On</option>
                <option value="hotkey_off">Hotkey Off</option>
                <option value="stop_all">Stop All</option>
                <option value="fade_all">Fade All</option>
              </select>
            </div>
            {data.config?.cueId && (
              <div className={styles.field}>
                <div className={styles.hint} style={{ fontSize: '10px', color: '#6b7280' }}>
                  {data.subtype === 'sfx' && '🔊 Sound effect'}
                  {data.subtype === 'music' && '♫ Background music'}
                  {data.subtype === 'voice' && '🎤 Voice/narration'}
                </div>
              </div>
            )}
          </>
        )}

        {/* Puzzle Node */}
        {data.nodeType === 'puzzle' && data.subtype === 'puzzle-trigger' && (
          <>
            <div className={styles.field}>
              <div className={styles.label}>Puzzle</div>
              <select
                className={`${styles.dropdown} nopan nodrag`}
                value={data.config?.puzzleId || ''}
                onChange={(e) => {
                  e.stopPropagation();
                  const puzzle = data.puzzles?.find(p => p.id === e.target.value);
                  data.onConfigChange?.(id, {
                    puzzleId: e.target.value,
                    puzzleName: puzzle?.name || ''
                  });
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="">Select puzzle...</option>
                {data.puzzles?.map((puzzle) => (
                  <option key={puzzle.id} value={puzzle.id}>
                    {puzzle.name}
                  </option>
                ))}
              </select>
            </div>
            {data.config?.puzzleId && data.roomId && (
              <div className={styles.field}>
                <button
                  className={`${styles.editButton} nopan nodrag`}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/puzzles?roomId=${data.roomId}&puzzleId=${data.config.puzzleId}`);
                  }}
                >
                  Edit Puzzle
                </button>
              </div>
            )}
            {(!data.puzzles || data.puzzles.length === 0) && (
              <div className={styles.field}>
                <div className={styles.hint}>No puzzles in this room. Create one in the Puzzle Editor.</div>
              </div>
            )}
          </>
        )}

        {/* Empty state for unconfigured nodes */}
        {!data.config?.deviceName && !data.config?.device && !data.config?.duration && !data.config?.audioFile && !data.config?.deviceId && !data.config?.puzzleId && data.nodeType !== 'trigger' && data.nodeType !== 'puzzle' && (
          <div className={styles.field}>
            <div className={styles.label}>Status</div>
            <div className={styles.value}>Not configured</div>
          </div>
        )}
      </div>

      {hasMultipleOutputs ? (
        <>
          <Handle type="source" position={Position.Right} id="true" className={styles.handle} style={{ top: '60%', right: '-7px' }} />
          <Handle type="source" position={Position.Right} id="false" className={styles.handle} style={{ top: '80%', right: '-7px' }} />
        </>
      ) : (
        <Handle type="source" position={Position.Right} className={styles.handle} style={{ top: '50%', right: '-7px' }} />
      )}
    </div>
  );
});

SceneNode.displayName = 'SceneNode';
