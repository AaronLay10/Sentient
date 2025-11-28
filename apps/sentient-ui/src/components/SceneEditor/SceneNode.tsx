import { memo } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import styles from './SceneNode.module.css';

interface Device {
  id: string;
  friendly_name: string;
  device_type: string;
  actions?: Array<{
    action_id: string;
    friendly_name?: string;
  }>;
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
    isRunning?: boolean;
    isAcknowledged?: boolean;
    onConfigChange?: (nodeId: string, config: any) => void;
    onDataChange?: (nodeId: string, data: any) => void;
  };
  selected?: boolean;
}

export const SceneNode = memo(({ id, data, selected }: SceneNodeProps) => {
  const { deleteElements } = useReactFlow();
  const hasInput = data.nodeType !== 'trigger' || data.subtype === 'timer';
  const hasMultipleOutputs = data.subtype === 'branch';

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  const handleTest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.nodeType === 'device' && data.config?.deviceId && data.config?.action) {
      try {
        const commandSentAt = Date.now();
        console.log('🎮 Sending device command:', {
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
        
        console.log('✅ Device command sent successfully:', result);
        console.log('⏱️  Waiting for acknowledgement from controller...');
      } catch (error) {
        console.error('❌ Error sending device command:', error);
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
            {data.nodeType === 'device' && data.config?.deviceId && data.config?.action && (
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
              
              const currentState = (device as any).current_state;
              
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
            
            {/* Conditional Parameter Inputs */}
            {data.config?.action && (() => {
              const action = data.config.action.toLowerCase();
              const needsBrightness = action.includes('brightness');
              const needsColor = action.includes('color');
              const needsDuration = action.includes('duration');
              
              return (
                <>
                  {needsBrightness && (
                    <div className={styles.field}>
                      <div className={styles.label}>Brightness (0-255)</div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="range"
                          className="nopan nodrag"
                          min="0"
                          max="255"
                          step="1"
                          value={data.config.payload?.brightness || 128}
                          onChange={(e) => {
                            e.stopPropagation();
                            const brightness = parseInt(e.target.value);
                            data.onConfigChange?.(id, {
                              ...data.config,
                              payload: { ...data.config.payload, brightness }
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{ flex: 1 }}
                        />
                        <span style={{ minWidth: '30px', fontSize: '12px' }}>
                          {data.config.payload?.brightness || 128}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {needsColor && (
                    <div className={styles.field}>
                      <div className={styles.label}>Color</div>
                      <select
                        className={`${styles.dropdown} nopan nodrag`}
                        value={data.config.payload?.color || 'white'}
                        onChange={(e) => {
                          e.stopPropagation();
                          data.onConfigChange?.(id, {
                            ...data.config,
                            payload: { ...data.config.payload, color: e.target.value }
                          });
                        }}
                        onClick={(e) => e.stopPropagation()}
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
                      <div className={styles.label}>Duration (ms)</div>
                      <input
                        type="number"
                        className={`${styles.dropdown} nopan nodrag`}
                        min="0"
                        step="100"
                        value={data.config.payload?.duration || 1000}
                        onChange={(e) => {
                          e.stopPropagation();
                          const duration = parseInt(e.target.value) || 0;
                          data.onConfigChange?.(id, {
                            ...data.config,
                            payload: { ...data.config.payload, duration }
                          });
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
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
        
        {/* Audio Node */}
        {data.nodeType === 'audio' && data.config?.audioFile && (
          <div className={styles.field}>
            <div className={styles.label}>Audio</div>
            <div className={styles.value}>{data.config.audioFile}</div>
          </div>
        )}
        
        {/* Empty state for unconfigured nodes */}
        {!data.config?.deviceName && !data.config?.device && !data.config?.duration && !data.config?.audioFile && data.nodeType !== 'trigger' && (
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
