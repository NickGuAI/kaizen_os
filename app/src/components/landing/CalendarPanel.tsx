import { useState, useMemo, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar, dateFnsLocalizer, Views, SlotInfo, EventProps } from 'react-big-calendar'
import withDragAndDrop, { EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop'
import { format, parse, startOfWeek, getDay, startOfDay, isBefore, isToday } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { CardWithActionCount } from '../../lib/api'
import { apiFetch } from '../../lib/apiFetch'
import type { GcalAssignment } from '../planning'
export type { GcalAssignment }
import { EventPopover } from './EventPopover'
import { getTagColor } from '../../utils/tagConfig'
import { parseLocalDate } from '../../utils/dateUtils'
import { THEME_COLORS, buildThemeColorMap } from '../../utils/themeColors'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import './CalendarPlanMode.css'

const DnDCalendar = withDragAndDrop<CalendarEvent>(Calendar)

const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales,
})

// Plan mode event colors
const PLAN_MODE_COLORS = {
  gcal: { bg: 'rgba(200, 200, 200, 0.3)', border: '#999', text: '#666' },
  current: { bg: 'rgba(139, 148, 103, 0.4)', border: '#8B9467', text: '#5a6343' },
  planned: { bg: 'rgba(52, 152, 219, 0.3)', border: '#3498DB', text: '#2471a3' },
  auto: { bg: 'rgba(155, 89, 182, 0.25)', border: '#9B59B6', text: '#7b4293' }, // Auto-assigned from rules
}

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  themeId?: string
  colorIndex: number
  source?: 'gcal' | 'planned' | 'current'
  cardId?: string // Can reference ACTION
  cardTitle?: string // Title of the linked card
  actionId?: string // Backward compatibility
  // GCal metadata for editing
  accountId?: string
  calendarId?: string
  description?: string
  location?: string
  attendees?: Array<{ email: string; responseStatus?: string }>
}

// Task drop data from TaskSection drag
export interface TaskDropData {
  type: 'ACTION'
  taskId: string
  cardId: string
  title: string
}

interface CalendarPanelProps {
  themes: CardWithActionCount[]
  // Plan mode props
  planMode?: boolean
  planModeEvents?: CalendarEvent[]
  currentActionId?: string | null
  currentActionTitle?: string
  gcalAssignments?: Map<string, GcalAssignment>
  onSelectSlot?: (slotInfo: SlotInfo) => void
  onEventClick?: (event: CalendarEvent) => void
  onEventDrop?: (args: { event: CalendarEvent; start: Date; end: Date }) => void
  onEventResize?: (args: { event: CalendarEvent; start: Date; end: Date }) => void
  onEventDoubleClick?: (event: CalendarEvent) => void
  onAssignEvent?: (event: CalendarEvent) => void
  onDeassignEvent?: (event: CalendarEvent) => void
  onEditEvent?: (event: CalendarEvent) => void
  onDeleteEvent?: (event: CalendarEvent) => void
  weekStart?: string
  onWeekChange?: (weekStart: string) => void
  // Task drop handler for drag from TaskSection
  onTaskDrop?: (taskData: TaskDropData, start: Date, end: Date) => void
  // Tag mode props
  tagMode?: boolean
  selectedTagValue?: string | null
  eventTags?: Map<string, Record<string, string>> // eventId -> { tagType: tagValue }
  onTagEvent?: (event: CalendarEvent) => void
  onUntagEvent?: (event: CalendarEvent) => void
  // Theme filtering (v4 layout - theme selection moved to MainHeader)
  activeThemeId?: string | null
  // Plan mode legend visibility
  showPlanModeLegend?: boolean
}

// Custom event component for plan mode
interface PlanModeEventProps extends EventProps<CalendarEvent> {
  gcalAssignments: Map<string, GcalAssignment>
  currentActionId: string | null
}

function PlanModeEventComponent({
  event,
  title,
  gcalAssignments,
  currentActionId,
}: PlanModeEventProps) {
  const assignment = gcalAssignments.get(event.id)
  const isGcalEvent = event.source === 'gcal'
  const isAssignedToCurrent = assignment?.actionId === currentActionId
  const isAssignedToOther = assignment && assignment.actionId !== currentActionId

  return (
    <div className={`plan-event-wrapper ${isGcalEvent ? 'gcal-event' : ''} ${isAssignedToCurrent ? 'assigned-current' : ''} ${isAssignedToOther ? 'assigned-other' : ''}`}>
      <span className="event-title">{title}</span>
      {isGcalEvent && !assignment && (
        <span className="assignment-hint" title="Click to assign to current action">+</span>
      )}
      {isAssignedToCurrent && (
        <span className="assignment-badge current" title="Assigned to current action">✓</span>
      )}
      {isAssignedToOther && (
        <span className="assignment-badge other" title={`Assigned to: ${assignment.actionTitle}`}>
          →
        </span>
      )}
    </div>
  )
}

