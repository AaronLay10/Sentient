import { useState } from 'react';
import styles from './PuzzleNodePalette.module.css';

interface PuzzleNodePaletteProps {
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
  Sensors: [
    { type: 'sensor', subtype: 'button', label: 'Button', description: 'Physical button input', icon: '◉', color: '#34d399' },
    { type: 'sensor', subtype: 'rfid', label: 'RFID Reader', description: 'RFID tag detection', icon: '⊡', color: '#34d399' },
    { type: 'sensor', subtype: 'weight', label: 'Weight Sensor', description: 'Load cell threshold', icon: '⚖', color: '#34d399' },
    { type: 'sensor', subtype: 'switch', label: 'Switch/Toggle', description: 'On/off switch input', icon: '⏻', color: '#34d399' },
    { type: 'sensor', subtype: 'keypad', label: 'Keypad', description: 'Numeric/code entry', icon: '⌨', color: '#34d399' },
    { type: 'sensor', subtype: 'proximity', label: 'Proximity', description: 'Object detection', icon: '◎', color: '#34d399' },
    { type: 'sensor', subtype: 'magnetic', label: 'Magnetic Contact', description: 'Door/drawer open/close', icon: '⌗', color: '#34d399' },
    { type: 'sensor', subtype: 'light', label: 'Light Detection', description: 'Light level threshold sensor', icon: '☀', color: '#34d399' },
  ],
  Logic: [
    { type: 'logic', subtype: 'sequence', label: 'Sequence Check', description: 'Inputs must occur in order', icon: '⧉', color: '#6366f1' },
    { type: 'logic', subtype: 'combination', label: 'Combination Lock', description: 'All values must match', icon: '🔐', color: '#6366f1' },
    { type: 'logic', subtype: 'pattern', label: 'Pattern Match', description: 'Match a defined pattern', icon: '◫', color: '#6366f1' },
    { type: 'logic', subtype: 'all-of', label: 'All Of (AND)', description: 'All inputs must be active', icon: '∧', color: '#a78bfa' },
    { type: 'logic', subtype: 'any-of', label: 'Any Of (OR)', description: 'At least one input active', icon: '∨', color: '#a78bfa' },
  ],
  Output: [
    { type: 'output', subtype: 'puzzle-solved', label: 'Puzzle Solved', description: 'Marks puzzle as complete', icon: '✓', color: '#22c55e' },
  ],
  'Audio/Effects': [
    { type: 'audio', subtype: 'sfx', label: 'Sound Effect', description: 'Play sound effect cue', icon: '♫', color: '#00d9ff' },
    { type: 'audio', subtype: 'music', label: 'Music Cue', description: 'Play music/score cue', icon: '♪', color: '#00d9ff' },
    { type: 'audio', subtype: 'voice', label: 'Voice/Narration', description: 'Play voice narration cue', icon: '🗣', color: '#00d9ff' },
    { type: 'audio', subtype: 'stop', label: 'Stop Audio', description: 'Stop audio cue or all', icon: '⏹', color: '#f97316' },
  ],
};

export function PuzzleNodePalette({ onAddNode }: PuzzleNodePaletteProps) {
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
        <div className={styles.title}>Puzzle Components</div>
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
                key={`${node.type}-${node.subtype}`}
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
        ))}
      </div>
    </aside>
  );
}
