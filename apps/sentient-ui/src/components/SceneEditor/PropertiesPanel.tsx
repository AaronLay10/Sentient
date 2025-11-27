import type { Node as FlowNode } from '@xyflow/react';
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
}

export function PropertiesPanel({ 
  selectedNode, 
  sceneInfo, 
  onSceneInfoChange, 
  onNodeConfigChange,
  onNodeDataChange,
  devices,
  rooms,
  selectedRoomId
}: PropertiesPanelProps) {
  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.title}>Node Properties</div>
        <div className={styles.subtitle}>{selectedRoom?.name || 'No Room Selected'}</div>
      </div>

      <div className={styles.body}>
        {/* Selected Node */}
        <div className={styles.group}>

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
                        const action = (selectedNode.data.config as { action?: string })?.action || 'turn_on';
                        const newLabel = device ? `${device.friendly_name} - ${action.replace('_', ' ')}` : 'Device Control';
                        onNodeConfigChange(selectedNode.id, { deviceId: e.target.value });
                        onNodeDataChange(selectedNode.id, { label: newLabel });
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
                        const deviceId = (selectedNode.data.config as { deviceId?: string })?.deviceId;
                        const device = devices.find(d => d.id === deviceId);
                        const actionName = e.target.value.replace(/_/g, ' ');
                        const newLabel = device ? `${device.friendly_name} - ${actionName}` : 'Device Control';
                        onNodeConfigChange(selectedNode.id, { action: e.target.value });
                        onNodeDataChange(selectedNode.id, { label: newLabel });
                      }}
                      disabled={!(selectedNode.data.config as { deviceId?: string })?.deviceId}
                    >
                      <option value="">Select action...</option>
                      {(() => {
                        const deviceId = (selectedNode.data.config as { deviceId?: string })?.deviceId;
                        const device = devices.find(d => d.id === deviceId);
                        return device?.actions?.map((action) => (
                          <option key={action.action_id} value={action.action_id}>
                            {action.friendly_name || action.action_id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </option>
                        )) || [];
                      })()}
                    </select>
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
