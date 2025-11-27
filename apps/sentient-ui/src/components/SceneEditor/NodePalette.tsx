import { useState } from 'react';
import styles from './NodePalette.module.css';

interface NodePaletteProps {
  onAddNode: (type: string, subtype: string, label: string, icon: string, color: string) => void;
}

interface PaletteNode {
  type: string;
  subtype: string;
  label: string;
  description: string;
  icon: string;
  color: string;
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
    { type: 'puzzle', subtype: 'sequence', label: 'Sequence Check', description: 'Verify input sequence', icon: '⧉', color: '#6366f1' },
    { type: 'puzzle', subtype: 'combination', label: 'Combination Lock', description: 'Code verification', icon: '🔐', color: '#6366f1' },
    { type: 'puzzle', subtype: 'pattern', label: 'Pattern Match', description: 'Compare pattern input', icon: '◫', color: '#6366f1' },
  ],
  Effects: [
    { type: 'effect', subtype: 'light', label: 'Lighting', description: 'Control lights/LEDs', icon: '💡', color: '#f472b6' },
    { type: 'effect', subtype: 'servo', label: 'Servo/Motor', description: 'Mechanical movement', icon: '⚙', color: '#f472b6' },
    { type: 'effect', subtype: 'fog', label: 'Fog Machine', description: 'Atmospheric effect', icon: '☁', color: '#f472b6' },
    { type: 'effect', subtype: 'maglock', label: 'Mag Lock', description: 'Door/compartment lock', icon: '🔓', color: '#f472b6' },
  ],
  Audio: [
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

export function NodePalette({ onAddNode }: NodePaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');

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
      </div>

      <div className={styles.content}>
        {Object.entries(filteredCategories).map(([category, nodes]) => (
          <div key={category} className={styles.section}>
            <div className={styles.sectionTitle}>{category}</div>
            {nodes.map((node) => (
              <div
                key={node.subtype}
                className={styles.node}
                draggable="true"
                onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
                  console.log('🎯 Drag started for node:', node.label);
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
                onDrag={() => {
                  console.log('🔄 Dragging:', node.label);
                }}
                onDragEnd={() => {
                  console.log('🎯 Drag ended for node:', node.label);
                }}
                onMouseDown={() => {
                  console.log('🖱️ Mouse down on:', node.label);
                }}
                onClick={() => {
                  console.log('👆 Click on:', node.label);
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
        ))}
      </div>
    </aside>
  );
}
