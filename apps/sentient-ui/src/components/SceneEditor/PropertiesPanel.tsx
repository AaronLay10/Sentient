import type { Node as FlowNode, Edge } from '@xyflow/react';
import type { Device, Room } from '../../lib/api';
import styles from './PropertiesPanel.module.css';

interface PropertiesPanelProps {
  selectedNode: FlowNode | null;
  sceneInfo: {
    name: string;
    description: string;
  };
  onSceneInfoChange: (info: any) => void;
  onNodeConfigChange: (nodeId: string, config: any) => void;
  onNodeDataChange: (nodeId: string, data: any) => void;
  devices: Device[];
  rooms: Room[];
  selectedRoomId: string;
  nodes: FlowNode[];
  edges: Edge[];
}

export function PropertiesPanel({
  selectedNode,
  // sceneInfo, 
  // onSceneInfoChange, 
  onNodeConfigChange,
  // onNodeDataChange,
  devices,
  rooms,
  selectedRoomId,
  nodes,
  edges
}: PropertiesPanelProps) {
  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  // Build execution flow by traversing from Scene Start node
  const buildFlowSummary = () => {
    const startNode = nodes.find(n => n.data.subtype === 'scene-start');
    if (!startNode) return [];

    const flow: Array<{ id: string; label: string; icon: string; color: string }> = [];
    const visited = new Set<string>();
    
    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;
      
      flow.push({
        id: node.id,
        label: String(node.data.label),
        icon: String(node.data.icon),
        color: String(node.data.color)
      });
      
      // Find outgoing edges
      const outgoingEdges = edges.filter(e => e.source === nodeId);
      outgoingEdges.forEach(edge => traverse(edge.target));
    };
    
    traverse(startNode.id);
    return flow;
  };

  const flowSummary = buildFlowSummary();

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.title}>Node Properties</div>
        <div className={styles.subtitle}>{selectedRoom?.name || 'No Room Selected'}</div>
      </div>

      <div className={styles.body}>
        {/* Scene Flow Summary */}
        <div className={styles.group}>
          <div className={styles.groupTitle}>Scene Flow</div>
          {flowSummary.length > 0 ? (
            <div className={styles.flowList}>
              {flowSummary.map((step, index) => (
                <div key={step.id} className={styles.flowItem}>
                  <div className={styles.flowNumber}>{index + 1}</div>
                  <div 
                    className={styles.flowIcon}
                    style={{ background: `${step.color}33`, color: step.color }}
                  >
                    {step.icon}
                  </div>
                  <div className={styles.flowLabel}>{step.label}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>No nodes connected</div>
          )}
        </div>

        {/* Selected Node */}
        <div className={styles.group}>
          <div className={styles.groupTitle}>Node Properties</div>

          {selectedNode ? (
            <>
              <div className={styles.row}>
                <label className={styles.label}>Node Type</label>
                <div className={styles.value}>{String(selectedNode.data.label)}</div>
              </div>

              <div className={styles.row}>
                <label className={styles.label}>Node ID</label>
                <div className={styles.value}>{selectedNode.id}</div>
              </div>

              {selectedNode.data.nodeType === 'device' && (
                <>
                  <div className={styles.row}>
                    <label className={styles.label}>Device</label>
                    <select
                      className={styles.select}
                      value={(selectedNode.data.config as { deviceId?: string })?.deviceId || ''}
                      onChange={(e) => {
                        const device = devices.find(d => d.id === e.target.value);
                        const action = (selectedNode.data.config as { action?: string })?.action;
                        const actionName = action ? action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '';
                        
                        onNodeConfigChange(selectedNode.id, { 
                          deviceId: e.target.value,
                          deviceName: device?.friendly_name || '',
                          actionName: actionName
                        });
                      }}
                    >
                      <option value="">Select device...</option>
                      {devices.map((device) => (
                        <option key={device.id} value={device.id}>
                          {device.friendly_name} ({device.device_type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.row}>
                    <label className={styles.label}>Action</label>
                    <select
                      className={styles.select}
                      value={(selectedNode.data.config as { action?: string })?.action || ''}
                      onChange={(e) => {
                        const actionName = e.target.value.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        
                        onNodeConfigChange(selectedNode.id, { 
                          action: e.target.value,
                          actionName: actionName
                        });
                      }}
                      disabled={!(selectedNode.data.config as { deviceId?: string })?.deviceId}
                    >
                      <option value="">Select action...</option>
                      {(() => {
                        const deviceId = (selectedNode.data.config as { deviceId?: string })?.deviceId;
                        const device = devices.find(d => d.id === deviceId);
                        
                        if (!device?.actions || device.actions.length === 0) {
                          return <option value="" disabled>No actions available for this device</option>;
                        }
                        
                        return device.actions.map((action) => (
                          <option key={action.action_id} value={action.action_id}>
                            {action.friendly_name || action.action_id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>
                </>
              )}

              {selectedNode.data.nodeType === 'sensor' && selectedNode.data.subtype === 'button' && (
                <>
                  <div className={styles.row}>
                    <label className={styles.label}>Touchscreen</label>
                    <select
                      className={styles.select}
                      value={(selectedNode.data.config as { controllerId?: string })?.controllerId || ''}
                      onChange={(e) =>
                        onNodeConfigChange(selectedNode.id, { 
                          controllerId: e.target.value,
                          buttonName: '' // Reset button when controller changes
                        })
                      }
                    >
                      <option value="">Select touchscreen...</option>
                      {devices.filter(d => d.device_type === 'touchscreen').map((device) => (
                        <option key={device.id} value={device.id}>
                          {device.friendly_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.row}>
                    <label className={styles.label}>Button Name</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={(selectedNode.data.config as { buttonName?: string })?.buttonName || ''}
                      onChange={(e) =>
                        onNodeConfigChange(selectedNode.id, { buttonName: e.target.value })
                      }
                      placeholder="Enter button name..."
                      disabled={!(selectedNode.data.config as { controllerId?: string })?.controllerId}
                    />
                  </div>
                </>
              )}

              {selectedNode.data.nodeType === 'effect' && (
                <>
                  <div className={styles.row}>
                    <label className={styles.label}>Device</label>
                    <select
                      className={styles.select}
                      value={(selectedNode.data.config as { device?: string })?.device || ''}
                      onChange={(e) =>
                        onNodeConfigChange(selectedNode.id, { device: e.target.value })
                      }
                    >
                      <option value="">Select device...</option>
                      {devices.map((device) => (
                        <option key={device.id} value={device.id}>
                          {device.friendly_name} ({device.device_type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.row}>
                    <label className={styles.label}>Action</label>
                    <select
                      className={styles.select}
                      value={(selectedNode.data.config as { action?: string })?.action || 'turn_on'}
                      onChange={(e) =>
                        onNodeConfigChange(selectedNode.id, { action: e.target.value })
                      }
                    >
                      <option value="turn_on">Turn On</option>
                      <option value="turn_off">Turn Off</option>
                      <option value="toggle">Toggle</option>
                      <option value="pulse">Pulse</option>
                    </select>
                  </div>
                </>
              )}

              {selectedNode.data.nodeType === 'trigger' && selectedNode.data.subtype === 'timer' && (
                <div className={styles.row}>
                  <label className={styles.label}>Wait Time (milliseconds)</label>
                  <input
                    type="number"
                    className={styles.input}
                    placeholder="1000"
                    min="0"
                    step="100"
                    defaultValue={((selectedNode.data.config as { duration?: string | number })?.duration) || ''}
                    onBlur={(e) =>
                      onNodeConfigChange(selectedNode.id, { duration: e.target.value })
                    }
                  />
                </div>
              )}

              {selectedNode.data.nodeType === 'logic' && selectedNode.data.subtype === 'delay' && (
                <div className={styles.row}>
                  <label className={styles.label}>Duration (seconds)</label>
                  <input
                    type="number"
                    className={styles.input}
                    placeholder="5"
                    value={(selectedNode.data.config as { duration?: string })?.duration || ''}
                    onChange={(e) =>
                      onNodeConfigChange(selectedNode.id, { duration: e.target.value })
                    }
                  />
                </div>
              )}

              {selectedNode.data.nodeType === 'media' && selectedNode.data.subtype === 'video' && (
                <>
                  <div className={styles.row}>
                    <label className={styles.label}>Video File URL</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={(selectedNode.data.config as { videoUrl?: string })?.videoUrl || ''}
                      onChange={(e) => {
                        const config = selectedNode.data.config as any || {};
                        onNodeConfigChange(selectedNode.id, { ...config, videoUrl: e.target.value });
                      }}
                      placeholder="https://example.com/video.mp4"
                    />
                  </div>
                  <div className={styles.row}>
                    <label className={styles.label}>Volume (%)</label>
                    <input
                      type="number"
                      className={styles.input}
                      min="0"
                      max="100"
                      value={(selectedNode.data.config as { volume?: number })?.volume ?? 100}
                      onChange={(e) => {
                        const config = selectedNode.data.config as any || {};
                        onNodeConfigChange(selectedNode.id, { ...config, volume: parseInt(e.target.value) });
                      }}
                    />
                  </div>
                  <div className={styles.row}>
                    <label className={styles.label}>Wait for Completion</label>
                    <label className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={(selectedNode.data.config as { waitForCompletion?: boolean })?.waitForCompletion ?? true}
                        onChange={(e) => {
                          const config = selectedNode.data.config as any || {};
                          onNodeConfigChange(selectedNode.id, { ...config, waitForCompletion: e.target.checked });
                        }}
                      />
                      <span>Block until video finishes</span>
                    </label>
                  </div>
                </>
              )}

              {selectedNode.data.nodeType === 'audio' && (
                <>
                  <div className={styles.row}>
                    <label className={styles.label}>Audio File</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={(selectedNode.data.config as { audioFile?: string })?.audioFile || ''}
                      onChange={(e) =>
                        onNodeConfigChange(selectedNode.id, { audioFile: e.target.value })
                      }
                      placeholder="Enter audio file name..."
                    />
                  </div>
                  <div className={styles.row}>
                    <label className={styles.label}>Volume</label>
                    <input
                      type="number"
                      className={styles.input}
                      min="0"
                      max="100"
                      value={(selectedNode.data.config as { volume?: number })?.volume || 100}
                      onChange={(e) =>
                        onNodeConfigChange(selectedNode.id, { volume: parseInt(e.target.value) })
                      }
                    />
                  </div>
                </>
              )}
            </>
          ) : (
            <div className={styles.emptyState}>
              Select a node to edit its properties
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
