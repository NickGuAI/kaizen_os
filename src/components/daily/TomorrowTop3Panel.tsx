// Tomorrow's Top 3 Panel - Shows next day's DailyFocus items (read-only display)
import type { WorkItemWithOverlays } from './DailyDashboard'

export interface TomorrowTop3PanelProps {
  items: WorkItemWithOverlays[] // Next day's top 3 focus items
  loading?: boolean
}

export function TomorrowTop3Panel({ items, loading }: TomorrowTop3PanelProps) {
  return (
    <div className="daily-plan-section tomorrow-top3-panel">
      <div className="daily-plan-section-header tomorrow-header">
        <span className="daily-plan-section-title">Tomorrow&apos;s Top 3</span>
      </div>
      {loading && <div className="loading-state">Loading tomorrow&apos;s priorities...</div>}
      {!loading && items.length === 0 && (
        <div className="empty-state daily-plan-hint">No top 3 set for tomorrow yet</div>
      )}
      {!loading && items.map((item) => (
        <div key={item.key} className={`tomorrow-item ${item.status === 'done' ? 'completed' : ''}`}>
          <div
            className={`playlist-checkbox ${item.status === 'done' ? 'checked' : ''}`}
            style={{ pointerEvents: 'none' }}
          />
          <span className="tomorrow-item-title">{item.title}</span>
        </div>
      ))}
    </div>
  )
}
