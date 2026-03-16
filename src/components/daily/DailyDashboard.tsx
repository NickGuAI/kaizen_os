// Daily Dashboard (Execution Mode) - Default view for day-to-day task management
// Layout: Two-column (left: Top3 + Snack + ParkingLot + Season Vetoes + TomorrowTop3, right: HourByHour)
import { useMemo, useCallback, useEffect, useState } from 'react'
import { format, parseISO, isWithinInterval, addDays } from 'date-fns'
import { closestCenter, DndContext, PointerSensor, type DragEndEvent, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../../lib/apiFetch'
import { PARKING_DROP_ZONE_ID, ParkingLotPanel } from './ParkingLotPanel'
import { SNACK_DROP_ZONE_ID, SnackSizePanel } from './SnackSizePanel'
import { VetoCarousel } from './VetoCarousel'
import { TomorrowTop3Panel } from './TomorrowTop3Panel'
import { HourByHourPanel } from './HourByHourPanel'
import type { CardWithActionCount } from '../../lib/api'
import type { WorkItem } from '../../services/workitems/WorkItemTypes'
import type { CalendarEvent } from '../landing/CalendarPanel'
import { buildThemeColorMap } from '../../utils/themeColors'
import {
  useCompleteWorkItem,
  useSetDailyFocus,
  useCreateWorkItem,
  useParkingLot,
  useCreateParkingItem,
  usePullToDate,
  useParkWorkItem,
  useCompleteParkingItem,
} from '../../hooks/useWorkItems'
import { useActiveSeasonVetoes } from '../../hooks/useSeasons'
import './DailyDashboard.css'

export interface WorkItemWithOverlays extends WorkItem {
  linkedCardId?: string
  linkedCardTitle?: string
  focusRank?: number
  playlistRank?: number
  isSnack?: boolean
}

export interface DailyDashboardProps {
  date: string // YYYY-MM-DD
  themes: CardWithActionCount[]
}

function buildEventKey(event: CalendarEvent): string | undefined {
  if (!event.accountId || !event.calendarId) return undefined
  return `gcal:${event.accountId}:${event.calendarId}:${event.id}`
}

// Stable empty arrays to prevent infinite re-render loops.
// useQuery's `= []` default creates a new reference every render
// while loading, which triggers useEffect → setState → re-render → loop.
const EMPTY_WORK_ITEMS: WorkItemWithOverlays[] = []
const EMPTY_EVENTS: CalendarEvent[] = []
const EMPTY_TOMORROW: WorkItemWithOverlays[] = []

export function DailyDashboard({ date, themes }: DailyDashboardProps) {
  const completeMutation = useCompleteWorkItem(date)
  const focusMutation = useSetDailyFocus(date)
  const createMutation = useCreateWorkItem(date)

  const { data: parkingItems = [], isLoading: loadingParking } = useParkingLot()
  const createParkingMutation = useCreateParkingItem()
  const pullToDateMutation = usePullToDate(date)
  const parkToParkingMutation = useParkWorkItem(date)
  const completeParkingMutation = useCompleteParkingItem()
  const { data: seasonVetoes = [], isLoading: loadingSeasonVetoes } = useActiveSeasonVetoes()

  const { data: workItems = EMPTY_WORK_ITEMS, isLoading: loadingWorkItems } = useQuery<WorkItemWithOverlays[]>({
    queryKey: ['workitems', 'day', date],
    queryFn: async () => {
      const res = await apiFetch(`/api/workitems/day?date=${date}`, {})
      if (!res.ok) throw new Error('Failed to fetch workitems')
      return res.json()
    },
  })

  const { data: events = EMPTY_EVENTS, isLoading: loadingEvents } = useQuery<CalendarEvent[]>({
    queryKey: ['calendar', 'events', 'day', date],
    queryFn: async () => {
      const res = await apiFetch(`/api/calendar/events/day?date=${date}`, {})
      if (!res.ok) throw new Error('Failed to fetch calendar events')
      return res.json()
    },
  })

  const themeColorMap = useMemo(() => buildThemeColorMap(themes), [themes])

  const themedEvents = useMemo(() => {
    return events.map((event) => {
      const themeKey = event.themeId != null ? String(event.themeId) : null
      const mappedIndex =
        themeKey && themeColorMap[themeKey] !== undefined ? themeColorMap[themeKey] : undefined
      return { ...event, colorIndex: mappedIndex ?? event.colorIndex }
    })
  }, [events, themeColorMap])

  const { data: dailyFocus } = useQuery<{ date: string; topKeys: string[] }>({
    queryKey: ['workitems', 'focus', date],
    queryFn: async () => {
      const res = await apiFetch(`/api/workitems/focus?date=${date}`, {})
      if (!res.ok) throw new Error('Failed to fetch daily focus')
      return res.json()
    },
  })

  const tomorrowDate = useMemo(() => format(addDays(parseISO(date), 1), 'yyyy-MM-dd'), [date])

  const { data: tomorrowFocus } = useQuery<{ date: string; topKeys: string[] }>({
    queryKey: ['workitems', 'focus', tomorrowDate],
    queryFn: async () => {
      const res = await apiFetch(`/api/workitems/focus?date=${tomorrowDate}`, {})
      if (!res.ok) throw new Error('Failed to fetch tomorrow focus')
      return res.json()
    },
  })

  const { data: tomorrowWorkItems = EMPTY_TOMORROW } = useQuery<WorkItemWithOverlays[]>({
    queryKey: ['workitems', 'day', tomorrowDate],
    queryFn: async () => {
      const res = await apiFetch(`/api/workitems/day?date=${tomorrowDate}`, {})
      if (!res.ok) throw new Error('Failed to fetch tomorrow workitems')
      return res.json()
    },
  })

  const top3Keys = useMemo(() => dailyFocus?.topKeys || [], [dailyFocus])
  const playlist = workItems
  const [orderedSnackKeys, setOrderedSnackKeys] = useState<string[]>([])

  // Active top3 keys: exclude done items so completed tasks don't block the 3 slots
  const activeTop3Keys = useMemo(
    () => top3Keys.filter(k => {
      const item = workItems.find(i => i.key === k)
      return item && item.status !== 'done'
    }),
    [top3Keys, workItems],
  )

  const tomorrowTop3Items = useMemo(() => {
    const tKeys = tomorrowFocus?.topKeys || []
    return tKeys
      .map((key: string) => tomorrowWorkItems.find((item) => item.key === key))
      .filter((item): item is WorkItemWithOverlays => !!item)
  }, [tomorrowFocus, tomorrowWorkItems])

  // No block-selection in the new daily plan layout; use full playlist
  const filteredPlaylist = playlist
  const orderedPlaylist = useMemo(() => {
    if (orderedSnackKeys.length === 0) return filteredPlaylist

    const byKey = new Map(filteredPlaylist.map((item) => [item.key, item]))
    return orderedSnackKeys
      .map((key) => byKey.get(key))
      .filter((item): item is WorkItemWithOverlays => Boolean(item))
  }, [filteredPlaylist, orderedSnackKeys])

  useEffect(() => {
    setOrderedSnackKeys((prev) => {
      const nextKeys = filteredPlaylist.map((item) => item.key)
      if (nextKeys.length === 0) return prev.length === 0 ? prev : []

      const kept = prev.filter((key) => nextKeys.includes(key))
      const missing = nextKeys.filter((key) => !kept.includes(key))
      if (missing.length === 0 && kept.length === prev.length) return prev
      return [...kept, ...missing]
    })
  }, [filteredPlaylist])

  const priorityCardIds = useMemo(() => {
    const ids = new Set<string>()
    for (const key of activeTop3Keys) {
      const item = workItems.find((workItem) => workItem.key === key)
      if (item?.linkedCardId) ids.add(item.linkedCardId)
    }
    return Array.from(ids)
  }, [activeTop3Keys, workItems])

  const currentBlock = useMemo(() => {
    const now = new Date()
    const today = format(now, 'yyyy-MM-dd')
    if (today !== date) return null

    return themedEvents.find((event) => {
      try {
        const start = typeof event.start === 'string' ? parseISO(event.start) : event.start
        const end = typeof event.end === 'string' ? parseISO(event.end) : event.end
        if (!start || isNaN(start.getTime()) || !end || isNaN(end.getTime())) {
          console.warn('Invalid date in event:', event)
          return false
        }
        return isWithinInterval(now, { start, end })
      } catch (error) {
        console.error('Error parsing event dates:', event, error)
        return false
      }
    })
  }, [themedEvents, date])

  const handleCompleteWorkItem = useCallback(
    (workItemKey: string) => {
      const completedInEventKey = currentBlock ? buildEventKey(currentBlock) : undefined
      completeMutation.mutate({ workItemKey, completedInEventKey })
    },
    [completeMutation, currentBlock],
  )

  const handleSetFocus = useCallback(
    (topKeys: string[]) => {
      focusMutation.mutate({ topKeys })
    },
    [focusMutation],
  )

  const handlePromoteToFocus = useCallback(
    (workItemKey: string) => {
      if (activeTop3Keys.includes(workItemKey)) return
      const newKeys = [...activeTop3Keys, workItemKey].slice(0, 3)
      handleSetFocus(newKeys)
    },
    [activeTop3Keys, handleSetFocus],
  )

  const handleRemoveFromFocus = useCallback(
    (workItemKey: string) => {
      const currentKeys = dailyFocus?.topKeys || []
      const newKeys = currentKeys.filter((k) => k !== workItemKey)
      handleSetFocus(newKeys)
    },
    [dailyFocus?.topKeys, handleSetFocus],
  )

  const handleCreateTask = useCallback(
    async (title: string, _dueAt?: string): Promise<void> => {
      const dueAtForDay = `${date}T00:00:00.000Z`
      const capturedInEventKey = undefined
      const cardId = undefined
      await createMutation.mutateAsync({ title, dueAt: dueAtForDay, capturedInEventKey, cardId })
    },
    [date, createMutation],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over) return

      const activeId = String(active.id)
      const overId = String(over.id)
      const activeSource = active.data.current?.source as string | undefined
      const activeKey = String(active.data.current?.workItemKey ?? activeId)
      const overKey = String(over.data.current?.workItemKey ?? overId)
      const overType = over.data.current?.type as string | undefined

      if (
        activeSource === 'parking' &&
        (overId === SNACK_DROP_ZONE_ID || overType === 'snack-item' || overType === 'snack-zone')
      ) {
        pullToDateMutation.mutate({ workItemKey: activeKey })
        return
      }

      if (
        activeSource === 'snack' &&
        (overId === PARKING_DROP_ZONE_ID || overType === 'parking-item' || overType === 'parking-zone')
      ) {
        parkToParkingMutation.mutate({ workItemKey: activeKey })
        return
      }

      if (activeSource === 'snack' && overType === 'snack-item' && activeKey !== overKey) {
        setOrderedSnackKeys((prev) => {
          const oldIndex = prev.indexOf(activeKey)
          const newIndex = prev.indexOf(overKey)
          if (oldIndex < 0 || newIndex < 0) return prev
          return arrayMove(prev, oldIndex, newIndex)
        })
      }
    },
    [parkToParkingMutation, pullToDateMutation],
  )

  return (
    <div className="daily-dashboard">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="daily-plan-layout">
          {/* Left Column (desktop): Parking Lot */}
          <div className="daily-parking-col">
            <ParkingLotPanel
              items={parkingItems}
              currentDate={date}
              onComplete={(key) => completeParkingMutation.mutate({ workItemKey: key })}
              onPullToDate={(key) => pullToDateMutation.mutate({ workItemKey: key })}
              onCreateItem={async (title) => {
                await createParkingMutation.mutateAsync({ title })
              }}
              loading={loadingParking}
            />
          </div>

          {/* Middle Column: Vetoes + Snack + TomorrowTop3 */}
          <div className="daily-left-col">
            <VetoCarousel vetoes={seasonVetoes} loading={loadingSeasonVetoes} />
            <SnackSizePanel
              items={orderedPlaylist}
              onComplete={handleCompleteWorkItem}
              onCreateTask={handleCreateTask}
              onPromoteToFocus={handlePromoteToFocus}
              onRemoveFromFocus={handleRemoveFromFocus}
              top3Keys={activeTop3Keys}
              loading={loadingWorkItems}
              date={date}
            />
            <TomorrowTop3Panel items={tomorrowTop3Items} loading={false} />
          </div>

          {/* Right Column: Hour-by-Hour */}
          <div className="daily-right-col">
            <HourByHourPanel
              events={themedEvents}
              currentBlock={currentBlock ?? null}
              loading={loadingEvents}
              date={date}
              top3Keys={activeTop3Keys}
              top3CardIds={priorityCardIds}
            />
          </div>
        </div>
      </DndContext>
    </div>
  )
}