// Fetch function for calendar events
async function fetchCalendarEvents(weekStart: string): Promise<CalendarEvent[]> {
  const res = await apiFetch(`/api/calendar/events/week?weekStart=${weekStart}`, {
    
  })
  if (!res.ok) return []
  
  const data = await res.json()
  const seenIds = new Set<string>()
  const calEvents: CalendarEvent[] = []

  for (const e of data) {
    const eventId = e.id || `${e.summary}-${e.start?.dateTime || e.start}`
    if (!seenIds.has(eventId)) {
      seenIds.add(eventId)
      calEvents.push({
        id: eventId,
        title: e.summary || e.title,
        start: new Date(e.start?.dateTime || e.start?.date || e.start),
        end: new Date(e.end?.dateTime || e.end?.date || e.end),
        themeId: e.assignedThemeId || undefined,
        cardId: e.assignedCardId || undefined,
        cardTitle: e.assignedCardTitle || undefined,
        colorIndex: 0,
        source: 'gcal',
        accountId: e.accountId,
        calendarId: e.calendarId,
        description: e.description,
        location: e.location,
        attendees: e.attendees,
      })
    }
  }
  return calEvents
}

export function CalendarPanel({
  themes,
  planMode = false,
  planModeEvents = [],
  currentActionId = null,
  currentActionTitle = '',
  gcalAssignments = new Map(),
  onSelectSlot,
  onEventClick,
  onEventDrop,
  onEventResize,
  onEventDoubleClick,
  onAssignEvent,
  onDeassignEvent,
  onEditEvent,
  onDeleteEvent,
  weekStart: controlledWeekStart,
  onWeekChange,
  onTaskDrop,
  // Tag mode props
  tagMode = false,
  selectedTagValue = null,
  eventTags = new Map(),
  onTagEvent,
  onUntagEvent,
  // Theme filtering (v4 layout)
  activeThemeId: selectedThemeId = null,
  showPlanModeLegend = true,
}: CalendarPanelProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [popoverEvent, setPopoverEvent] = useState<CalendarEvent | null>(null)
  const calendarContainerRef = useRef<HTMLDivElement>(null)

  // Sync internal currentDate with controlled weekStart from parent
  useEffect(() => {
    if (controlledWeekStart) {
      setCurrentDate(prev => {
        const currentWeekStart = format(startOfWeek(prev, { weekStartsOn: 1 }), 'yyyy-MM-dd')
        if (currentWeekStart !== controlledWeekStart) {
          // Use parseLocalDate for timezone-safe conversion (avoids UTC midnight offset)
          return parseLocalDate(controlledWeekStart)
        }
        return prev
      })
    }
  }, [controlledWeekStart])

  useLayoutEffect(() => {
    const container = calendarContainerRef.current
    if (!container) return

    let rafId: number | null = null

    const updateScrollbarWidth = () => {
      const scroller = container.querySelector('.rbc-time-content') as HTMLElement | null
      if (!scroller) return
      const scrollbarWidth = Math.max(0, scroller.offsetWidth - scroller.clientWidth)
      container.style.setProperty('--calendar-scrollbar-width', `${scrollbarWidth}px`)
    }

    const scheduleUpdate = () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(updateScrollbarWidth)
    }

    scheduleUpdate()

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleUpdate)
      const scroller = container.querySelector('.rbc-time-content')
      if (scroller instanceof HTMLElement) {
        resizeObserver.observe(scroller)
      } else {
        resizeObserver.observe(container)
      }
    } else {
      window.addEventListener('resize', scheduleUpdate)
    }

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      if (resizeObserver) {
        resizeObserver.disconnect()
      } else {
        window.removeEventListener('resize', scheduleUpdate)
      }
    }
  }, [planMode])
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 })
  const [isDragOver, setIsDragOver] = useState(false)

  // Create theme ID to color index map
  const themeColorMap = useMemo(() => buildThemeColorMap(themes), [themes])

  // Get week start for current date
  const weekStart = useMemo(() => {
    if (controlledWeekStart) return controlledWeekStart
    const start = startOfWeek(currentDate, { weekStartsOn: 1 })
    return format(start, 'yyyy-MM-dd')
  }, [currentDate, controlledWeekStart])

  // Fetch calendar events with caching
  const { data: fetchedEvents = [] } = useQuery({
    queryKey: ['calendarEvents', weekStart],
    queryFn: () => fetchCalendarEvents(weekStart),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  // Combine fetched events with plan mode events
  const events = useMemo(() => {
    if (planMode) {
      // In plan mode, merge gcal events with planned events
      // Apply any modified times from gcalAssignments
      const gcalEvents = fetchedEvents.map(e => {
        const assignment = gcalAssignments.get(e.id)
        if (assignment?.modifiedStart && assignment?.modifiedEnd) {
          return {
            ...e,
            source: 'gcal' as const,
            start: assignment.modifiedStart,
            end: assignment.modifiedEnd,
          }
        }
        return { ...e, source: 'gcal' as const }
      })
      return [...gcalEvents, ...planModeEvents]
    }
    return fetchedEvents
  }, [planMode, fetchedEvents, planModeEvents, gcalAssignments])

  const handleNavigate = useCallback((newDate: Date) => {
    setCurrentDate(newDate)
    if (onWeekChange) {
      const start = startOfWeek(newDate, { weekStartsOn: 1 })
      onWeekChange(format(start, 'yyyy-MM-dd'))
    }
  }, [onWeekChange])

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    if (planMode && onSelectSlot) {
      onSelectSlot(slotInfo)
    }
  }, [planMode, onSelectSlot])

  const handleSelectEvent = useCallback((event: CalendarEvent, e: React.SyntheticEvent) => {
    if (tagMode && event.source === 'gcal') {
      // In tag mode, clicking tags/untags the event
      if (selectedTagValue && onTagEvent) {
        onTagEvent(event)
      }
      return
    }
    if (planMode && event.source === 'gcal') {
      // Show popover for gcal events in plan mode
      const mouseEvent = e.nativeEvent as MouseEvent
      setPopoverEvent(event)
      setPopoverPosition({ x: mouseEvent.clientX + 10, y: mouseEvent.clientY + 10 })
    } else if (planMode && onEventClick) {
      // For planned tasks, use the original click handler
      onEventClick(event)
    }
  }, [planMode, tagMode, selectedTagValue, onEventClick, onTagEvent])

  const handlePopoverClose = useCallback(() => {
    setPopoverEvent(null)
  }, [])

  const handlePopoverAssign = useCallback(() => {
    if (popoverEvent && onAssignEvent) {
      onAssignEvent(popoverEvent)
    }
    setPopoverEvent(null)
  }, [popoverEvent, onAssignEvent])

  const handlePopoverDeassign = useCallback(() => {
    if (popoverEvent && onDeassignEvent) {
      onDeassignEvent(popoverEvent)
    }
    setPopoverEvent(null)
  }, [popoverEvent, onDeassignEvent])

  const handlePopoverEdit = useCallback(() => {
    if (popoverEvent && onEditEvent) {
      onEditEvent(popoverEvent)
    }
    setPopoverEvent(null)
  }, [popoverEvent, onEditEvent])

  const handlePopoverDelete = useCallback(() => {
    if (popoverEvent && onDeleteEvent) {
      onDeleteEvent(popoverEvent)
    }
    setPopoverEvent(null)
  }, [popoverEvent, onDeleteEvent])

  const handleDoubleClickEvent = useCallback((event: CalendarEvent) => {
    if (tagMode && event.source === 'gcal' && onUntagEvent) {
      // In tag mode, double-click removes the tag
      onUntagEvent(event)
      return
    }
    if (planMode && onEventDoubleClick) {
      onEventDoubleClick(event)
    }
  }, [planMode, tagMode, onEventDoubleClick, onUntagEvent])

  const handleEventDrop = useCallback((args: EventInteractionArgs<CalendarEvent>) => {
    if (planMode && onEventDrop && args.start && args.end) {
      onEventDrop({ event: args.event, start: args.start as Date, end: args.end as Date })
    }
  }, [planMode, onEventDrop])

  const handleEventResize = useCallback((args: EventInteractionArgs<CalendarEvent>) => {
    if (planMode && onEventResize && args.start && args.end) {
      onEventResize({ event: args.event, start: args.start as Date, end: args.end as Date })
    }
  }, [planMode, onEventResize])

  // Handle external task drops from TaskSection
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!planMode) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }, [planMode])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only set drag over to false if we're leaving the container entirely
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false)
    }
  }, [])

  const handleExternalDrop = useCallback((e: React.DragEvent) => {
    if (!planMode || !onTaskDrop) return
    e.preventDefault()
    setIsDragOver(false)

    try {
      const data = e.dataTransfer.getData('application/json')
      if (!data) return

      const taskData = JSON.parse(data) as TaskDropData
      if (taskData.type !== 'ACTION') return

      // Calculate drop time based on mouse position
      // Get the calendar container and calculate relative position
      const calendarEl = e.currentTarget.querySelector('.rbc-time-content')
      if (!calendarEl) return

      const rect = calendarEl.getBoundingClientRect()
      const relativeY = e.clientY - rect.top
      const relativeX = e.clientX - rect.left

      // Calculate which day column was dropped on (7 days, Mon-Sun)
      const dayWidth = rect.width / 7
      const dayIndex = Math.floor(relativeX / dayWidth)

      // Calculate time based on Y position
      // Calendar shows 5am-10pm (17 hours), with 30min slots
      const totalMinutes = 17 * 60 // 5am to 10pm
      const minuteOffset = (relativeY / rect.height) * totalMinutes
      const startHour = 5 + Math.floor(minuteOffset / 60)
      const startMinute = Math.floor(minuteOffset % 60 / 30) * 30 // Round to 30min

      // Get the week start date and calculate the drop date
      const weekStartDate = startOfWeek(currentDate, { weekStartsOn: 1 })
      const dropDate = new Date(weekStartDate)
      dropDate.setDate(dropDate.getDate() + dayIndex)
      dropDate.setHours(startHour, startMinute, 0, 0)

      // Default duration: 1 hour
      const endDate = new Date(dropDate)
      endDate.setHours(endDate.getHours() + 1)

      onTaskDrop(taskData, dropDate, endDate)
    } catch (error) {
      console.error('Failed to handle task drop:', error)
    }
  }, [planMode, onTaskDrop, currentDate])

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    if (tagMode) {
      // Tag mode styling - show tag colors on events
      const eventTagsMap = eventTags.get(event.id)
      const intentionTag = eventTagsMap?.intention
      
      if (intentionTag) {
        const tagColor = getTagColor('intention', intentionTag)
        return {
          style: {
            backgroundColor: `${tagColor}25`,
            borderLeft: `3px solid ${tagColor}`,
            color: '#333',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '11px',
            fontWeight: 500,
          }
        }
      }

      // Untagged events in tag mode
      return {
        style: {
          backgroundColor: 'rgba(200, 200, 200, 0.2)',
          borderLeft: '3px solid #ccc',
          color: '#666',
          borderRadius: '4px',
          padding: '2px 6px',
          fontSize: '10px',
          fontWeight: 400,
        }
      }
    }

    if (planMode) {
      // Plan mode styling
      let colors = PLAN_MODE_COLORS.gcal
      let isHighlighted = false

      // Check if this GCal event is assigned to the current action
      if (event.source === 'gcal') {
        const assignment = gcalAssignments.get(event.id) as { actionId?: string; source?: 'auto' | 'manual' } | undefined
        if (assignment?.actionId === currentActionId) {
          colors = PLAN_MODE_COLORS.current
          isHighlighted = true
        } else if (assignment) {
          // Distinguish auto-assigned (from rules) vs manually assigned
          colors = assignment.source === 'auto' ? PLAN_MODE_COLORS.auto : PLAN_MODE_COLORS.planned
        }
      } else if (event.source === 'current' || event.actionId === currentActionId) {
        colors = PLAN_MODE_COLORS.current
        isHighlighted = true
      } else if (event.source === 'planned') {
        colors = PLAN_MODE_COLORS.planned
      }
      
      return {
        style: {
          backgroundColor: colors.bg,
          borderLeft: `3px solid ${colors.border}`,
          color: colors.text,
          borderRadius: '4px',
          padding: '2px 6px',
          fontSize: '10px',
          fontWeight: isHighlighted ? 600 : 500,
          boxShadow: isHighlighted ? '0 2px 8px rgba(139, 148, 103, 0.4)' : 'none',
          transform: isHighlighted ? 'scale(1.02)' : 'none',
          zIndex: isHighlighted ? 10 : 1,
        }
      }
    }

    // Normal mode styling
    const themeKey = event.themeId != null ? String(event.themeId) : null
    const colorIndex = themeKey && themeColorMap[themeKey] !== undefined
      ? themeColorMap[themeKey] % THEME_COLORS.length
      : 0
    const colors = THEME_COLORS[colorIndex]
    const isHighlighted = selectedThemeId === null || event.themeId === selectedThemeId

    // Check if event is in the past
    const today = startOfDay(new Date())
    const eventDay = startOfDay(event.start)
    const isPastEvent = isBefore(eventDay, today)

    return {
      style: {
        backgroundColor: isHighlighted ? colors.bg : 'rgba(200, 200, 200, 0.15)',
        borderLeft: `3px solid ${isHighlighted ? colors.border : '#ccc'}`,
        color: isHighlighted ? colors.text : '#999',
        opacity: isPastEvent ? 0.4 : 1,
        filter: isPastEvent ? 'grayscale(40%)' : 'none',
        borderRadius: '4px',
        padding: '2px 6px',
        fontSize: '10px',
        fontWeight: isHighlighted ? 500 : 400,
        transform: isHighlighted && selectedThemeId !== null && !isPastEvent ? 'scale(1.02)' : 'none',
        boxShadow: isHighlighted && selectedThemeId !== null && !isPastEvent ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
      }
    }
  }, [planMode, tagMode, currentActionId, gcalAssignments, eventTags, themeColorMap, selectedThemeId])

  // Day prop getter - gray out past dates
  const dayPropGetter = useCallback((date: Date) => {
    const today = startOfDay(new Date())
    const dateDay = startOfDay(date)
    const isPast = isBefore(dateDay, today)
    const isTodayDate = isToday(date)

    if (isTodayDate) {
      return {
        className: 'today-col',
        style: {
          backgroundColor: 'rgba(139, 148, 103, 0.03)',
        }
      }
    }

    if (isPast) {
      return {
        className: 'past-col',
        style: {
          backgroundColor: '#f8f8f8',
          opacity: 0.6,
        }
      }
    }

    return {}
  }, [])

  // Calendar component to use
  const CalendarComponent = planMode ? DnDCalendar : Calendar

  return (
    <div className="right-panel">
      <div className="calendar-card">
        <div className="week-gcal-bar">
          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="gcal-goto-btn"
          >
            Go To Calendar
          </a>
        </div>
        {/* Plan Mode Legend - Show even when themes bar is hidden */}
        {showPlanModeLegend && planMode && (
          <div className="plan-mode-legend-bar">
            <div className="plan-mode-legend">
              <div className="legend-item">
                <div className="legend-dot" style={{ background: PLAN_MODE_COLORS.gcal.border }} />
                <span>Unassigned</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: PLAN_MODE_COLORS.auto.border }} />
                <span>Auto</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: PLAN_MODE_COLORS.planned.border }} />
                <span>Planned</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: PLAN_MODE_COLORS.current.border }} />
                <span>Current</span>
              </div>
            </div>
          </div>
        )}


        {/* Calendar */}
        <div 
          className={`calendar-container ${planMode ? 'plan-mode-calendar' : ''} ${isDragOver ? 'drag-over' : ''}`} 
          ref={calendarContainerRef}
          style={{ 
            height: planMode ? 500 : 300,
            overflow: 'auto',
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleExternalDrop}
        >
          <CalendarComponent
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            defaultView={Views.WEEK}
            date={currentDate}
            onNavigate={handleNavigate}
            toolbar={false}
            eventPropGetter={eventStyleGetter}
            dayPropGetter={dayPropGetter}
            min={new Date(0, 0, 0, 5, 0, 0)}
            max={new Date(0, 0, 0, 22, 0, 0)}
            step={30}
            timeslots={2}
            scrollToTime={new Date(0, 0, 0, 9, 0, 0)}
            selectable={planMode}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            onDoubleClickEvent={planMode ? handleDoubleClickEvent : undefined}
            onEventDrop={planMode ? handleEventDrop : undefined}
            onEventResize={planMode ? handleEventResize : undefined}
            resizable={planMode}
            draggableAccessor={() => planMode}
            components={planMode ? {
              event: (props: EventProps<CalendarEvent>) => (
                <PlanModeEventComponent
                  {...props}
                  gcalAssignments={gcalAssignments}
                  currentActionId={currentActionId}
                />
              ),
            } : undefined}
          />
        </div>
      </div>

      {/* Event Popover */}
      {planMode && popoverEvent && (
        <EventPopover
          event={popoverEvent}
          assignment={gcalAssignments.get(popoverEvent.id)}
          currentActionId={currentActionId}
          currentActionTitle={currentActionTitle}
          position={popoverPosition}
          onClose={handlePopoverClose}
          onAssign={handlePopoverAssign}
          onDeassign={handlePopoverDeassign}
          onEdit={handlePopoverEdit}
          onDelete={handlePopoverDelete}
        />
      )}
    </div>
  )
}
