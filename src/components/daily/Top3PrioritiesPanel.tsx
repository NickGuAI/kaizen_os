// Top 3 Priorities Panel - Renders top 3 focus items for the day
// Items sourced from DailyFocus.topKeys, with hardest task first
import type { WorkItemWithOverlays } from './DailyDashboard'

export interface Top3PrioritiesPanelProps {
  items: WorkItemWithOverlays[] // The top 3 focus items in ranked order
  onComplete: (workItemKey: string) => void
  onRemove: (workItemKey: string) => void
  loading?: boolean
}

const SLOTS = [0, 1, 2]

export function Top3PrioritiesPanel({ items, onComplete, onRemove, loading }: Top3PrioritiesPanelProps) {
  return (
    <div className="daily-plan-section top3-priorities-panel">
      <div className="daily-plan-section-header top3-header">
        <span className="daily-plan-section-title">Top 3 Priorities — Next Actions</span>
        <span className="daily-plan-section-subtitle">Time</span>
      </div>
      {loading && <div className="loading-state">Loading priorities...</div>}
      {!loading && SLOTS.map(i => {
        const item = items[i]
        if (item) {
          const isCompleted = item.status === 'done'
          return (
            <div
              key={item.key}
              className={`top3-priority-item ${isCompleted ? 'completed' : ''} ${i === 0 ? 'top3-first' : ''}`}
            >
              <span className="top3-rank-label">{i + 1}.</span>
              <div
                className={`playlist-checkbox ${isCompleted ? 'checked' : ''}`}
                onClick={() => !isCompleted && onComplete(item.key)}
              />
              <span className="top3-item-title">{item.title}</span>
              {!isCompleted && (
                <button
                  className="top3-remove-btn"
                  title="Remove from top 3"
                  onClick={() => onRemove(item.key)}
                >
                  &times;
                </button>
              )}
            </div>
          )
        }
        return (
          <div key={`placeholder-${i}`} className="top3-placeholder-slot">
            <span className="top3-rank-label">{i + 1}.</span>
            <span className="top3-placeholder-hint">Star a task to add</span>
          </div>
        )
      })}
      {!loading && items.length > 0 && (
        <div className="top3-hint">Until your first task is finished, consider everything else a distraction.</div>
      )}
    </div>
  )
}
