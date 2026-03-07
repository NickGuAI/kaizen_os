// DateNavHeader component - Date navigation + Day/Week toggle + Action buttons
import { format, startOfWeek, addDays } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import './Layout.css'

interface DateNavHeaderProps {
  viewMode: 'day' | 'week'
  currentDate: Date
  onViewModeChange: (mode: 'day' | 'week') => void
  onDateChange: (date: Date) => void
  // Action buttons (merged from MainHeader)
  planMode?: boolean
  tagMode?: boolean
  onPlanModeToggle?: (enabled: boolean) => void
  onTagModeToggle?: (enabled: boolean) => void
  onSync?: () => void
  syncing?: boolean
  isPlanSubmitted?: boolean
}

export function DateNavHeader({
  viewMode,
  currentDate,
  onViewModeChange,
  onDateChange,
  planMode = false,
  tagMode = false,
  onPlanModeToggle,
  onTagModeToggle,
  onSync,
  syncing = false,
  isPlanSubmitted = false,
}: DateNavHeaderProps) {
  const navigate = useNavigate()
  // Format the date display
  const formatDateDisplay = () => {
    if (viewMode === 'day') {
      return format(currentDate, "EEEE, MMMM d, yyyy")
    } else {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
      const weekEnd = addDays(weekStart, 6)
      const sameMonth = weekStart.getMonth() === weekEnd.getMonth()
      if (sameMonth) {
        return `${format(weekStart, 'MMMM d')} – ${format(weekEnd, 'd, yyyy')}`
      }
      return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`
    }
  }

  const handlePrev = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() - 1)
    } else {
      newDate.setDate(newDate.getDate() - 7)
    }
    onDateChange(newDate)
  }

  const handleNext = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + 1)
    } else {
      newDate.setDate(newDate.getDate() + 7)
    }
    onDateChange(newDate)
  }

  return (
    <div className="date-nav-header">
      {/* Date Navigation */}
      <div className="date-nav-left">
        <button className="date-nav-arrow" onClick={handlePrev}>
          ←
        </button>
        <h2 className="date-nav-title">{formatDateDisplay()}</h2>
        <button className="date-nav-arrow" onClick={handleNext}>
          →
        </button>
      </div>

      {/* View Toggle + GCal Link + Action Buttons */}
      <div className="date-nav-right">
        <div className="view-toggle-pills">
          <button
            className={`view-pill ${viewMode === 'day' ? 'active' : ''}`}
            onClick={() => onViewModeChange('day')}
          >
            Day
          </button>
          <button
            className={`view-pill week-pill ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => onViewModeChange('week')}
          >
            Week
          </button>
        </div>
        <a
          href="https://calendar.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="gcal-link-btn"
        >
          View GCal
        </a>
        {/* Action buttons merged from MainHeader */}
        <div className="header-actions">
          {!planMode && !tagMode && (
            <>
              <button
                className="header-action-btn tag"
                onClick={() => onTagModeToggle?.(true)}
              >
                🏷️ Tag
              </button>
              {onSync && (
                <button
                  className="header-action-btn sync"
                  onClick={onSync}
                  disabled={syncing}
                >
                  {syncing ? '⏳' : '🔄'} {syncing ? 'Syncing...' : 'Sync'}
                </button>
              )}
              <button
                className="header-action-btn review"
                onClick={() => navigate('/review')}
              >
                📊 Review
              </button>
              <button
                className={`header-action-btn plan${isPlanSubmitted ? ' submitted' : ''}`}
                onClick={() => !isPlanSubmitted && onPlanModeToggle?.(true)}
                disabled={isPlanSubmitted}
                title={isPlanSubmitted ? 'This week\'s plan has already been submitted' : undefined}
              >
                📋 {isPlanSubmitted ? 'Planned' : 'Plan'}
              </button>
            </>
          )}
          {planMode && (
            <button
              className="header-action-btn exit"
              onClick={() => onPlanModeToggle?.(false)}
            >
              ✕ Exit Plan
            </button>
          )}
          {tagMode && (
            <button
              className="header-action-btn exit"
              onClick={() => onTagModeToggle?.(false)}
            >
              ✕ Exit Tag
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
