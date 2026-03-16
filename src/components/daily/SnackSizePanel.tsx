// Snack-Size To-Do's Panel - All daily work items (formerly Today's Playlist)
// Shows all playlist items as checkboxes; replaces the AmmoPanel strip
import { useState, useCallback } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { WorkItemWithOverlays } from './DailyDashboard'
import { getTodayLocalDate, localDateToUTCRange } from '../../utils/dateUtils'

export const SNACK_DROP_ZONE_ID = 'snack-drop-zone'

export interface SnackSizePanelProps {
  items: WorkItemWithOverlays[] // All playlist items
  onComplete: (workItemKey: string) => void
  onCreateTask?: (title: string, dueAt?: string) => Promise<void>
  onPromoteToFocus?: (workItemKey: string) => void
  onRemoveFromFocus?: (workItemKey: string) => void
  top3Keys?: string[]
  loading?: boolean
  date: string // YYYY-MM-DD for quick-add
}

interface SnackSortableItemProps {
  item: WorkItemWithOverlays
  onComplete: (workItemKey: string) => void
  onPromoteToFocus?: (workItemKey: string) => void
  onRemoveFromFocus?: (workItemKey: string) => void
  top3Keys: string[]
}

function SnackSortableItem({
  item,
  onComplete,
  onPromoteToFocus,
  onRemoveFromFocus,
  top3Keys,
}: SnackSortableItemProps) {
  const isCompleted = item.status === 'done'
  const isTop3 = top3Keys.includes(item.key)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `snack:${item.key}`,
    disabled: isCompleted,
    data: {
      source: 'snack',
      type: 'snack-item',
      workItemKey: item.key,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`snack-item ${isCompleted ? 'completed' : ''} ${isTop3 ? 'snack-top3 priority-highlight' : ''} ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div
        className={`playlist-checkbox ${isCompleted ? 'checked' : ''}`}
        onClick={() => !isCompleted && onComplete(item.key)}
      />
      <span className="snack-item-title">{item.title}</span>
      {!isCompleted && (onPromoteToFocus || onRemoveFromFocus) && (
        <button
          className={`star-btn ${isTop3 ? 'starred' : ''} ${!isTop3 && top3Keys.length >= 3 ? 'star-full' : ''}`}
          title={isTop3 ? 'Remove from Top 3' : top3Keys.length < 3 ? 'Add to Top 3' : 'Top 3 is full'}
          onClick={(e) => {
            e.stopPropagation()
            if (isTop3) onRemoveFromFocus?.(item.key)
            else if (top3Keys.length < 3) onPromoteToFocus?.(item.key)
          }}
        >
          {isTop3 ? '★' : '☆'}
        </button>
      )}
    </div>
  )
}

export function SnackSizePanel({
  items,
  onComplete,
  onCreateTask,
  onPromoteToFocus,
  onRemoveFromFocus,
  top3Keys = [],
  loading,
  date,
}: SnackSizePanelProps) {
  const [quickAddValue, setQuickAddValue] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const snackItems = items
  const { setNodeRef, isOver } = useDroppable({
    id: SNACK_DROP_ZONE_ID,
    data: { type: 'snack-zone' },
  })

  const handleQuickAdd = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickAddValue.trim() || !onCreateTask) return
    setIsCreating(true)
    try {
      const dueAt = localDateToUTCRange(date || getTodayLocalDate()).start
      await onCreateTask(quickAddValue.trim(), dueAt)
      setQuickAddValue('')
    } catch (error) {
      console.error('Failed to create snack task:', error)
    } finally {
      setIsCreating(false)
    }
  }, [quickAddValue, onCreateTask, date])

  return (
    <div
      ref={setNodeRef}
      className={`daily-plan-section snack-size-panel ${isOver ? 'parking-drop-target' : ''}`}
    >
      <div className="daily-plan-section-header snack-header">
        <span className="daily-plan-section-title">Snack-Size To-Do's — In Between Meetings (&lt;10 min)</span>
      </div>
      <div className="snack-items-list">
        {loading && <div className="loading-state">Loading snack tasks...</div>}
        {!loading && snackItems.length === 0 && (
          <div className="empty-state daily-plan-hint">No tasks — add one below</div>
        )}
        {!loading && (
          <SortableContext items={snackItems.map(item => `snack:${item.key}`)} strategy={verticalListSortingStrategy}>
            {snackItems.map((item) => (
              <SnackSortableItem
                key={item.key}
                item={item}
                onComplete={onComplete}
                onPromoteToFocus={onPromoteToFocus}
                onRemoveFromFocus={onRemoveFromFocus}
                top3Keys={top3Keys}
              />
            ))}
          </SortableContext>
        )}
      </div>
      {onCreateTask && (
        <form className="snack-quick-add" onSubmit={handleQuickAdd}>
          <input
            type="text"
            className="quick-add-input"
            placeholder="+ Add snack-size task..."
            value={quickAddValue}
            onChange={e => setQuickAddValue(e.target.value)}
            disabled={isCreating}
          />
        </form>
      )}
    </div>
  )
}
