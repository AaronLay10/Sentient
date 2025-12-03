import { useState, useEffect } from 'react';
import styles from './SceneDetailsModal.module.css';

interface SceneDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sceneInfo: {
    name: string;
    description: string;
  };
  onSave: (info: { name: string; description: string }) => void;
}

export function SceneDetailsModal({ isOpen, onClose, sceneInfo, onSave }: SceneDetailsModalProps) {
  const [name, setName] = useState(sceneInfo.name);
  const [description, setDescription] = useState(sceneInfo.description);

  useEffect(() => {
    if (isOpen) {
      setName(sceneInfo.name);
      setDescription(sceneInfo.description);
    }
  }, [isOpen, sceneInfo]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) {
      alert('Scene name is required');
      return;
    }
    onSave({ name: name.trim(), description: description.trim() });
    onClose();
  };

  const handleCancel = () => {
    setName(sceneInfo.name);
    setDescription(sceneInfo.description);
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={handleCancel}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Scene Details</h2>
          <button className={styles.closeButton} onClick={handleCancel}>×</button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Scene Name *</label>
            <input
              type="text"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter scene name..."
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Description</label>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this scene does..."
              rows={4}
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnSecondary} onClick={handleCancel}>
            Cancel
          </button>
          <button className={styles.btnPrimary} onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
