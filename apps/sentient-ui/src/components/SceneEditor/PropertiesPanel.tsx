import type { Node as FlowNode } from '@xyflow/react';
import styles from './PropertiesPanel.module.css';

interface PropertiesPanelProps {
  selectedNode: FlowNode | null;
  sceneInfo: {
    name: string;
    room: string;
    triggerMode: string;
  };
  onSceneInfoChange: (info: any) => void;
  onNodeConfigChange: (nodeId: string, config: any) => void;
}

export function PropertiesPanel({ selectedNode, sceneInfo, onSceneInfoChange, onNodeConfigChange }: PropertiesPanelProps) {
  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.title}>Scene Properties</div>
        <div className={styles.subtitle}>{sceneInfo.room} • {sceneInfo.name}</div>
      </div>

      <div className={styles.body}>
        {/* Scene Info */}
        <div className={styles.infoCard}>
          <div className={styles.infoName}>{sceneInfo.name}</div>
          <div className={styles.infoMeta}>{sceneInfo.room} • 8 nodes • 7 connections</div>
        </div>

        {/* Scene Settings */}
        <div className={styles.group}>
          <div className={styles.groupTitle}>Scene Settings</div>

          <div className={styles.row}>
            <label className={styles.label}>Scene Name</label>
            <input
              type="text"
              className={styles.input}
              value={sceneInfo.name}
              onChange={(e) => onSceneInfoChange({ ...sceneInfo, name: e.target.value })}
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Room</label>
            <select
              className={styles.select}
              value={sceneInfo.room}
              onChange={(e) => onSceneInfoChange({ ...sceneInfo, room: e.target.value })}
            >
              <option>Return of the Pharaohs</option>
              <option>Clockwork Corridor</option>
              <option>Quantum Breach</option>
              <option>The Haunting</option>
            </select>
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Trigger Mode</label>
            <select
              className={styles.select}
              value={sceneInfo.triggerMode}
              onChange={(e) => onSceneInfoChange({ ...sceneInfo, triggerMode: e.target.value })}
            >
              <option>Manual Start</option>
              <option>Auto on Room Start</option>
              <option>Scheduled</option>
            </select>
          </div>
        </div>

        {/* Selected Node */}
        <div className={styles.group}>
          <div className={styles.groupTitle}>Selected Node</div>

          {selectedNode ? (
            <>
              <div className={styles.row}>
                <label className={styles.label}>Node Type</label>
                <div className={styles.value}>{selectedNode.data.label}</div>
              </div>

              <div className={styles.row}>
                <label className={styles.label}>Node ID</label>
                <div className={styles.value}>{selectedNode.id}</div>
              </div>

              {selectedNode.data.nodeType === 'effect' && (
                <>
                  <div className={styles.row}>
                    <label className={styles.label}>Device</label>
                    <select
                      className={styles.select}
                      value={selectedNode.data.config?.device || ''}
                      onChange={(e) =>
                        onNodeConfigChange(selectedNode.id, { device: e.target.value })
                      }
                    >
                      <option value="">Select device...</option>
                      <option value="PHR-DOOR">Pharaohs Door Lock</option>
                      <option value="PHR-T1">Pharaohs Torch 1</option>
                      <option value="PHR-T2">Pharaohs Torch 2</option>
                      <option value="CLK-G1">Clockwork Gear 1</option>
                    </select>
                  </div>

                  <div className={styles.row}>
                    <label className={styles.label}>Action</label>
                    <select className={styles.select}>
                      <option>Turn On</option>
                      <option>Turn Off</option>
                      <option>Toggle</option>
                      <option>Pulse</option>
                    </select>
                  </div>
                </>
              )}

              {selectedNode.data.nodeType === 'logic' && selectedNode.data.subtype === 'delay' && (
                <div className={styles.row}>
                  <label className={styles.label}>Duration (seconds)</label>
                  <input
                    type="number"
                    className={styles.input}
                    placeholder="5"
                    value={selectedNode.data.config?.duration || ''}
                    onChange={(e) =>
                      onNodeConfigChange(selectedNode.id, { duration: e.target.value })
                    }
                  />
                </div>
              )}

              {selectedNode.data.nodeType === 'audio' && (
                <div className={styles.row}>
                  <label className={styles.label}>Audio File</label>
                  <select className={styles.select}>
                    <option value="">Select audio...</option>
                    <option>pharaohs_intro.mp3</option>
                    <option>tomb_ambience.mp3</option>
                    <option>puzzle_solved.mp3</option>
                  </select>
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
