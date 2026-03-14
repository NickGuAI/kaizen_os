// DateNavHeader - Simplified: date navigation + Day/Week toggle only
import { format, startOfWeek, addDays } from 'date-fns'
import './Layout.css'

interface DateNavHeaderProps {
  viewMode: 'day' | 'week'
  currentDate: Date
  onViewModeChange: (mode: 'day' | 'week') => void
  onDateChange: (date: Date) => void
}

export function DateNavHeader({
  viewMode,
  currentDate,
  onViewModeChange,
  onDateChange,
}: DateNavHeaderProps) {
  const formatDateDisplay = () => {
    if (viewMode === 'day') {
      return format(currentDate, "EEEE, MMMM d, yyyy")
    }
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const weekEnd = addDays(weekStart, 6)
    const sameMonth = weekStart.getMonth() === weekEnd.getMonth()
    if (sameMonth) {
      return `${format(weekStart, 'MMMM d')} – ${format(weekEnd, 'd, yyyy')}`
    }
    return `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`
  }

  const handlePrev = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - (viewMode === 'day' ? 1 : 7))
    onDateChange(newDate)
  }

  const handleNext = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + (viewMode === 'day' ? 1 : 7))
    onDateChange(newDate)
  }

  return (
    <div className="date-nav-header">
      <div className="date-nav-left">
        <button className="date-nav-arrow" onClick={handlePrev}>←</button>
        <h2 className="date-nav-title">{formatDateDisplay()}</h2>
        <button className="date-nav-arrow" onClick={handleNext}>→</button>
      </div>

      <div className="date-nav-right">
        <div className="view-toggle-pills">
          <button
            className={`view-pill ${viewMode === 'day' ? 'active' : ''}`}
            onClick={() => onViewModeChange('day')}
          >
            Day
          </button>
          <button
            className={`view-pill ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => onViewModeChange('week')}
          >
            Week
          </button>
        </div>
      </div>
    </div>
  )
}
