// Snack-Size To-Do's Panel - All daily work items (formerly Today's Playlist)
// Shows all playlist items as checkboxes; replaces the AmmoPanel strip
import { useState, useCallback } from 'react'
import type { WorkItemWithOverlays } from './DailyDashboard'
import { getTodayLocalDate, localDateToUTCRange } from '../../utils/dateUtils'

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

export function SnackSizePanel({ items, onComplete, onCreateTask, onPromoteToFocus, onRemoveFromFocus, top3Keys = [], loading, date }: SnackSizePanelProps) {
  const [quickAddValue, setQuickAddValue] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const snackItems = items

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
    <div className="daily-plan-section snack-size-panel">
      <div className="daily-plan-section-header snack-header">
        <span className="daily-plan-section-title">Snack-Size To-Do's — In Between Meetings (&lt;10 min)</span>
      </div>
      <div className="snack-items-list">
        {loading && <div className="loading-state">Loading snack tasks...</div>}
        {!loading && snackItems.length === 0 && (
          <div className="empty-state daily-plan-hint">No tasks — add one below</div>
        )}
        {!loading && snackItems.map(item => {
          const isCompleted = item.status === 'done'
          const isTop3 = top3Keys.includes(item.key)
          return (
            <div key={item.key} className={`snack-item ${isCompleted ? 'completed' : ''} ${isTop3 ? 'snack-top3' : ''}`}>
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
        })}
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
