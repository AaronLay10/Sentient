import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, ACTION_TYPE_LABELS, ACTION_TYPE_ICONS, ACTION_TYPE_COLORS, type Device } from '../../lib/api';
import styles from './NodePalette.module.css';

interface NodePaletteProps {
  onAddNode: (type: string, subtype: string, label: string, icon: string, color: string, deviceId?: string) => void;
  roomId?: string;
}

interface PaletteNode {
  type: string;
  subtype: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  deviceId?: string;
}

const NODE_CATEGORIES = {
  Triggers: [
    { type: 'trigger', subtype: 'scene-start', label: 'Scene Start', description: 'Triggers when scene begins', icon: '▶', color: '#ff8c42' },
    { type: 'trigger', subtype: 'timer', label: 'Timer', description: 'Time-based trigger', icon: '⏲', color: '#fbbf24' },
  ],
  Devices: [
    { type: 'device', subtype: 'control', label: 'Device Control', description: 'Control any device', icon: '🎛', color: '#8b5cf6' },
  ],
  Sensors: [
    { type: 'sensor', subtype: 'button', label: 'Button Press', description: 'Physical button trigger', icon: '◉', color: '#34d399' },
    { type: 'sensor', subtype: 'rfid', label: 'RFID Scan', description: 'RFID tag detection', icon: '⊡', color: '#34d399' },
    { type: 'sensor', subtype: 'weight', label: 'Weight Sensor', description: 'Load cell threshold', icon: '⚖', color: '#34d399' },
  ],
  Puzzles: [
    { type: 'puzzle', subtype: 'puzzle-trigger', label: 'Puzzle', description: 'Trigger a puzzle from the room', icon: '🧩', color: '#6366f1' },
  ],
  'Audio/Visual': [
    { type: 'media', subtype: 'video', label: 'Video Playback', description: 'Play video file', icon: '🎬', color: '#22d3ee' },
    { type: 'audio', subtype: 'sfx', label: 'Sound Effect', description: 'Play audio clip', icon: '🔊', color: '#22d3ee' },
    { type: 'audio', subtype: 'music', label: 'Background Music', description: 'Ambient/loop audio', icon: '♫', color: '#22d3ee' },
    { type: 'audio', subtype: 'voice', label: 'Voice Line', description: 'Narration/dialogue', icon: '🎤', color: '#22d3ee' },
  ],
  Logic: [
    { type: 'logic', subtype: 'delay', label: 'Delay', description: 'Wait before continuing', icon: '⏱', color: '#a78bfa' },
    { type: 'logic', subtype: 'branch', label: 'Branch', description: 'Conditional split', icon: '⑂', color: '#a78bfa' },
    { type: 'logic', subtype: 'loop', label: 'Loop', description: 'Repeat action', icon: '↻', color: '#a78bfa' },
  ],
};

