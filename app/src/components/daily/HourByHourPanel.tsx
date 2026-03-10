// Hour-by-Hour Hard Landscape Panel - 7AM to 7PM grid in 30-min slots
// Calendar events are overlaid at their time positions
import { useMemo } from 'react'
import { parseISO, getHours, getMinutes } from 'date-fns'
import type { CalendarEvent } from '../landing/CalendarPanel'
import { getThemeBorderColor } from '../../utils/themeColors'

export interface HourByHourPanelProps {
  events: CalendarEvent[]
  currentBlock?: CalendarEvent | null
  loading?: boolean
  date: string // YYYY-MM-DD
}

interface SlotLabel {
  label: string
  hour: number
  minute: number
}

// Generate 30-minute slots from 7:00 to 19:00
function generateSlots(): SlotLabel[] {
  const slots: SlotLabel[] = []
  for (let h = 7; h <= 19; h++) {
    const displayH = h > 12 ? h - 12 : h
    const suffix = h < 12 ? 'AM' : h === 12 ? 'PM' : ''
    slots.push({ label: `${displayH}:00${suffix}`, hour: h, minute: 0 })
    if (h < 19) {
      slots.push({ label: `${displayH}:30`, hour: h, minute: 30 })
    }
  }
  return slots
}

function timeToSlotIndex(hour: number, minute: number): number {
  return (hour - 7) * 2 + (minute >= 30 ? 1 : 0)
}

export function HourByHourPanel({ events, currentBlock, loading }: HourByHourPanelProps) {
  const slots = useMemo(() => generateSlots(), [])

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const startA = typeof a.start === 'string' ? parseISO(a.start) : a.start
      const startB = typeof b.start === 'string' ? parseISO(b.start) : b.start
      return startA.getTime() - startB.getTime()
    })
  }, [events])

  const slotEvents = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>()
    for (const event of sortedEvents) {
      const start = typeof event.start === 'string' ? parseISO(event.start) : event.start
      const h = getHours(start)
      const m = getMinutes(start)
      if (h < 7 || h > 18) continue
      const idx = Math.max(0, Math.min(24, timeToSlotIndex(h, m)))
      const existing = map.get(idx) || []
      map.set(idx, [...existing, event])
    }
    return map
  }, [sortedEvents])

  return (
    <div className="daily-plan-section hour-by-hour-panel">
      <div className="daily-plan-section-header hour-header">
        <span className="daily-plan-section-title">Hour by Hour — Hard Landscape</span>
      </div>
      {loading && <div className="loading-state">Loading schedule...</div>}
      {!loading && (
        <div className="hour-grid">
          {slots.map((slot, idx) => {
            const slotEvts = slotEvents.get(idx) || []
            return (
              <div key={idx} className="hour-slot">
                <span className="hour-slot-label">{slot.label}</span>
                <div className="hour-slot-line">
                  {slotEvts.map(event => {
                    const themeColor = getThemeBorderColor(event.colorIndex)
                    const isCurrent = currentBlock?.id === event.id
                    const evtStart = typeof event.start === 'string' ? parseISO(event.start) : event.start
                    const evtEnd = typeof event.end === 'string' ? parseISO(event.end) : event.end
                    const durationMinutes = Math.max(30, (evtEnd.getTime() - evtStart.getTime()) / 60000)
                    const spanSlots = Math.ceil(durationMinutes / 30)
                    const eventMinHeight = spanSlots * 28 - 6
                    return (
                      <div
                        key={event.id}
                        className={`hour-event ${isCurrent ? 'current' : ''}`}
                        style={{ borderLeftColor: themeColor, minHeight: eventMinHeight }}
                        title={event.title}
                      >
                        <span className="hour-event-title">{event.title}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
