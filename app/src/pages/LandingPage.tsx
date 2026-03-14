// Landing Page - v4 redesign matching kaizen-v2 mock with sidebar layout
import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useThemes, useActiveActions } from '../hooks/useCards'
import { useUserSettings } from '../hooks/useUserSettings'
import type { Card } from '../lib/api'
import { CalendarPanel } from '../components/landing'
import type { CalendarEvent, TaskDropData } from '../components/landing/CalendarPanel'
import { ActionPlanPanel, EventEditModal, FinalizeModal, PlanModeRestrictionPopup, TaskDetailModal, RoutineSetupModal } from '../components/planning'
import type { RoutineLinkResult } from '../components/planning'
import type { ActionPlanState, PlannedTask, GcalAssignment } from '../components/planning'
import { TagPanel } from '../components/tagging'
import { DailyDashboard } from '../components/daily'
import { AppLayout, DateNavHeader } from '../components/layout'
import { apiFetch } from '../lib/apiFetch'
import { useAuth } from '../lib/authContext'
import { format, startOfWeek } from 'date-fns'
import type { SlotInfo } from 'react-big-calendar'
import { ACTION_TYPES, type ActionType } from '../utils/guidedPlanningUtils'
import { DEFAULT_TAGS } from '../utils/tagConfig'
import { getWeekdayInTimeZone } from '../utils/dateUtils'

interface CalendarSyncStatus {
  mode: 'webhook_primary' | 'polling_only'
  totalSubscriptions: number
  healthySubscriptions: number
  staleSubscriptions: number
  fallbackPollingEnabled: boolean
  lastUpdatedAt: string | null
  lastErrors?: string[]
}

