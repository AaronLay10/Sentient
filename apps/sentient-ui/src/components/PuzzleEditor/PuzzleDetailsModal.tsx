import { useState } from 'react';
import styles from './PuzzleDetailsModal.module.css';

interface PuzzleDetailsModalProps {
  puzzleInfo: {
    name: string;
    description: string;
    timeout_seconds?: number;
    hint_text: string;
  };
  onClose: () => void;
  onSave: (details: { name: string; description: string; timeout_seconds?: number; hint_text: string }) => void;
}

export function PuzzleDetailsModal({ puzzleInfo, onClose, onSave }: PuzzleDetailsModalProps) {
  const [name, setName] = useState(puzzleInfo.name);
  const [description, setDescription] = useState(puzzleInfo.description);
  const [timeoutSeconds, setTimeoutSeconds] = useState<number | ''>(puzzleInfo.timeout_seconds || '');
  const [hintText, setHintText] = useState(puzzleInfo.hint_text);

  const handleSave = () => {
    if (!name.trim()) {
      alert('Puzzle name is required');
      return;
    }
    onSave({
      name: name.trim(),
      description: description.trim(),
      timeout_seconds: timeoutSeconds === '' ? undefined : timeoutSeconds,
      hint_text: hintText.trim(),
    });
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Edit Puzzle Details</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.body}>
          <div className={styles.field}>
            <label className={styles.label}>Puzzle Name *</label>
            <input
              type="text"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter puzzle name..."
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this puzzle involves..."
              rows={3}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Timeout (seconds)</label>
            <input
              type="number"
              className={styles.input}
              value={timeoutSeconds}
              onChange={(e) => setTimeoutSeconds(e.target.value === '' ? '' : parseInt(e.target.value))}
              placeholder="Optional - leave empty for no timeout"
              min={0}
            />
            <div className={styles.hint}>
              If set, the puzzle will fail automatically after this many seconds
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Hint Text</label>
            <textarea
              className={styles.textarea}
              value={hintText}
              onChange={(e) => setHintText(e.target.value)}
              placeholder="Hint to display if players are stuck..."
              rows={2}
            />
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.btnPrimary} onClick={handleSave}>
            Save Details
          </button>
        </div>
      </div>
    </div>
  );
}