export function NodePalette({ onAddNode, roomId: _roomId }: NodePaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDevices, setShowDevices] = useState(false);

  // Fetch devices for the room
  const { data: devices = [] } = useQuery({
    queryKey: ['devices'],
    queryFn: api.getDevices,
    staleTime: 30000,
  });

  // Group devices by action_type
  const devicesByActionType = useMemo(() => {
    const grouped: Record<string, Device[]> = {};

    devices.forEach((device) => {
      const actionType = device.action_type || 'unknown';
      if (!grouped[actionType]) {
        grouped[actionType] = [];
      }
      grouped[actionType].push(device);
    });

    return grouped;
  }, [devices]);

  // Define display order for action types (outputs first, then inputs)
  const ACTION_TYPE_ORDER = [
    // Output types
    'digital_relay',
    'analog_pwm',
    'rgb_led',
    'position_servo',
    'position_stepper',
    'motor_control',
    'trigger',
    // Input types
    'digital_switch',
    'analog_sensor',
    'counter',
    'code_reader',
    'unknown',
  ];

  // Create device nodes for palette with category metadata
  const deviceCategories = useMemo(() => {
    const categories: Record<string, { icon: string; color: string; nodes: PaletteNode[] }> = {};

    // Sort action types by defined order
    const sortedActionTypes = Object.keys(devicesByActionType).sort((a, b) => {
      const aIndex = ACTION_TYPE_ORDER.indexOf(a);
      const bIndex = ACTION_TYPE_ORDER.indexOf(b);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

    sortedActionTypes.forEach((actionType) => {
      const devicesInType = devicesByActionType[actionType];
      const label = ACTION_TYPE_LABELS[actionType] || actionType;
      const icon = ACTION_TYPE_ICONS[actionType] || '🔧';
      const color = ACTION_TYPE_COLORS[actionType] || '#6b7280';

      categories[label] = {
        icon,
        color,
        nodes: devicesInType.map((device) => ({
          type: 'device',
          subtype: actionType,
          label: device.friendly_name,
          description: `${device.controller_id} · ${device.device_type}`,
          icon,
          color,
          deviceId: device.id,
        })),
      };
    });

    return categories;
  }, [devicesByActionType]);

  const filteredCategories = Object.entries(NODE_CATEGORIES).reduce(
    (acc, [category, nodes]) => {
      const filtered = nodes.filter(
        (node) =>
          node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[category] = filtered;
      }
      return acc;
    },
    {} as Record<string, PaletteNode[]>
  );

  // Filter device categories by search
  const filteredDeviceCategories = Object.entries(deviceCategories).reduce(
    (acc, [category, categoryData]) => {
      const filtered = categoryData.nodes.filter(
        (node) =>
          node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          node.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[category] = {
          ...categoryData,
          nodes: filtered,
        };
      }
      return acc;
    },
    {} as Record<string, { icon: string; color: string; nodes: PaletteNode[] }>
  );

  return (
    <aside className={styles.palette}>
      <div className={styles.header}>
        <div className={styles.title}>Components</div>
        <input
          type="text"
          className={styles.search}
          placeholder="Search components..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className={styles.toggleRow}>
          <button
            className={`${styles.toggleButton} ${!showDevices ? styles.active : ''}`}
            onClick={() => setShowDevices(false)}
          >
            Nodes
          </button>
          <button
            className={`${styles.toggleButton} ${showDevices ? styles.active : ''}`}
            onClick={() => setShowDevices(true)}
          >
            Devices ({devices.length})
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {!showDevices ? (
          // Show standard node categories
          Object.entries(filteredCategories).map(([category, nodes]) => (
            <div key={category} className={styles.section}>
              <div className={styles.sectionTitle}>{category}</div>
              {nodes.map((node) => (
                <div
                  key={node.subtype}
                  className={styles.node}
                  draggable="true"
                  onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
                    const data = JSON.stringify({
                      type: node.type,
                      subtype: node.subtype,
                      label: node.label,
                      icon: node.icon,
                      color: node.color,
                    });
                    e.dataTransfer.setData('application/reactflow', data);
                    e.dataTransfer.effectAllowed = 'move';
                    e.stopPropagation();
                  }}
                  onClick={() => {
                    onAddNode(node.type, node.subtype, node.label, node.icon, node.color);
                  }}
                >
                  <div
                    className={styles.nodeIcon}
                    style={{
                      background: `${node.color}33`,
                      color: node.color,
                    }}
                  >
                    {node.icon}
                  </div>
                  <div className={styles.nodeInfo}>
                    <div className={styles.nodeName}>{node.label}</div>
                    <div className={styles.nodeDesc}>{node.description}</div>
                  </div>
                </div>
              ))}
            </div>
          ))
        ) : (
          // Show devices grouped by action type with category icons and colors
          Object.entries(filteredDeviceCategories).map(([actionTypeLabel, categoryData]) => (
            <div
              key={actionTypeLabel}
              className={styles.section}
              style={{ borderLeft: `3px solid ${categoryData.color}` }}
            >
              <div
                className={styles.sectionTitle}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    background: `${categoryData.color}33`,
                    color: categoryData.color,
                    fontSize: '12px',
                  }}
                >
                  {categoryData.icon}
                </span>
                <span>{actionTypeLabel}</span>
                <span style={{ color: '#6b7280', fontSize: '11px', marginLeft: 'auto' }}>
                  ({categoryData.nodes.length})
                </span>
              </div>
              {categoryData.nodes.map((node) => (
                <div
                  key={node.deviceId}
                  className={styles.node}
                  draggable="true"
                  onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
                    const data = JSON.stringify({
                      type: node.type,
                      subtype: node.subtype,
                      label: node.label,
                      icon: node.icon,
                      color: node.color,
                      deviceId: node.deviceId,
                    });
                    e.dataTransfer.setData('application/reactflow', data);
                    e.dataTransfer.effectAllowed = 'move';
                    e.stopPropagation();
                  }}
                  onClick={() => {
                    onAddNode(node.type, node.subtype, node.label, node.icon, node.color, node.deviceId);
                  }}
                >
                  <div
                    className={styles.nodeIcon}
                    style={{
                      background: `${node.color}33`,
                      color: node.color,
                    }}
                  >
                    {node.icon}
                  </div>
                  <div className={styles.nodeInfo}>
                    <div className={styles.nodeName}>{node.label}</div>
                    <div className={styles.nodeDesc}>{node.description}</div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
