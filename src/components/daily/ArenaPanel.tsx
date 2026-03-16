// Arena Panel - Displays today's time blocks (calendar events)
import { useState, useEffect, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import type { CalendarEvent } from '../landing/CalendarPanel'
import { getThemeBorderColor } from '../../utils/themeColors'

export interface ArenaPanelProps {
  events: CalendarEvent[]
  currentBlock: CalendarEvent | null
  selectedBlock: CalendarEvent | null
  onSelectBlock: (event: CalendarEvent | null) => void
  loading?: boolean
}

export function ArenaPanel({ events, currentBlock, selectedBlock, onSelectBlock, loading }: ArenaPanelProps) {
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null)
  const currentBlockRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // On mobile, auto-scroll to the current time block
  useEffect(() => {
    if (!currentBlock || !currentBlockRef.current || !scrollContainerRef.current) return
    const isMobile = window.innerWidth <= 768
    if (!isMobile) return
    currentBlockRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [currentBlock])

  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => {
    const startA = typeof a.start === 'string' ? parseISO(a.start) : a.start
    const startB = typeof b.start === 'string' ? parseISO(b.start) : b.start
    return startA.getTime() - startB.getTime()
  })

  return (
    <div className="arena-panel">
      <div className="panel-card">
        <div className="panel-header">
          <span className="panel-title">Today's Arena</span>
          <span className="panel-badge">{events.length} blocks</span>
        </div>
        <div className="time-blocks" ref={scrollContainerRef}>
          {loading && (
            <div className="loading-state">Loading time blocks...</div>
          )}
          {!loading && events.length === 0 && (
            <div className="empty-state">No scheduled blocks for today</div>
          )}
          {!loading && sortedEvents.map(event => {
            const start = typeof event.start === 'string' ? parseISO(event.start) : event.start
            const end = typeof event.end === 'string' ? parseISO(event.end) : event.end
            const isCurrent = currentBlock?.id === event.id
            const isSelected = selectedBlock?.id === event.id
            const isExpanded = expandedBlockId === event.id
            const themeColor = getThemeBorderColor(event.colorIndex)

            return (
              <div key={event.id} ref={isCurrent ? currentBlockRef : undefined}>
                <div
                  className={`time-block ${isCurrent ? 'current' : ''} ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    const newSelected = isSelected ? null : event
                    onSelectBlock(newSelected)
                    setExpandedBlockId(isSelected ? null : event.id)
                  }}
                >
                  <div className="block-indicator" style={{ background: themeColor }} />
                  <span className="block-time-inline">{format(start, 'H:mm')}</span>
                  <span className="block-title-inline">{event.title}</span>
                  {isCurrent && <span className="current-dot">●</span>}
                </div>
                {isExpanded && (
                  <div className="block-detail">
                    <div className="block-detail-time">
                      {format(start, 'H:mm')} – {format(end, 'H:mm')}
                    </div>
                    <div className="block-detail-title">{event.title}</div>
                    {event.cardTitle && (
                      <div className="block-detail-action">
                        <span className="block-action-dot" style={{ background: themeColor }} />
                        {event.cardTitle}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
