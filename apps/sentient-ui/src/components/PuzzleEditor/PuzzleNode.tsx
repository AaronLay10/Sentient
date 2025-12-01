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
    onConfigChange?: (nodeId: string, config: any) => void;
  };
  selected?: boolean;
}

export const PuzzleNode = memo(({ id, data, selected }: PuzzleNodeProps) => {
  const { deleteElements } = useReactFlow();

  // Sensors have outputs only, Logic has inputs and outputs, Output (Puzzle Solved) has input only
  const hasInput = data.nodeType !== 'sensor';
  const hasOutput = data.nodeType !== 'output';

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

            {/* Weight sensor specific */}
            {data.subtype === 'weight' && data.config?.deviceId && (
              <div className={styles.field}>
                <div className={styles.label}>Threshold (g)</div>
                <input
                  type="number"
                  className={`${styles.dropdown} nopan nodrag`}
                  value={data.config?.threshold || ''}
                  onChange={(e) => {
                    e.stopPropagation();
                    data.onConfigChange?.(id, { threshold: parseInt(e.target.value) });
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder="Weight..."
                />
              </div>
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
      </div>

      {hasOutput && (
        <Handle type="source" position={Position.Right} className={styles.handle} style={{ top: '50%', right: '-7px' }} />
      )}
    </div>
  );
});

PuzzleNode.displayName = 'PuzzleNode';
