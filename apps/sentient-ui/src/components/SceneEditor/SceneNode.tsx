import { memo } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import styles from './SceneNode.module.css';

interface SceneNodeProps {
  id: string;
  data: {
    label: string;
    nodeType: string;
    subtype: string;
    icon: string;
    color: string;
    config?: any;
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

  return (
    <div className={`${styles.node} ${selected ? styles.selected : ''}`}>
      {hasInput && <Handle type="target" position={Position.Left} className={styles.handle} />}

      <div className={styles.header}>
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
            title="Delete node (Del/Backspace)"
            onClick={handleDelete}
          >
            ×
          </div>
        )}
      </div>

      <div className={styles.body}>
        {data.config?.device && (
          <div className={styles.field}>
            <div className={styles.label}>Device</div>
            <div className={styles.value}>{data.config.device}</div>
          </div>
        )}
        {data.config?.duration && (
          <div className={styles.field}>
            <div className={styles.label}>Duration</div>
            <div className={styles.value}>{data.config.duration}s</div>
          </div>
        )}
        {!data.config?.device && !data.config?.duration && (
          <div className={styles.field}>
            <div className={styles.label}>Status</div>
            <div className={styles.value}>Ready</div>
          </div>
        )}
      </div>

      <div className={styles.ports}>
        {hasMultipleOutputs ? (
          <>
            <Handle type="source" position={Position.Right} id="true" className={styles.handle} style={{ top: '60%' }} />
            <Handle type="source" position={Position.Right} id="false" className={styles.handle} style={{ top: '80%' }} />
          </>
        ) : (
          <Handle type="source" position={Position.Right} className={styles.handle} />
        )}
      </div>
    </div>
  );
});

SceneNode.displayName = 'SceneNode';