export default function LandingPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const activeThemeId: string | null = null
  const { data: themes } = useThemes()
  const { data: actions = [] } = useActiveActions()
  const { data: userSettings } = useUserSettings()
  const timeZone = useMemo(() => {
    return user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  }, [user?.timezone])
  const debugMode = userSettings?.debugMode || false

  // Planning mode state
  const [planningMode, setPlanningMode] = useState(false)
  const [showPlanRestrictionPopup, setShowPlanRestrictionPopup] = useState(false)
  const weekStart = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 })
    return format(start, 'yyyy-MM-dd')
  }, [currentDate])
  const [actionStates, setActionStates] = useState<Map<string, ActionPlanState>>(new Map<string, ActionPlanState>())
  const [gcalAssignments, setGcalAssignments] = useState<Map<string, GcalAssignment>>(new Map<string, GcalAssignment>())
  const actionStatesRef = useRef(actionStates)
  const [currentAction, setCurrentAction] = useState<typeof actions[0] | null>(null)
  const [routineLinks, setRoutineLinks] = useState<Map<string, {
    eventSummary: string | null;
    calendarName: string | null;
    eventRecurrence: string | null;
    htmlLink: string | null;
  }>>(new Map<string, { eventSummary: string | null; calendarName: string | null; eventRecurrence: string | null; htmlLink: string | null }>())
  const [loading, setLoading] = useState(false)
  const [plannedHoursData, setPlannedHoursData] = useState<{
    plannedHours: number;
    utilityRate: number;
    percentUtilized: number;
    status: 'under' | 'at' | 'over';
  } | null>(null)
  
  // Event edit modal state
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)

  // Task management state
  const [actionTasks, setActionTasks] = useState<Map<string, Card[]>>(new Map<string, Card[]>())
  const [editingTask, setEditingTask] = useState<Card | null>(null)


  // Finalize modal state
  const [showFinalizeModal, setShowFinalizeModal] = useState(false)
  const [existingRuleEventTitles, setExistingRuleEventTitles] = useState<Set<string>>(new Set())

  // Routine setup modal state
  const [routineSetupAction, setRoutineSetupAction] = useState<Card | null>(null)
  
  // Session status state (prevents re-committing, also used to grey Plan button)
  const [sessionStatus, setSessionStatus] = useState<'in_progress' | 'committed'>('in_progress')

  // Eagerly check if current week's plan is already committed (so Plan button can be greyed out)
  useEffect(() => {
    const checkSessionStatus = async () => {
      try {
        const res = await apiFetch(`/api/calendar/planning/session?weekStart=${weekStart}`)
        if (res.ok) {
          const session = await res.json()
          setSessionStatus(session.status || 'in_progress')
        }
      } catch {
        // ignore — optimistic default is 'in_progress'
      }
    }
    checkSessionStatus()
  }, [weekStart])
  
  // Debug modal state
  const [showDebugModal, setShowDebugModal] = useState(false)
  const [debugCommitPlan, setDebugCommitPlan] = useState<any>(null)

  // Calendar sync state
  const [, setSyncStatus] = useState<CalendarSyncStatus | null>(null)


  // Action type navigation state
  const [currentActionType, setCurrentActionType] = useState<ActionType>('ACTION_GATE')

  // Tag mode state
  const [tagMode, setTagMode] = useState(false)
  const [selectedTagType, setSelectedTagType] = useState(DEFAULT_TAGS[0]?.name || 'intention')
  const [selectedTagValue, setSelectedTagValue] = useState<string | null>(null)
  const [eventTags, setEventTags] = useState<Map<string, Record<string, string>>>(new Map<string, Record<string, string>>())
  const [taggedCountThisSession, setTaggedCountThisSession] = useState(0)

  useEffect(() => {
    actionStatesRef.current = actionStates
  }, [actionStates])

  // Group actions by type
  const actionsByType = useMemo(() => {
    const groups = new Map<ActionType, typeof actions>()
    for (const type of ACTION_TYPES) {
      groups.set(type, [])
    }
    for (const action of actions) {
      const group = groups.get(action.unitType as ActionType)
      if (group) group.push(action)
    }
    return groups
  }, [actions])

  // Get actions for current type
  const currentTypeActions = useMemo(() => {
    return actionsByType.get(currentActionType) || []
  }, [actionsByType, currentActionType])

  // Set initial current action when actions load
  useEffect(() => {
    if (actions.length > 0 && !currentAction) {
      // Find first type with actions
      for (const type of ACTION_TYPES) {
        const typeActions = actionsByType.get(type) || []
        if (typeActions.length > 0) {
          setCurrentActionType(type)
          setCurrentAction(typeActions[0])
          break
        }
      }
    }
  }, [actions, currentAction, actionsByType])

  // Fetch existing classification rules (for pre-selecting in finalize modal)
  useEffect(() => {
    if (planningMode) {
      fetchExistingRules()
    }
  }, [planningMode])

  const fetchExistingRules = async () => {
    try {
      const res = await apiFetch('/api/calendar/rules')
      if (res.ok) {
        const rules = await res.json()
        const titles = new Set<string>(rules.map((r: any) => r.matchValue))
        setExistingRuleEventTitles(titles)
      }
    } catch (error) {
      console.error('Failed to fetch existing rules:', error)
    }
  }

  // Load planning session when entering plan mode
  useEffect(() => {
    if (planningMode) {
      loadPlanningSession()
      loadRoutineLinks()
      loadPlannedHours()
    }
  }, [planningMode, weekStart])

  const loadPlanningSession = async () => {
    try {
      // Clear previous session data before loading new week
      setActionStates(new Map<string, ActionPlanState>())
      setGcalAssignments(new Map<string, GcalAssignment>())

      const res = await apiFetch(`/api/calendar/planning/session?weekStart=${weekStart}`)
      if (res.ok) {
        const session = await res.json()
        // Track session status to prevent re-committing
        setSessionStatus(session.status || 'in_progress')
        if (session.actionStates && Object.keys(session.actionStates).length > 0) {
          // Convert from object to Map, parsing date strings back to Date objects
          const statesMap = new Map<string, ActionPlanState>()
          for (const [key, value] of Object.entries(session.actionStates)) {
            const state = value as ActionPlanState
            statesMap.set(key, {
              ...state,
              tasks: state.tasks.map(t => ({
                ...t,
                start: new Date(t.start),
                end: new Date(t.end),
              })),
            })
          }
          setActionStates(statesMap)
        }
        if (session.gcalAssignments && Object.keys(session.gcalAssignments).length > 0) {
          // Parse modifiedStart/modifiedEnd back to Date objects
          const assignmentsMap = new Map<string, GcalAssignment>()
          for (const [key, value] of Object.entries(session.gcalAssignments)) {
            const assignment = value as GcalAssignment & { modifiedStart?: string; modifiedEnd?: string }
            assignmentsMap.set(key, {
              ...assignment,
              modifiedStart: assignment.modifiedStart ? new Date(assignment.modifiedStart) : undefined,
              modifiedEnd: assignment.modifiedEnd ? new Date(assignment.modifiedEnd) : undefined,
            })
          }
          setGcalAssignments(assignmentsMap)
        }
      }
    } catch (error) {
      console.error('Failed to load planning session:', error)
    }
  }

  const loadRoutineLinks = async () => {
    try {
      const res = await apiFetch('/api/calendar/routines/links')
      if (res.ok) {
        const links = await res.json()
        const linkMap = new Map<string, any>()
        links.forEach((link: any) => linkMap.set(link.cardId, {
          eventSummary: link.eventSummary,
          calendarName: link.calendarName,
          eventRecurrence: link.eventRecurrence,
          htmlLink: link.htmlLink,
        }))
        setRoutineLinks(linkMap)
      }
    } catch (error) {
      console.error('Failed to load routine links:', error)
    }
  }

  const loadPlannedHours = async () => {
    try {
      const res = await apiFetch(`/api/calendar/week/planned-hours?weekStart=${weekStart}`)
      if (res.ok) {
        const data = await res.json()
        setPlannedHoursData(data)
      }
    } catch (error) {
      console.error('Failed to load planned hours:', error)
    }
  }

  const loadSyncStatus = useCallback(async () => {
    try {
      const res = await apiFetch('/api/calendar/sync/status')
      if (res.ok) {
        const status = await res.json()
        setSyncStatus(status)
      }
    } catch (error) {
      console.error('Failed to load sync status:', error)
    }
  }, [])

  useEffect(() => {
    loadSyncStatus()

    const intervalId = window.setInterval(() => {
      loadSyncStatus()
    }, 60 * 1000)

    return () => window.clearInterval(intervalId)
  }, [loadSyncStatus])

  // Load tasks for an action
  const loadActionTasks = useCallback(async (actionId: string) => {
    try {
      const res = await apiFetch(`/api/cards/${actionId}/children`)
      if (res.ok) {
        const tasks = await res.json()
        setActionTasks(prev => new Map(prev).set(actionId, tasks))
      } else if (res.status === 404) {
        // New action with no tasks yet
        setActionTasks(prev => new Map(prev).set(actionId, []))
      }
    } catch (error) {
      console.error('Failed to load action tasks:', error)
      // Treat errors as empty array
      setActionTasks(prev => new Map(prev).set(actionId, []))
    }
  }, [])

  // Load tasks when current action changes in plan mode
  useEffect(() => {
    if (planningMode && currentAction) {
      loadActionTasks(currentAction.id)
    }
  }, [planningMode, currentAction?.id, loadActionTasks])

  const savePlanningSession = useCallback(async (
    newActionStates: Map<string, ActionPlanState>,
    newGcalAssignments: Map<string, GcalAssignment>
  ) => {
    try {
      // Convert Maps to objects for JSON serialization
      const actionStatesObj: Record<string, ActionPlanState> = {}
      newActionStates.forEach((value, key) => {
        actionStatesObj[key] = {
          ...value,
          tasks: value.tasks.map(t => ({
            ...t,
            start: t.start instanceof Date ? t.start.toISOString() : t.start,
            end: t.end instanceof Date ? t.end.toISOString() : t.end,
          })) as any,
        }
      })

      await apiFetch('/api/calendar/planning/session', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weekStart,
          actionStates: actionStatesObj,
          gcalAssignments: Object.fromEntries(newGcalAssignments),
        }),
      })
    } catch (error) {
      console.error('Failed to save planning session:', error)
    }
  }, [weekStart])

  // Convert action states to calendar events
  const planModeEvents = useMemo((): CalendarEvent[] => {
    const events: CalendarEvent[] = []
    actionStates.forEach((state, actionId) => {
      state.tasks.forEach(task => {
        // Support backward compatibility: use cardId if present, otherwise actionId
        const cardId = task.cardId ?? task.actionId
        events.push({
          id: task.id,
          title: task.title,
          start: task.start,
          end: task.end,
          source: currentAction?.id === actionId ? 'current' : 'planned',
          cardId,
          actionId, // Keep for backward compatibility
          colorIndex: 0,
          description: task.description,
          location: task.location,
          attendees: task.attendees?.map(email => ({ email })),
        })
      })
    })
    return events
  }, [actionStates, currentAction?.id])

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    if (!currentAction) return

    const newTask: PlannedTask = {
      id: `task-${Date.now()}`,
      cardId: currentAction.id,
      title: currentAction.title,
      start: slotInfo.start,
      end: slotInfo.end,
    }

    setActionStates(prev => {
      const state = prev.get(currentAction.id) || { status: 'pending', tasks: [] }
      const newMap = new Map(prev)
      newMap.set(currentAction.id, {
        ...state,
        tasks: [...state.tasks, newTask],
      })
      savePlanningSession(newMap, gcalAssignments)
      return newMap
    })
  }, [currentAction, gcalAssignments, savePlanningSession])

  const handleRemoveTask = useCallback((actionId: string, taskId: string) => {
    setActionStates(prev => {
      const state = prev.get(actionId)
      if (!state) return prev
      const newMap = new Map(prev)
      newMap.set(actionId, {
        ...state,
        tasks: state.tasks.filter(t => t.id !== taskId),
      })
      savePlanningSession(newMap, gcalAssignments)
      return newMap
    })
  }, [gcalAssignments, savePlanningSession])

  // Routine link handlers
  const handleUnlinkRoutine = useCallback(async (cardId: string) => {
    if (!confirm('Unlink this calendar event? Future instances will no longer auto-classify.')) return
    try {
      await apiFetch(`/api/calendar/routines/link/${cardId}`, {
        method: 'DELETE',
              })
      setRoutineLinks(prev => {
        const next = new Map(prev)
        next.delete(cardId)
        return next
      })
    } catch (error) {
      console.error('Failed to unlink routine:', error)
      alert('Failed to unlink routine')
    }
  }, [])

  const handleRoutineLinked = useCallback((linkInfo: RoutineLinkResult) => {
    if (!routineSetupAction) return
    setRoutineLinks(prev => {
      const next = new Map(prev)
      next.set(routineSetupAction.id, {
        eventSummary: linkInfo.eventSummary,
        calendarName: linkInfo.calendarName,
        eventRecurrence: linkInfo.eventRecurrence,
        htmlLink: linkInfo.htmlLink,
      })
      return next
    })
    setRoutineSetupAction(null)
  }, [routineSetupAction])

  // Task management handlers
  const handleUpdateTask = useCallback(async (taskId: string, updates: Partial<Card>) => {
    try {
      // Find the action this task belongs to for optimistic update
      let taskActionId: string | null = null
      actionTasks.forEach((tasks, actionId) => {
        if (tasks.some(t => t.id === taskId)) {
          taskActionId = actionId
        }
      })

      if (!taskActionId) return

      // Optimistic update
      const oldTasks = actionTasks.get(taskActionId) || []
      setActionTasks(prev => {
        const tasks = prev.get(taskActionId!) || []
        return new Map(prev).set(taskActionId!, tasks.map(t =>
          t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
        ))
      })

      // API call
      const res = await apiFetch(`/api/cards/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        // Rollback on error
        setActionTasks(prev => new Map(prev).set(taskActionId!, oldTasks))
        console.error('Failed to update task')
      }
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }, [actionTasks])

  const handleDeleteTask = useCallback(async (taskId: string, actionId: string) => {
    try {
      // Optimistic update
      const oldTasks = actionTasks.get(actionId) || []
      setActionTasks(prev => {
        const tasks = prev.get(actionId) || []
        return new Map(prev).set(actionId, tasks.filter(t => t.id !== taskId))
      })

      // API call
      const res = await apiFetch(`/api/cards/${taskId}`, {
        method: 'DELETE',
              })

      if (!res.ok) {
        // Rollback on error
        setActionTasks(prev => new Map(prev).set(actionId, oldTasks))
        console.error('Failed to delete task')
      }
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }, [actionTasks])

  // Handle task drop from TaskSection onto calendar
  const handleTaskDrop = useCallback((taskData: TaskDropData, start: Date, end: Date) => {
    // Create a PlannedTask for the dropped task
    const newTask: PlannedTask = {
      id: `task-${Date.now()}`,
      cardId: taskData.cardId,
      title: taskData.title,
      start,
      end,
    }

    // Find which action this task belongs to (for storing in actionStates)
    let parentActionId: string | null = null
    actionTasks.forEach((tasks, actionId) => {
      if (tasks.some(t => t.id === taskData.taskId)) {
        parentActionId = actionId
      }
    })

    if (!parentActionId) {
      console.error('Could not find parent action for dropped task')
      return
    }

    setActionStates(prev => {
      const state = prev.get(parentActionId!) || { status: 'pending', tasks: [] }
      const newMap = new Map(prev)
      newMap.set(parentActionId!, {
        ...state,
        tasks: [...state.tasks, newTask],
      })
      savePlanningSession(newMap, gcalAssignments)
      return newMap
    })
  }, [actionTasks, gcalAssignments, savePlanningSession])

  // Helper: Get all PlannedTasks for action + its tasks
  const getPlannedTasksForAction = useCallback((actionId: string): PlannedTask[] => {
    const tasks = actionTasks.get(actionId) || []
    const taskIds = tasks.map(t => t.id)
    const relevantCardIds = [actionId, ...taskIds]

    const allPlannedTasks: PlannedTask[] = []
    actionStates.forEach((state) => {
      state.tasks.forEach(pt => {
        const cardId = pt.cardId ?? pt.actionId
        if (cardId && relevantCardIds.includes(cardId)) {
          allPlannedTasks.push(pt)
        }
      })
    })
    return allPlannedTasks
  }, [actionTasks, actionStates])

  const handleEventClick = useCallback((event: CalendarEvent) => {
    if (event.source === 'gcal' && currentAction) {
      // Assign GCal event to current action
      const existingAssignment = gcalAssignments.get(event.id)
      if (existingAssignment?.actionId === currentAction.id) {
        // Already assigned to this action - unassign
        setGcalAssignments(prev => {
          const newMap = new Map(prev)
          newMap.delete(event.id)
          savePlanningSession(actionStates, newMap)
          return newMap
        })
      } else {
        // Assign to current action
        setGcalAssignments(prev => {
          const newMap = new Map(prev)
          newMap.set(event.id, {
            eventId: event.id,
            eventTitle: event.title,
            actionId: currentAction.id,
            actionTitle: currentAction.title,
            accountId: event.accountId || '',
            calendarId: event.calendarId || '',
            source: 'manual',
          })
          savePlanningSession(actionStates, newMap)
          return newMap
        })
      }
    }
  }, [currentAction, gcalAssignments, actionStates, savePlanningSession])

  // Handler for assigning event from popover
  const handleAssignEvent = useCallback((event: CalendarEvent) => {
    if (!currentAction) return
    setGcalAssignments(prev => {
      const newMap = new Map(prev)
      newMap.set(event.id, {
        eventId: event.id,
        eventTitle: event.title,
        actionId: currentAction.id,
        actionTitle: currentAction.title,
        accountId: event.accountId || '',
        calendarId: event.calendarId || '',
        source: 'manual',
      })
      savePlanningSession(actionStates, newMap)
      return newMap
    })
  }, [currentAction, actionStates, savePlanningSession])

  // Handler for deassigning event from popover
  const handleDeassignEvent = useCallback((event: CalendarEvent) => {
    setGcalAssignments(prev => {
      const newMap = new Map(prev)
      newMap.delete(event.id)
      savePlanningSession(actionStates, newMap)
      return newMap
    })
  }, [actionStates, savePlanningSession])

  // Handler for editing event from popover
  const handleEditEvent = useCallback((event: CalendarEvent) => {
    setEditingEvent(event)
  }, [])

  // Handler for deleting a GCal event from popover
  const handleDeleteEvent = useCallback(async (event: CalendarEvent) => {
    if (!event.accountId || !event.calendarId) return
    await apiFetch(
      `/api/calendar/events/${event.accountId}/${event.calendarId}/${event.id}`,
      { method: 'DELETE' }
    )
    queryClient.invalidateQueries({ queryKey: ['calendarEvents'] })
  }, [queryClient])

  const handleEventDrop = useCallback((args: { event: CalendarEvent; start: Date; end: Date }) => {
    const { event, start, end } = args
    
    if (event.source === 'planned' || event.source === 'current') {
      // Update planned task position
      setActionStates(prev => {
        const actionId = event.actionId
        if (!actionId) return prev
        
        const state = prev.get(actionId)
        if (!state) return prev
        
        const newMap = new Map(prev)
        newMap.set(actionId, {
          ...state,
          tasks: state.tasks.map(t => 
            t.id === event.id ? { ...t, start, end } : t
          ),
        })
        savePlanningSession(newMap, gcalAssignments)
        return newMap
      })
    } else if (event.source === 'gcal') {
      // Store GCal event modification locally - will be applied on commit
      setGcalAssignments(prev => {
        const newMap = new Map(prev)
        const existing = prev.get(event.id)
        newMap.set(event.id, {
          eventId: event.id,
          eventTitle: event.title,
          actionId: existing?.actionId || '',
          actionTitle: existing?.actionTitle || '',
          accountId: event.accountId || existing?.accountId || '',
          calendarId: event.calendarId || existing?.calendarId || '',
          modifiedStart: start,
          modifiedEnd: end,
        })
        savePlanningSession(actionStates, newMap)
        return newMap
      })
    }
  }, [actionStates, gcalAssignments, savePlanningSession])

  const handleEventResize = useCallback((args: { event: CalendarEvent; start: Date; end: Date }) => {
    const { event, start, end } = args
    
    if (event.source === 'planned' || event.source === 'current') {
      // Update planned task duration
      setActionStates(prev => {
        const actionId = event.actionId
        if (!actionId) return prev
        
        const state = prev.get(actionId)
        if (!state) return prev
        
        const newMap = new Map(prev)
        newMap.set(actionId, {
          ...state,
          tasks: state.tasks.map(t => 
            t.id === event.id ? { ...t, start, end } : t
          ),
        })
        savePlanningSession(newMap, gcalAssignments)
        return newMap
      })
    } else if (event.source === 'gcal') {
      // Store GCal event modification locally - will be applied on commit
      setGcalAssignments(prev => {
        const newMap = new Map(prev)
        const existing = prev.get(event.id)
        newMap.set(event.id, {
          eventId: event.id,
          eventTitle: event.title,
          actionId: existing?.actionId || '',
          actionTitle: existing?.actionTitle || '',
          accountId: event.accountId || existing?.accountId || '',
          calendarId: event.calendarId || existing?.calendarId || '',
          modifiedStart: start,
          modifiedEnd: end,
        })
        savePlanningSession(actionStates, newMap)
        return newMap
      })
    }
  }, [actionStates, gcalAssignments, savePlanningSession])

  const handleEventDoubleClick = useCallback((event: CalendarEvent) => {
    setEditingEvent(event)
  }, [])

  const handleEventSave = useCallback(async (updatedEvent: CalendarEvent) => {
    if (updatedEvent.source === 'planned' || updatedEvent.source === 'current') {
      // Update planned task
      setActionStates(prev => {
        const actionId = updatedEvent.actionId
        if (!actionId) return prev
        
        const state = prev.get(actionId)
        if (!state) return prev
        
        const newMap = new Map(prev)
        newMap.set(actionId, {
          ...state,
          tasks: state.tasks.map(t => 
            t.id === updatedEvent.id ? {
              ...t,
              title: updatedEvent.title,
              description: updatedEvent.description,
              location: updatedEvent.location,
              attendees: updatedEvent.attendees?.map(a => a.email),
            } : t
          ),
        })
        savePlanningSession(newMap, gcalAssignments)
        return newMap
      })
    }

    if (updatedEvent.source === 'gcal' && updatedEvent.accountId && updatedEvent.calendarId) {
      try {
        const response = await apiFetch('/api/calendar/events/batch-update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            updates: [{
              accountId: updatedEvent.accountId,
              calendarId: updatedEvent.calendarId,
              eventId: updatedEvent.id,
              patch: {
                summary: updatedEvent.title,
                description: updatedEvent.description ?? '',
                location: updatedEvent.location ?? '',
                attendees: (updatedEvent.attendees ?? []).map(a => ({ email: a.email })),
              },
            }],
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to persist calendar event edit')
        }

        const result = await response.json()
        if (!result?.success) {
          throw new Error(result?.results?.[0]?.error || 'Calendar event update failed')
        }

        // Keep assigned-event title in sync if this event is already assigned.
        setGcalAssignments(prev => {
          const assignment = prev.get(updatedEvent.id)
          if (!assignment) return prev

          const next = new Map(prev)
          next.set(updatedEvent.id, {
            ...assignment,
            eventTitle: updatedEvent.title,
          })
          savePlanningSession(actionStatesRef.current, next)
          return next
        })

        queryClient.invalidateQueries({ queryKey: ['calendarEvents'] })
      } catch (error) {
        console.error('Failed to save calendar event edit:', error)
      }
    }

    setEditingEvent(null)
  }, [gcalAssignments, queryClient, savePlanningSession])

  const handleNext = useCallback(() => {
    if (!currentAction) return

    // Mark current action as reviewed
    setActionStates(prev => {
      const state = prev.get(currentAction.id) || { status: 'pending', tasks: [] }
      const newMap = new Map(prev)
      const newStatus = state.tasks.length > 0 ? 'completed' : 'skipped'
      newMap.set(currentAction.id, { ...state, status: newStatus })
      savePlanningSession(newMap, gcalAssignments)
      return newMap
    })

    // Navigate within same action type first
    const currentIndex = currentTypeActions.findIndex(a => a.id === currentAction.id)
    if (currentIndex < currentTypeActions.length - 1) {
      // More actions in current type
      setCurrentAction(currentTypeActions[currentIndex + 1])
    } else {
      // Move to next type with actions
      const currentTypeIndex = ACTION_TYPES.indexOf(currentActionType)
      for (let i = currentTypeIndex + 1; i < ACTION_TYPES.length; i++) {
        const nextType = ACTION_TYPES[i]
        const nextTypeActions = actionsByType.get(nextType) || []
        if (nextTypeActions.length > 0) {
          setCurrentActionType(nextType)
          setCurrentAction(nextTypeActions[0])
          return
        }
      }
      // All types exhausted - stay on last action
    }
  }, [currentAction, currentTypeActions, currentActionType, actionsByType, gcalAssignments, savePlanningSession])

  const handlePrev = useCallback(() => {
    if (!currentAction) return
    
    // Navigate within same action type first
    const currentIndex = currentTypeActions.findIndex(a => a.id === currentAction.id)
    if (currentIndex > 0) {
      // More actions before in current type
      setCurrentAction(currentTypeActions[currentIndex - 1])
    } else {
      // Move to previous type with actions
      const currentTypeIndex = ACTION_TYPES.indexOf(currentActionType)
      for (let i = currentTypeIndex - 1; i >= 0; i--) {
        const prevType = ACTION_TYPES[i]
        const prevTypeActions = actionsByType.get(prevType) || []
        if (prevTypeActions.length > 0) {
          setCurrentActionType(prevType)
          setCurrentAction(prevTypeActions[prevTypeActions.length - 1])
          return
        }
      }
      // At the beginning - stay on first action
    }
  }, [currentAction, currentTypeActions, currentActionType, actionsByType])

  const handleFinalize = useCallback(() => {
    // Get assignments that have actionId (actual assignments, not just time modifications)
    const newAssignments = Array.from(gcalAssignments.values()).filter(a => a.actionId)
    
    // Build commit plan for debug mode
    if (debugMode) {
      const blocks: any[] = []
      actionStates.forEach((state, actionId) => {
        const action = actions.find(a => a.id === actionId)
        state.tasks.forEach(task => {
          blocks.push({
            cardId: actionId,
            cardTitle: task.title,
            description: task.description || '',
            startDateTime: task.start instanceof Date ? task.start.toISOString() : task.start,
            endDateTime: task.end instanceof Date ? task.end.toISOString() : task.end,
            actionType: action?.unitType,
          })
        })
      })
      
      const assignments = Array.from(gcalAssignments.values())
        .filter(a => a.actionId || a.modifiedStart || a.modifiedEnd)
        .map(a => ({
          eventId: a.eventId,
          eventTitle: a.eventTitle,
          cardId: a.actionId,
          actionTitle: a.actionTitle,
          modifiedStart: a.modifiedStart instanceof Date ? a.modifiedStart.toISOString() : a.modifiedStart,
          modifiedEnd: a.modifiedEnd instanceof Date ? a.modifiedEnd.toISOString() : a.modifiedEnd,
        }))
      
      setDebugCommitPlan({ blocks, assignments, weekStart })
      setShowDebugModal(true)
      return
    }
    
    if (newAssignments.length > 0) {
      // Show finalize modal to confirm rules
      setShowFinalizeModal(true)
    } else {
      // No new assignments, just commit
      handleCommit([])
    }
  }, [gcalAssignments, debugMode, actionStates, actions, weekStart])

  const handleCommit = useCallback(async (rulesToCreate: string[]) => {
    setLoading(true)
    try {
      // Collect all planned tasks
      const blocks: any[] = []
      actionStates.forEach((state, actionId) => {
        const action = actions.find(a => a.id === actionId)
        state.tasks.forEach(task => {
          blocks.push({
            cardId: actionId,
            cardTitle: task.title,
            description: task.description || '',
            startDateTime: task.start instanceof Date ? task.start.toISOString() : task.start,
            endDateTime: task.end instanceof Date ? task.end.toISOString() : task.end,
            actionType: action?.unitType,
            location: task.location,
            attendees: task.attendees?.map(email => ({ email })),
          })
        })
      })

      // Collect GCal assignments (those with actionId OR time modifications)
      const assignments = Array.from(gcalAssignments.values())
        .filter(a => a.actionId || a.modifiedStart || a.modifiedEnd)
        .map(a => ({
          eventId: a.eventId,
          cardId: a.actionId,
          createRule: rulesToCreate.includes(a.eventId),
          eventTitle: a.eventTitle,
          accountId: a.accountId,
          calendarId: a.calendarId,
          // Include modified times if present
          modifiedStart: a.modifiedStart instanceof Date ? a.modifiedStart.toISOString() : a.modifiedStart,
          modifiedEnd: a.modifiedEnd instanceof Date ? a.modifiedEnd.toISOString() : a.modifiedEnd,
        }))

      // Commit the plan (now atomically marks session as committed)
      const response = await apiFetch('/api/calendar/plan/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blocks, assignments, weekStart }),
      })

      // Handle already-committed error
      if (response.status === 409) {
        const error = await response.json()
        alert(error.error || 'This week has already been committed')
        setSessionStatus('committed')
        setShowFinalizeModal(false)
        setLoading(false)
        return
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.error || 'Failed to commit plan')
      }

      // Exit plan mode (session is now atomically committed by the API)
      setPlanningMode(false)
      setActionStates(new Map<string, ActionPlanState>())
      setGcalAssignments(new Map<string, GcalAssignment>())
      setShowFinalizeModal(false)
      setSessionStatus('in_progress') // Reset for next session
    } catch (error) {
      console.error('Failed to finalize plan:', error)
      alert('Failed to finalize plan')
    }
    setLoading(false)
  }, [actionStates, gcalAssignments, actions, weekStart])

  const enterPlanMode = useCallback(() => {
    setShowPlanRestrictionPopup(false)
    setTagMode(false)
    setPlanningMode(true)
  }, [])

  const handlePlanModeToggle = useCallback((enabled: boolean) => {
    if (!enabled) {
      setPlanningMode(false)
      setShowPlanRestrictionPopup(false)
      // Reset state when exiting plan mode
      setActionStates(new Map<string, ActionPlanState>())
      setGcalAssignments(new Map<string, GcalAssignment>())
      setSessionStatus('in_progress') // Reset for next session
      return
    }

    const planningDay = userSettings?.planningDay
    if (planningDay === undefined) {
      enterPlanMode()
      return
    }

    const today = getWeekdayInTimeZone(new Date(), timeZone)
    if (today !== planningDay) {
      setShowPlanRestrictionPopup(true)
      return
    }

    enterPlanMode()
  }, [enterPlanMode, timeZone, userSettings?.planningDay])

  const handleProceedAnyway = useCallback(() => {
    enterPlanMode()
  }, [enterPlanMode])

  // Tag mode handlers
  const handleTagModeToggle = useCallback((enabled: boolean) => {
    setTagMode(enabled)
    if (!enabled) {
      // Reset tag mode state when exiting
      setSelectedTagValue(null)
      setTaggedCountThisSession(0)
    }
  }, [])

  // Load event tags when entering tag mode
  useEffect(() => {
    if (tagMode) {
      loadEventTags()
    }
  }, [tagMode, weekStart])

  const loadEventTags = async () => {
    try {
      const res = await apiFetch('/api/tags/events')
      if (res.ok) {
        const tags = await res.json()
        const tagsMap = new Map<string, Record<string, string>>()
        for (const tag of tags) {
          if (!tagsMap.has(tag.eventId)) {
            tagsMap.set(tag.eventId, {})
          }
          tagsMap.get(tag.eventId)![tag.tagType] = tag.tagValue
        }
        setEventTags(tagsMap)
      }
    } catch (error) {
      console.error('Failed to load event tags:', error)
    }
  }

  const handleTagEvent = useCallback((event: CalendarEvent) => {
    if (!selectedTagValue) return

    const optimisticValue = selectedTagValue
    const previousValue = eventTags.get(event.id)?.[selectedTagType]
    const shouldIncrement = previousValue !== optimisticValue

    // Optimistic update
    setEventTags(prev => {
      const newMap = new Map(prev)
      const existing = newMap.get(event.id) || {}
      newMap.set(event.id, { ...existing, [selectedTagType]: optimisticValue })
      return newMap
    })
    if (shouldIncrement) {
      setTaggedCountThisSession(prev => prev + 1)
    }

    void apiFetch('/api/tags/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId: event.id,
        tagType: selectedTagType,
        tagValue: optimisticValue,
      }),
    })
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to tag event')
        }
      })
      .catch(error => {
        console.error('Failed to tag event:', error)
        setEventTags(prev => {
          const newMap = new Map(prev)
          const existing = newMap.get(event.id) || {}

          if (existing[selectedTagType] !== optimisticValue) {
            return prev
          }

          if (previousValue !== undefined) {
            newMap.set(event.id, { ...existing, [selectedTagType]: previousValue })
          } else {
            const { [selectedTagType]: _, ...rest } = existing
            if (Object.keys(rest).length === 0) {
              newMap.delete(event.id)
            } else {
              newMap.set(event.id, rest)
            }
          }
          return newMap
        })
        if (shouldIncrement) {
          setTaggedCountThisSession(prev => Math.max(0, prev - 1))
        }
      })
  }, [eventTags, selectedTagType, selectedTagValue])

  const handleUntagEvent = useCallback((event: CalendarEvent) => {
    const previousValue = eventTags.get(event.id)?.[selectedTagType]

    if (previousValue !== undefined) {
      // Optimistic update
      setEventTags(prev => {
        const newMap = new Map(prev)
        const existing = newMap.get(event.id)
        if (existing) {
          const { [selectedTagType]: _, ...rest } = existing
          if (Object.keys(rest).length === 0) {
            newMap.delete(event.id)
          } else {
            newMap.set(event.id, rest)
          }
        }
        return newMap
      })
    }

    void apiFetch(`/api/tags/events/${encodeURIComponent(event.id)}/${selectedTagType}`, {
      method: 'DELETE',
    })
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to untag event')
        }
      })
      .catch(error => {
        console.error('Failed to untag event:', error)
        if (previousValue === undefined) {
          return
        }
        setEventTags(prev => {
          const newMap = new Map(prev)
          const existing = newMap.get(event.id) || {}

          if (existing[selectedTagType] !== undefined) {
            return prev
          }

          newMap.set(event.id, { ...existing, [selectedTagType]: previousValue })
          return newMap
        })
      })
  }, [eventTags, selectedTagType])


  // Date navigation handlers
  const handleDateChange = useCallback((date: Date) => {
    setCurrentDate(date)
    setSelectedDate(format(date, 'yyyy-MM-dd'))
  }, [])

  const handleWeekChange = useCallback((newWeekStart: string) => {
    const date = new Date(newWeekStart)
    setCurrentDate(date)
    setSelectedDate(format(date, 'yyyy-MM-dd'))
  }, [])

  const handleViewModeChange = useCallback((mode: 'day' | 'week') => {
    setViewMode(mode)
  }, [])

  // Trigger plan mode from URL param (?mode=plan)
  const [searchParams] = useSearchParams()
  useEffect(() => {
    if (searchParams.get('mode') === 'plan' && !planningMode) {
      handlePlanModeToggle(true)
    }
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppLayout onThemeClick={(id) => navigate('/theme/' + id)}>

        <DateNavHeader
          viewMode={viewMode}
          currentDate={currentDate}
          onViewModeChange={handleViewModeChange}
          onDateChange={handleDateChange}
        />

        {/* Content Area */}
        <div className="kaizen-content">
          {viewMode === 'day' && !planningMode && !tagMode ? (
            /* Day View - Render DailyDashboard content without its own header */
            <DailyDashboard
              date={selectedDate}
              themes={themes || []}
            />
          ) : (
            /* Week View with Planning/Tag Mode Support */
            <div className="week-view-layout">
              {/* Left Panel - Mode-specific or none */}
              {planningMode && (
                <div className="week-left-panel">
                  <ActionPlanPanel
                    actions={actions}
                    actionStates={actionStates}
                    gcalAssignments={gcalAssignments}
                    routineLinks={routineLinks}
                    currentAction={currentAction}
                    currentActionType={currentActionType}
                    onActionSelect={setCurrentAction}
                    onActionTypeChange={setCurrentActionType}
                    onRemoveTask={handleRemoveTask}
                    onSetupRoutine={setRoutineSetupAction}
                    onUnlinkRoutine={handleUnlinkRoutine}
                    onNext={handleNext}
                    onPrev={handlePrev}
                    onFinalize={handleFinalize}
                    loading={loading}
                    sessionStatus={sessionStatus}
                    planningDay={userSettings?.planningDay ?? 0}
                    timeZone={timeZone}
                    plannedHoursData={plannedHoursData}
                    actionTasks={actionTasks}
                    onUpdateTask={handleUpdateTask}
                    onDeleteTask={handleDeleteTask}
                    onEditTask={setEditingTask}
                    getPlannedTasksForAction={getPlannedTasksForAction}
                  />
                </div>
              )}
              {tagMode && (
                <div className="week-left-panel">
                  <TagPanel
                    selectedTagType={selectedTagType}
                    selectedTagValue={selectedTagValue}
                    onTagTypeChange={setSelectedTagType}
                    onTagValueChange={setSelectedTagValue}
                    onExit={() => handleTagModeToggle(false)}
                    taggedCount={taggedCountThisSession}
                  />
                </div>
              )}

              {/* Calendar Panel - Always visible in week view */}
              <CalendarPanel
                themes={themes || []}
                planMode={planningMode}
                planModeEvents={planModeEvents}
                currentActionId={currentAction?.id}
                currentActionTitle={currentAction?.title}
                gcalAssignments={gcalAssignments}
                onSelectSlot={handleSelectSlot}
                onEventClick={handleEventClick}
                onEventDrop={handleEventDrop}
                onEventResize={handleEventResize}
                onEventDoubleClick={handleEventDoubleClick}
                onAssignEvent={handleAssignEvent}
                onDeassignEvent={handleDeassignEvent}
                onEditEvent={handleEditEvent}
                onDeleteEvent={handleDeleteEvent}
                weekStart={weekStart}
                onWeekChange={handleWeekChange}
                onTaskDrop={handleTaskDrop}
                tagMode={tagMode}
                selectedTagValue={selectedTagValue}
                eventTags={eventTags}
                onTagEvent={handleTagEvent}
                onUntagEvent={handleUntagEvent}
                activeThemeId={activeThemeId}
              />
            </div>
          )}
        </div>

        {/* Modals */}
        <PlanModeRestrictionPopup
          isOpen={showPlanRestrictionPopup}
          planningDay={userSettings?.planningDay ?? 0}
          onClose={() => setShowPlanRestrictionPopup(false)}
          onProceedAnyway={handleProceedAnyway}
        />

        {editingEvent && (
          <EventEditModal
            event={editingEvent}
            onSave={handleEventSave}
            onClose={() => setEditingEvent(null)}
          />
        )}

        {editingTask && (
          <TaskDetailModal
            task={editingTask}
            onSave={(updates) => handleUpdateTask(editingTask.id, updates)}
            onDelete={() => editingTask.parentId && handleDeleteTask(editingTask.id, editingTask.parentId)}
            onClose={() => setEditingTask(null)}
          />
        )}


        {showFinalizeModal && (
          <FinalizeModal
            assignments={Array.from(gcalAssignments.values()).filter(a => a.actionId)}
            existingRuleEventTitles={existingRuleEventTitles}
            onConfirm={handleCommit}
            onCancel={() => setShowFinalizeModal(false)}
            loading={loading}
          />
        )}

        {routineSetupAction && (
          <RoutineSetupModal
            action={routineSetupAction}
            onClose={() => setRoutineSetupAction(null)}
            onLinked={handleRoutineLinked}
          />
        )}

        {showDebugModal && debugCommitPlan && (
          <div className="event-edit-overlay" onClick={() => setShowDebugModal(false)}>
            <div className="event-edit-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '80vh', overflow: 'auto' }}>
              <h4>Debug: Commit Plan Preview</h4>
              <div style={{ fontSize: 12, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                <strong>Week Start:</strong> {debugCommitPlan.weekStart}

                <h5 style={{ marginTop: 16 }}>New Events to Create ({debugCommitPlan.blocks.length})</h5>
                {debugCommitPlan.blocks.map((b: any, i: number) => (
                  <div key={i} style={{ padding: '8px', background: '#f5f5f5', marginBottom: 4, borderRadius: 4 }}>
                    <div><strong>{b.cardTitle}</strong> ({b.actionType})</div>
                    <div>Start: {b.startDateTime}</div>
                    <div>End: {b.endDateTime}</div>
                  </div>
                ))}

                <h5 style={{ marginTop: 16 }}>GCal Assignments/Modifications ({debugCommitPlan.assignments.length})</h5>
                {debugCommitPlan.assignments.map((a: any, i: number) => (
                  <div key={i} style={{ padding: '8px', background: '#f0f8ff', marginBottom: 4, borderRadius: 4 }}>
                    <div><strong>"{a.eventTitle}"</strong></div>
                    {a.cardId && <div>→ Assigned to: {a.actionTitle} (ID: {a.cardId})</div>}
                    {a.modifiedStart && <div>⏰ New Start: {a.modifiedStart}</div>}
                    {a.modifiedEnd && <div>⏰ New End: {a.modifiedEnd}</div>}
                  </div>
                ))}
              </div>
              <div className="modal-actions" style={{ marginTop: 16 }}>
                <button className="modal-btn cancel" onClick={() => setShowDebugModal(false)}>Close</button>
                <button className="modal-btn save" onClick={() => {
                  setShowDebugModal(false)
                  const newAssignments = Array.from(gcalAssignments.values()).filter(a => a.actionId)
                  if (newAssignments.length > 0) {
                    setShowFinalizeModal(true)
                  } else {
                    handleCommit([])
                  }
                }}>Continue to Submit</button>
              </div>
            </div>
          </div>
        )}
    </AppLayout>
  )
}
