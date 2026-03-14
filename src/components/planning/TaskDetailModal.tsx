import { useState } from 'react';
import type { Card, TaskStatus } from '../../lib/api';
import { formatDateForInput } from '../../utils/dateUtils';
import '../../styles/task-detail-modal.css';

interface TaskDetailModalProps {
  task: Card;
  onSave: (updates: Partial<Card>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function TaskDetailModal({ task, onSave, onDelete, onClose }: TaskDetailModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [targetDate, setTargetDate] = useState(formatDateForInput(task.targetDate));

  const handleSave = () => {
    const updates: Partial<Card> = {
      title,
      description: description.trim() || null,
      status,
      targetDate: targetDate || null,
    };
    onSave(updates);
    onClose();
  };

  const handleDelete = () => {
    if (confirm(`Delete task "${task.title}"?`)) {
      onDelete();
      onClose();
    }
  };

  return (
    <div className="task-modal-overlay" onClick={onClose}>
      <div className="task-modal-content" onClick={e => e.stopPropagation()}>
        <div className="task-modal-header">
          <h3>Edit Task</h3>
          <button className="task-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="task-modal-body">
          <div className="task-form-group">
            <label>Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Task title"
              required
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

          <div className="task-form-row">
            <div className="task-form-group">
              <label>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)}>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="backlog">Backlog</option>
              </select>
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
