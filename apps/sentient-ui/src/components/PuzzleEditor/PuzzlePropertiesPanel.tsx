import type { Node as FlowNode, Edge } from '@xyflow/react';
import type { Device, Room } from '../../lib/api';
import styles from './PuzzlePropertiesPanel.module.css';

interface PuzzlePropertiesPanelProps {
  selectedNode: FlowNode | null;
  onNodeConfigChange: (nodeId: string, config: any) => void;
  devices: Device[];
  rooms: Room[];
  selectedRoomId: string;
  nodes: FlowNode[];
  edges: Edge[];
}

export function PuzzlePropertiesPanel({
  selectedNode,
  onNodeConfigChange,
  devices,
  rooms,
  selectedRoomId,
  nodes,
  edges
}: PuzzlePropertiesPanelProps) {
  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  // Filter to only sensor devices for the selected room
  const sensorDevices = devices.filter(d =>
    d.device_category === 'sensor' ||
    d.device_type?.toLowerCase().includes('sensor') ||
    d.device_type?.toLowerCase().includes('button') ||
    d.device_type?.toLowerCase().includes('rfid') ||
    d.device_type?.toLowerCase().includes('keypad') ||
    d.device_type?.toLowerCase().includes('switch')
  );

  // Build puzzle flow by traversing connections
  const buildFlowSummary = () => {
    const flow: Array<{ id: string; label: string; icon: string; color: string }> = [];
    const visited = new Set<string>();

    // Find all nodes that have no incoming edges (entry points)
    const nodesWithIncoming = new Set(edges.map(e => e.target));
    const entryNodes = nodes.filter(n => !nodesWithIncoming.has(n.id));

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

      const outgoingEdges = edges.filter(e => e.source === nodeId);
      outgoingEdges.forEach(edge => traverse(edge.target));
    };

    entryNodes.forEach(node => traverse(node.id));
    return flow;
  };

  const flowSummary = buildFlowSummary();

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.title}>Puzzle Properties</div>
        <div className={styles.subtitle}>{selectedRoom?.name || 'No Room Selected'}</div>
      </div>

      <div className={styles.body}>
        {/* Puzzle Flow Summary */}
        <div className={styles.group}>
          <div className={styles.groupTitle}>Puzzle Flow</div>
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
            <div className={styles.emptyState}>No nodes added yet</div>
          )}
        </div>

        {/* Selected Node Properties */}
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

              {/* Sensor Node Configuration */}
              {selectedNode.data.nodeType === 'sensor' && (
                <>
                  <div className={styles.row}>
                    <label className={styles.label}>Device</label>
                    <select
                      className={styles.select}
                      value={(selectedNode.data.config as { deviceId?: string })?.deviceId || ''}
                      onChange={(e) => {
                        const device = devices.find(d => d.id === e.target.value);
                        onNodeConfigChange(selectedNode.id, {
                          deviceId: e.target.value,
                          deviceName: device?.friendly_name || ''
                        });
                      }}
                    >
                      <option value="">Select sensor device...</option>
                      {sensorDevices.map((device) => (
                        <option key={device.id} value={device.id}>
                          {device.friendly_name} ({device.device_type})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* RFID specific - expected tag ID */}
                  {selectedNode.data.subtype === 'rfid' && (
                    <div className={styles.row}>
                      <label className={styles.label}>Expected Tag ID</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={(selectedNode.data.config as { expectedTagId?: string })?.expectedTagId || ''}
                        onChange={(e) =>
                          onNodeConfigChange(selectedNode.id, { expectedTagId: e.target.value })
                        }
                        placeholder="Enter expected RFID tag ID..."
                      />
                    </div>
                  )}

                  {/* Keypad specific - expected code */}
                  {selectedNode.data.subtype === 'keypad' && (
                    <div className={styles.row}>
                      <label className={styles.label}>Expected Code</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={(selectedNode.data.config as { expectedCode?: string })?.expectedCode || ''}
                        onChange={(e) =>
                          onNodeConfigChange(selectedNode.id, { expectedCode: e.target.value })
                        }
                        placeholder="Enter expected code..."
                      />
                    </div>
                  )}

                  {/* Weight sensor specific - threshold */}
                  {selectedNode.data.subtype === 'weight' && (
                    <>
                      <div className={styles.row}>
                        <label className={styles.label}>Weight Threshold (g)</label>
                        <input
                          type="number"
                          className={styles.input}
                          value={(selectedNode.data.config as { threshold?: number })?.threshold || ''}
                          onChange={(e) =>
                            onNodeConfigChange(selectedNode.id, { threshold: parseInt(e.target.value) })
                          }
                          placeholder="Enter weight in grams..."
                        />
                      </div>
                      <div className={styles.row}>
                        <label className={styles.label}>Tolerance (+/- g)</label>
                        <input
                          type="number"
                          className={styles.input}
                          value={(selectedNode.data.config as { tolerance?: number })?.tolerance || 50}
                          onChange={(e) =>
                            onNodeConfigChange(selectedNode.id, { tolerance: parseInt(e.target.value) })
                          }
                          placeholder="50"
                        />
                      </div>
                    </>
                  )}

                  {/* Switch/Toggle specific - expected state */}
                  {selectedNode.data.subtype === 'switch' && (
                    <div className={styles.row}>
                      <label className={styles.label}>Expected State</label>
                      <select
                        className={styles.select}
                        value={(selectedNode.data.config as { expectedState?: string })?.expectedState || 'on'}
                        onChange={(e) =>
                          onNodeConfigChange(selectedNode.id, { expectedState: e.target.value })
                        }
                      >
                        <option value="on">On</option>
                        <option value="off">Off</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* Logic Node Configuration */}
              {selectedNode.data.nodeType === 'logic' && (
                <>
                  {/* Sequence Check */}
                  {selectedNode.data.subtype === 'sequence' && (
                    <div className={styles.row}>
                      <label className={styles.label}>Sequence Order</label>
                      <div className={styles.hint}>
                        Connect sensor nodes in the order they must be activated
                      </div>
                    </div>
                  )}

                  {/* Combination Lock */}
                  {selectedNode.data.subtype === 'combination' && (
                    <div className={styles.row}>
                      <label className={styles.label}>Required Inputs</label>
                      <div className={styles.hint}>
                        All connected inputs must be in their expected state simultaneously
                      </div>
                    </div>
                  )}

                  {/* Pattern Match */}
                  {selectedNode.data.subtype === 'pattern' && (
                    <div className={styles.row}>
                      <label className={styles.label}>Pattern Definition</label>
                      <textarea
                        className={styles.textarea}
                        value={(selectedNode.data.config as { pattern?: string })?.pattern || ''}
                        onChange={(e) =>
                          onNodeConfigChange(selectedNode.id, { pattern: e.target.value })
                        }
                        placeholder="Define pattern (e.g., 1,2,3,2,1)"
                        rows={3}
                      />
                    </div>
                  )}
                </>
              )}

              {/* Output Node - Puzzle Solved */}
              {selectedNode.data.nodeType === 'output' && selectedNode.data.subtype === 'puzzle-solved' && (
                <div className={styles.row}>
                  <label className={styles.label}>Completion Message</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={(selectedNode.data.config as { message?: string })?.message || ''}
                    onChange={(e) =>
                      onNodeConfigChange(selectedNode.id, { message: e.target.value })
                    }
                    placeholder="Puzzle solved!"
                  />
                </div>
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
