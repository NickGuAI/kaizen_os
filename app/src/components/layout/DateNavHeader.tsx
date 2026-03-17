// DateNavHeader - date navigation + Day/Week toggle + Sync
import { useState } from 'react'
import { format, startOfWeek, addDays } from 'date-fns'
import { apiFetch } from '../../lib/apiFetch'
import './Layout.css'

interface DateNavHeaderProps {
  viewMode: 'day' | 'week'
  currentDate: Date
  onViewModeChange: (mode: 'day' | 'week') => void
  onDateChange: (date: Date) => void
  onSyncComplete?: () => void
}

export function DateNavHeader({
  viewMode,
  currentDate,
  onViewModeChange,
  onDateChange,
  onSyncComplete,
}: DateNavHeaderProps) {
  const [syncing, setSyncing] = useState(false)

  const handleSync = async () => {
    setSyncing(true)
    try {
      await apiFetch('/api/calendar/sync', { method: 'POST' })
      onSyncComplete?.()
    } catch (error) {
      console.error('Calendar sync failed:', error)
    } finally {
      setSyncing(false)
    }
  }
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
        <button
          className="date-nav-sync"
          onClick={handleSync}
          disabled={syncing}
          title="Sync calendar"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={syncing ? { animation: 'spin 1s linear infinite' } : undefined}>
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
          </svg>
          {syncing ? 'Syncing...' : 'Sync'}
        </button>
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
