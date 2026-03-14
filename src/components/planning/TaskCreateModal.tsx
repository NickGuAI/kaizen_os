import { useState } from 'react';
import '../../styles/task-detail-modal.css';

interface TaskCreateModalProps {
  onSave: (data: { title: string; description?: string; targetDate?: string }) => void;
  onClose: () => void;
}

export function TaskCreateModal({ onSave, onClose }: TaskCreateModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    onSave({
      title: trimmedTitle,
      description: description.trim() || undefined,
      targetDate: targetDate || undefined,
    });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    }
  };

  return (
    <div className="task-modal-overlay" onClick={onClose}>
      <div className="task-modal-content" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="task-modal-header">
          <h3>New Task</h3>
          <button className="task-modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="task-modal-body">
          <div className="task-form-group">
            <label>Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Task title"
              autoFocus
            />
          </div>

          <div className="task-form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Task description"
              rows={3}
            />
          </div>

          <div className="task-form-group">
            <label>Target Date</label>
            <input
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
            />
          </div>
        </div>

        <div className="task-modal-footer">
          <div></div>
          <div className="task-modal-actions">
            <button className="task-btn-secondary" onClick={onClose}>Cancel</button>
            <button className="task-btn-primary" onClick={handleSave} disabled={!title.trim()}>
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
