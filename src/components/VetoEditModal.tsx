import { useState } from 'react';
import type { Card } from '../lib/api';
import '../styles/task-detail-modal.css';

interface VetoEditModalProps {
  veto: Card;
  onSave: (updates: { title: string; description?: string }) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function VetoEditModal({ veto, onSave, onDelete, onClose }: VetoEditModalProps) {
  const [title, setTitle] = useState(veto.title);
  const [description, setDescription] = useState(veto.description || '');

  const handleSave = () => {
    onSave({
      title,
      description: description.trim() || undefined,
    });
    onClose();
  };

  const handleDelete = () => {
    if (confirm(`Delete veto "${veto.title}"?`)) {
      onDelete();
      onClose();
    }
  };

  return (
    <div className="task-modal-overlay" onClick={onClose}>
      <div className="task-modal-content" onClick={e => e.stopPropagation()}>
        <div className="task-modal-header">
          <h3>Edit Veto</h3>
          <button className="task-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="task-modal-body">
          <div className="task-form-group">
            <label>Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Veto title"
              required
            />
          </div>

          <div className="task-form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </div>
        </div>

        <div className="task-modal-footer">
          <button className="task-btn-delete" onClick={handleDelete}>
            Delete
          </button>
          <div className="task-modal-actions">
            <button className="task-btn-secondary" onClick={onClose}>Cancel</button>
            <button className="task-btn-primary" onClick={handleSave} disabled={!title.trim()}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
