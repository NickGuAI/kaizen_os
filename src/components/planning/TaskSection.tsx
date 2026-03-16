import { useState } from 'react';
import type { Card } from '../../lib/api';
import type { PlannedTask } from './ActionPlanPanel';
import { StatusBadge } from '../ui/Badge';
import { format } from 'date-fns';

interface TaskSectionProps {
  tasks: Card[];
  plannedTasks: PlannedTask[];
  onUpdateTask: (id: string, updates: Partial<Card>) => void;
  onDeleteTask: (id: string) => void;
  onEditTask: (task: Card) => void;
  onDragStart?: (task: Card) => void;
}

export function TaskSection({
  tasks,
  plannedTasks,
  onUpdateTask,
  onDeleteTask,
  onEditTask,
  onDragStart,
}: TaskSectionProps) {
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  // Filter out backlog tasks
  const visibleTasks = tasks.filter(t => t.status !== 'backlog');

  // Determine which tasks are planned (have any PlannedTask with matching cardId)
  const plannedTaskIds = new Set(plannedTasks.map(pt => pt.cardId ?? pt.actionId));
  const plannedThisWeek = visibleTasks.filter(t => plannedTaskIds.has(t.id));
  const unplanned = visibleTasks.filter(t => !plannedTaskIds.has(t.id));

  const cycleStatus = (task: Card) => {
    const statusOrder = ['not_started', 'in_progress', 'completed', 'backlog'] as const;
    const currentIndex = statusOrder.indexOf(task.status as typeof statusOrder[number]);
    const nextIndex = (currentIndex + 1) % statusOrder.length;
    onUpdateTask(task.id, { status: statusOrder[nextIndex] });
  };

  const handleDragStart = (e: React.DragEvent, task: Card) => {
    setDraggingTaskId(task.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'ACTION',
      taskId: task.id,
      cardId: task.id,
      title: task.title,
    }));
    if (onDragStart) {
      onDragStart(task);
    }
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
  };

  const getTaskTimes = (taskId: string): string[] => {
    return plannedTasks
      .filter(pt => (pt.cardId ?? pt.actionId) === taskId)
      .map(pt => {
        const start = pt.start instanceof Date ? pt.start : new Date(pt.start);
        return format(start, 'EEE ha');
      });
  };

  const renderTaskItem = (task: Card, isPlanned: boolean) => {
    const times = isPlanned ? getTaskTimes(task.id) : [];
    const isDragging = draggingTaskId === task.id;

    return (
      <div
        key={task.id}
        className={`task-item ${isPlanned ? 'task-item-planned' : ''} ${isDragging ? 'dragging' : ''}`}
        draggable
        onDragStart={(e) => handleDragStart(e, task)}
        onDragEnd={handleDragEnd}
      >
        <div className="task-item-status" onClick={() => cycleStatus(task)}>
          <StatusBadge status={task.status} />
        </div>
        <div className="task-item-title" onClick={() => onEditTask(task)}>
          {task.title}
        </div>
        {times.length > 0 && (
          <div className="task-item-time">
            {times.join(', ')}
          </div>
        )}
        <button
          className="task-item-delete"
          onClick={() => onDeleteTask(task.id)}
          aria-label="Delete task"
        >
          ×
        </button>
      </div>
    );
  };

  if (visibleTasks.length === 0) {
    return (
      <div className="task-section">
        <div className="task-section-header">
          ✅ Tasks
        </div>
        <div className="task-section-empty">
          No tasks yet.
        </div>
      </div>
    );
  }

  return (
    <div className="task-section">
      <div className="task-section-header">
        ✅ Tasks
      </div>

      {plannedThisWeek.length > 0 && (
        <div className="task-group">
          <div className="task-group-header">
            Planned This Week ({plannedThisWeek.length})
          </div>
          {plannedThisWeek.map(task => renderTaskItem(task, true))}
        </div>
      )}

      {unplanned.length > 0 && (
        <div className="task-group">
          <div className="task-group-header">
            Unplanned ({unplanned.length})
          </div>
          {unplanned.map(task => renderTaskItem(task, false))}
        </div>
      )}

    </div>
  );
}
