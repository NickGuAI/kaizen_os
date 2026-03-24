import { z } from 'zod'
import { DateTime } from 'luxon'
import prisma from '../../lib/db'
import { GoogleTasksAdapter } from '../../services/workitems/adapters/GoogleTasksAdapter'
import { getProviderForAccount } from '../../services/calendar/providerFactory'

export type ToolScope = 'read' | 'write' | 'delete'
export type ToolServerName = 'kaizen-db' | 'workitems' | 'calendar'

export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>
}

export type ToolInput = Record<string, z.ZodTypeAny>

export interface ToolDefinition {
  server: ToolServerName
  name: string
  description: string
  scope: ToolScope
  input: ToolInput
  handler: (args: Record<string, unknown>) => Promise<ToolResult>
}

export interface ToolContext {
  userId: string
  sessionId?: string
  checkpointUuid?: string
  allowedTools?: string[]
}

export interface WorkitemToolContext {
  userId: string
  provider: 'google_tasks'
  allowedTools?: string[]
}

export interface CalendarToolContext {
  userId: string
  userTimezone?: string
  allowedTools?: string[]
  deleteEnabled?: boolean
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}

function getErrorCode(error: unknown): unknown {
  if (typeof error === 'object' && error && 'code' in error) {
    return (error as { code?: unknown }).code
  }

  return undefined
}

function filterByAllowedTools(tools: ToolDefinition[], allowedTools?: string[]): ToolDefinition[] {
  if (!allowedTools || allowedTools.length === 0) {
    return tools
  }

  return tools.filter(tool => allowedTools.includes(tool.name))
}

function buildToolIndex(tools: ToolDefinition[]): Record<string, ToolDefinition> {
  return tools.reduce<Record<string, ToolDefinition>>((acc, tool) => {
    acc[tool.name] = tool
    return acc
  }, {})
}

export function validateToolArgs(tool: ToolDefinition, args: unknown): Record<string, unknown> {
  return z.object(tool.input).parse(args ?? {})
}

export interface ToolRegistryBuildResult {
  byServer: Partial<Record<ToolServerName, Record<string, ToolDefinition>>>
  listByServer: Partial<Record<ToolServerName, ToolDefinition[]>>
}

export function buildToolRegistry(params: {
  kaizenDb: ToolContext
  workitems?: WorkitemToolContext | null
  calendar?: CalendarToolContext | null
}): ToolRegistryBuildResult {
  const listByServer: Partial<Record<ToolServerName, ToolDefinition[]>> = {
    'kaizen-db': getKaizenDbToolDefinitions(params.kaizenDb),
  }

  if (params.workitems) {
    listByServer.workitems = getWorkitemToolDefinitions(params.workitems)
  }

  if (params.calendar) {
    listByServer.calendar = getCalendarToolDefinitions(params.calendar)
  }

  const byServer = Object.entries(listByServer).reduce<Partial<Record<ToolServerName, Record<string, ToolDefinition>>>>(
    (acc, [server, tools]) => {
      if (!tools || tools.length === 0) {
        return acc
      }
      acc[server as ToolServerName] = buildToolIndex(tools)
      return acc
    },
    {}
  )

  return {
    byServer,
    listByServer,
  }
}

export function getKaizenDbToolDefinitions(context: ToolContext): ToolDefinition[] {
  const allTools: ToolDefinition[] = [
    {
      server: 'kaizen-db',
      name: 'list_cards',
      description: 'List cards with optional filters',
      scope: 'read',
      input: {
        unitType: z.enum(['THEME', 'ACTION_GATE', 'ACTION_EXPERIMENT', 'ACTION_ROUTINE', 'ACTION_OPS', 'VETO']).optional(),
        parentId: z.string().optional(),
        status: z.enum(['not_started', 'in_progress', 'completed', 'backlog']).optional(),
        limit: z.number().default(20),
      },
      handler: async (rawArgs) => {
        const args = z.object({
          unitType: z.enum(['THEME', 'ACTION_GATE', 'ACTION_EXPERIMENT', 'ACTION_ROUTINE', 'ACTION_OPS', 'VETO']).optional(),
          parentId: z.string().optional(),
          status: z.enum(['not_started', 'in_progress', 'completed', 'backlog']).optional(),
          limit: z.number().default(20),
        }).parse(rawArgs)

        const cards = await prisma.card.findMany({
          where: {
            userId: context.userId,
            ...(args.unitType && { unitType: args.unitType }),
            ...(args.parentId && { parentId: args.parentId }),
            ...(args.status && { status: args.status }),
          },
          take: args.limit,
          orderBy: { updatedAt: 'desc' },
        })

        return { content: [{ type: 'text', text: JSON.stringify(cards, null, 2) }] }
      },
    },
    {
      server: 'kaizen-db',
      name: 'get_card',
      description: 'Get a card by ID with its children',
      scope: 'read',
      input: {
        cardId: z.string(),
      },
      handler: async (rawArgs) => {
        const args = z.object({ cardId: z.string() }).parse(rawArgs)
        const card = await prisma.card.findFirst({
          where: { id: args.cardId, userId: context.userId },
          include: { children: true },
        })

        if (!card) {
          return { content: [{ type: 'text', text: 'Card not found' }] }
        }

        return { content: [{ type: 'text', text: JSON.stringify(card, null, 2) }] }
      },
    },
    {
      server: 'kaizen-db',
      name: 'create_card',
      description: 'Create a new card. For criteria, use the criteria array field on ACTION_* cards instead of creating separate CRITERIA cards.',
      scope: 'write',
      input: {
        title: z.string(),
        unitType: z.enum(['THEME', 'ACTION_GATE', 'ACTION_EXPERIMENT', 'ACTION_ROUTINE', 'ACTION_OPS', 'VETO']),
        parentId: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(['not_started', 'in_progress', 'completed', 'backlog']).default('not_started'),
        criteria: z.array(z.string()).optional().describe('Array of criterion strings for ACTION_* cards'),
      },
      handler: async (rawArgs) => {
        const args = z.object({
          title: z.string(),
          unitType: z.enum(['THEME', 'ACTION_GATE', 'ACTION_EXPERIMENT', 'ACTION_ROUTINE', 'ACTION_OPS', 'VETO']),
          parentId: z.string().optional(),
          description: z.string().optional(),
          status: z.enum(['not_started', 'in_progress', 'completed', 'backlog']).default('not_started'),
          criteria: z.array(z.string()).optional(),
        }).parse(rawArgs)

        const card = await prisma.card.create({
          data: {
            userId: context.userId,
            title: args.title,
            unitType: args.unitType,
            parentId: args.parentId,
            description: args.description,
            status: args.status,
            criteria: args.criteria ?? [],
          },
        })

        if (context.sessionId) {
          await prisma.event.create({
            data: {
              userId: context.userId,
              eventType: 'agent_mutation',
              cardId: card.id,
              payload: {
                operation: 'create',
                after: card,
                agentSessionId: context.sessionId,
                checkpointUuid: context.checkpointUuid,
              },
            },
          })
        }

        return { content: [{ type: 'text', text: `Created card ${card.id}: ${card.title}` }] }
      },
    },
    {
      server: 'kaizen-db',
      name: 'update_card',
      description: "Update a card's properties. Use criteria array to set/update criteria for ACTION_* cards. Use parentId to move a card to a different parent (or null for root level).",
      scope: 'write',
      input: {
        cardId: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(['not_started', 'in_progress', 'completed', 'backlog']).optional(),
        targetDate: z.string().optional(),
        criteria: z.array(z.string()).optional().describe('Array of criterion strings for ACTION_* cards'),
        parentId: z.string().nullable().optional().describe('Parent card ID, or null to move to root level'),
      },
      handler: async (rawArgs) => {
        const args = z.object({
          cardId: z.string(),
          title: z.string().optional(),
          description: z.string().optional(),
          status: z.enum(['not_started', 'in_progress', 'completed', 'backlog']).optional(),
          targetDate: z.string().optional(),
          criteria: z.array(z.string()).optional(),
          parentId: z.string().nullable().optional(),
        }).parse(rawArgs)

        const { cardId, ...updates } = args
        const before = await prisma.card.findFirst({
          where: { id: cardId, userId: context.userId },
        })

        if (!before) {
          return { content: [{ type: 'text', text: 'Card not found' }] }
        }

        const after = await prisma.card.update({
          where: { id: cardId },
          data: {
            ...(updates.title && { title: updates.title }),
            ...(updates.description !== undefined && { description: updates.description }),
            ...(updates.status && { status: updates.status }),
            ...(updates.targetDate && { targetDate: new Date(updates.targetDate) }),
            ...(updates.criteria !== undefined && { criteria: updates.criteria }),
            ...(updates.parentId !== undefined && { parentId: updates.parentId }),
          },
        })

        if (context.sessionId) {
          await prisma.event.create({
            data: {
              userId: context.userId,
              eventType: 'agent_mutation',
              cardId,
              payload: {
                operation: 'update',
                before,
                after,
                agentSessionId: context.sessionId,
                checkpointUuid: context.checkpointUuid,
              },
            },
          })
        }

        return { content: [{ type: 'text', text: `Updated card ${cardId}` }] }
      },
    },
    {
      server: 'kaizen-db',
      name: 'delete_card',
      description: 'Delete a card (must have no children)',
      scope: 'delete',
      input: {
        cardId: z.string(),
      },
      handler: async (rawArgs) => {
        const args = z.object({ cardId: z.string() }).parse(rawArgs)
        const card = await prisma.card.findFirst({
          where: { id: args.cardId, userId: context.userId },
          include: { children: true },
        })

        if (!card) {
          return { content: [{ type: 'text', text: 'Card not found' }] }
        }

        if (card.children.length > 0) {
          return { content: [{ type: 'text', text: 'Cannot delete card with children' }] }
        }

        await prisma.card.delete({ where: { id: args.cardId } })

        if (context.sessionId) {
          await prisma.event.create({
            data: {
              userId: context.userId,
              eventType: 'agent_mutation',
              cardId: args.cardId,
              payload: {
                operation: 'delete',
                before: card,
                agentSessionId: context.sessionId,
                checkpointUuid: context.checkpointUuid,
              },
            },
          })
        }

        return { content: [{ type: 'text', text: `Deleted card ${args.cardId}` }] }
      },
    },
    {
      server: 'kaizen-db',
      name: 'get_active_season',
      description: 'Get the current active season',
      scope: 'read',
      input: {},
      handler: async () => {
        const season = await prisma.season.findFirst({
          where: { userId: context.userId, isActive: true },
        })
        return { content: [{ type: 'text', text: JSON.stringify(season, null, 2) }] }
      },
    },
    {
      server: 'kaizen-db',
      name: 'get_recent_events',
      description: 'Get recent events for the user',
      scope: 'read',
      input: {
        limit: z.number().default(10),
      },
      handler: async (rawArgs) => {
        const args = z.object({ limit: z.number().default(10) }).parse(rawArgs)
        const events = await prisma.event.findMany({
          where: { userId: context.userId },
          orderBy: { occurredAt: 'desc' },
          take: args.limit,
        })

        return { content: [{ type: 'text', text: JSON.stringify(events, null, 2) }] }
      },
    },
    {
      server: 'kaizen-db',
      name: 'list_cached_calendar_events',
      description: 'List deduplicated cached calendar events for a given week start (YYYY-MM-DD)',
      scope: 'read',
      input: {
        weekStart: z.string().describe('Week start date in YYYY-MM-DD format'),
      },
      handler: async (rawArgs) => {
        const args = z.object({
          weekStart: z.string().describe('Week start date in YYYY-MM-DD format'),
        }).parse(rawArgs)

        const user = await prisma.user.findUnique({
          where: { id: context.userId },
          select: { timezone: true },
        })
        const timezone = user?.timezone || 'America/Los_Angeles'
        const weekStartDt = DateTime.fromISO(args.weekStart, { zone: timezone })
        if (!weekStartDt.isValid) {
          return { content: [{ type: 'text', text: 'Invalid weekStart date. Use YYYY-MM-DD.' }] }
        }

        const start = weekStartDt.startOf('day')
        const end = start.plus({ days: 7 })
        const startDate = start.toJSDate()
        const endDate = end.toJSDate()

        const accounts = await prisma.calendarAccount.findMany({
          where: { userId: context.userId },
          select: { id: true, selectedCalendarIds: true },
        })

        if (accounts.length === 0) {
          return { content: [{ type: 'text', text: 'No calendar accounts connected. Ask the user to connect or refresh their calendar.' }] }
        }

        const allowedCalendarKeys = new Set<string>()
        for (const account of accounts) {
          const selectedCalendars = (account.selectedCalendarIds || ['primary']) as string[]
          for (const calendarId of selectedCalendars) {
            allowedCalendarKeys.add(`${account.id}:${calendarId}`)
          }
        }

        const cachedEvents = await prisma.cachedCalendarEvent.findMany({
          where: {
            userId: context.userId,
            startDateTime: { lt: endDate },
            endDateTime: { gt: startDate },
          },
          orderBy: { startDateTime: 'asc' },
        })

        const filteredEvents = cachedEvents.filter(event =>
          allowedCalendarKeys.has(`${event.accountId}:${event.calendarId}`)
        )

        if (filteredEvents.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No cached events found for week starting ${args.weekStart}. Ask the user to refresh their calendar.`,
            }],
          }
        }

        const seen = new Map<string, typeof filteredEvents[number]>()
        for (const event of filteredEvents) {
          const startIso = event.startDateTime.toISOString()
          const dedupeKey = event.iCalUID
            ? `${event.iCalUID}|${startIso}`
            : `${event.summary || ''}|${startIso}`
          if (!seen.has(dedupeKey)) {
            seen.set(dedupeKey, event)
          }
        }

        const dedupedEvents = Array.from(seen.values())
          .map(event => ({
            eventId: event.eventId,
            summary: event.summary,
            description: event.description,
            location: event.location,
            startDateTime: event.startDateTime.toISOString(),
            endDateTime: event.endDateTime.toISOString(),
            isAllDay: event.isAllDay,
            htmlLink: event.htmlLink,
            recurringEventId: event.recurringEventId,
            iCalUID: event.iCalUID,
            calendarId: event.calendarId,
            accountId: event.accountId,
          }))
          .sort((a, b) => a.startDateTime.localeCompare(b.startDateTime))

        return { content: [{ type: 'text', text: JSON.stringify(dedupedEvents, null, 2) }] }
      },
    },
  ]

  return filterByAllowedTools(allTools, context.allowedTools)
}

export function getWorkitemToolDefinitions(context: WorkitemToolContext): ToolDefinition[] {
  const adapter = new GoogleTasksAdapter()

  const allTools: ToolDefinition[] = [
    {
      server: 'workitems',
      name: 'list_workitems',
      description: 'List tasks/workitems from the configured provider (Google Tasks) within a date range',
      scope: 'read',
      input: {
        startDate: z.string().describe('Start date in ISO format (e.g., 2026-01-12)'),
        endDate: z.string().describe('End date in ISO format (e.g., 2026-01-12)'),
        accountId: z.string().optional().describe('Optional: specific account ID to query'),
      },
      handler: async (rawArgs) => {
        const args = z.object({
          startDate: z.string(),
          endDate: z.string(),
          accountId: z.string().optional(),
        }).parse(rawArgs)

        try {
          const items = await adapter.listForRange({
            userId: context.userId,
            startIso: new Date(args.startDate).toISOString(),
            endIso: new Date(args.endDate).toISOString(),
            accountId: args.accountId,
          })

          const summary = items.map(item => ({
            key: item.key,
            title: item.title,
            status: item.status,
            dueAt: item.dueAt,
            completedAt: item.completedAt,
          }))

          return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] }
        } catch (error) {
          return { content: [{ type: 'text', text: `Error listing workitems: ${getErrorMessage(error)}` }] }
        }
      },
    },
    {
      server: 'workitems',
      name: 'get_workitem',
      description: 'Get a specific task by its key (format: gtasks:accountId:tasklistId:taskId)',
      scope: 'read',
      input: {
        key: z.string().describe('Workitem key (e.g., gtasks:abc123:list1:task1)'),
      },
      handler: async (rawArgs) => {
        const args = z.object({ key: z.string() }).parse(rawArgs)

        try {
          const items = await adapter.listByKeys(context.userId, [args.key])
          if (items.length === 0) {
            return { content: [{ type: 'text', text: 'Workitem not found' }] }
          }
          return { content: [{ type: 'text', text: JSON.stringify(items[0], null, 2) }] }
        } catch (error) {
          return { content: [{ type: 'text', text: `Error getting workitem: ${getErrorMessage(error)}` }] }
        }
      },
    },
    {
      server: 'workitems',
      name: 'complete_workitem',
      description: 'Mark a task as completed',
      scope: 'write',
      input: {
        key: z.string().describe('Workitem key to complete'),
      },
      handler: async (rawArgs) => {
        const args = z.object({ key: z.string() }).parse(rawArgs)

        try {
          await adapter.complete(args.key)
          return { content: [{ type: 'text', text: `Completed workitem: ${args.key}` }] }
        } catch (error) {
          return { content: [{ type: 'text', text: `Error completing workitem: ${getErrorMessage(error)}` }] }
        }
      },
    },
    {
      server: 'workitems',
      name: 'create_workitem',
      description: 'Create a new task in Google Tasks',
      scope: 'write',
      input: {
        title: z.string().describe('Task title'),
        dueDate: z.string().optional().describe('Due date in ISO format (e.g., 2026-01-15)'),
        notes: z.string().optional().describe('Task notes/description'),
      },
      handler: async (rawArgs) => {
        const args = z.object({
          title: z.string(),
          dueDate: z.string().optional(),
          notes: z.string().optional(),
        }).parse(rawArgs)

        try {
          const item = await adapter.create(context.userId, {
            title: args.title,
            dueAt: args.dueDate ? new Date(args.dueDate).toISOString() : undefined,
            notes: args.notes,
          })
          return { content: [{ type: 'text', text: `Created task: ${item.title} (key: ${item.key})` }] }
        } catch (error) {
          return { content: [{ type: 'text', text: `Error creating workitem: ${getErrorMessage(error)}` }] }
        }
      },
    },
  ]

  return filterByAllowedTools(allTools, context.allowedTools)
}

export function getCalendarToolDefinitions(context: CalendarToolContext): ToolDefinition[] {
  const allTools: ToolDefinition[] = [
    {
      server: 'calendar',
      name: 'create_calendar_event',
      description: "Create a new event on the user's write calendar",
      scope: 'write',
      input: {
        summary: z.string().describe('Event title'),
        description: z.string().optional().describe('Event description'),
        location: z.string().optional().describe('Event location'),
        start: z.string().describe('Start time in ISO 8601 format (e.g., 2024-01-15T14:00:00-08:00)'),
        end: z.string().describe('End time in ISO 8601 format. For all-day events, use the day AFTER the last day (Google Calendar uses exclusive end dates). E.g., for a single-day event on Jan 15, use end="2024-01-16"'),
        isAllDay: z.boolean().optional().default(false).describe('Whether this is an all-day event'),
      },
      handler: async (rawArgs) => {
        const args = z.object({
          summary: z.string(),
          description: z.string().optional(),
          location: z.string().optional(),
          start: z.string(),
          end: z.string(),
          isAllDay: z.boolean().optional().default(false),
        }).parse(rawArgs)

        const account = await prisma.calendarAccount.findFirst({
          where: {
            userId: context.userId,
            writeCalendarId: { not: null },
          },
        })

        if (!account || !account.writeCalendarId) {
          return {
            content: [{
              type: 'text',
              text: 'No write calendar configured. Ask the user to set a write calendar in their calendar settings.',
            }],
          }
        }

        try {
          const provider = await getProviderForAccount(account.id)
          const timezone = context.userTimezone || 'America/Los_Angeles'

          const eventInput = args.isAllDay
            ? {
                summary: args.summary,
                description: args.description,
                location: args.location,
                start: { date: args.start.split('T')[0] },
                end: { date: args.end.split('T')[0] },
              }
            : {
                summary: args.summary,
                description: args.description,
                location: args.location,
                start: { dateTime: args.start, timeZone: timezone },
                end: { dateTime: args.end, timeZone: timezone },
              }

          const event = await provider.createEvent(
            account.id,
            account.writeCalendarId,
            eventInput
          )

          return {
            content: [{
              type: 'text',
              text: `Created event "${event.summary}" (ID: ${event.id}).\nTime: ${args.start} to ${args.end}${args.location ? `\nLocation: ${args.location}` : ''}`,
            }],
          }
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Failed to create event: ${getErrorMessage(error)}`,
            }],
          }
        }
      },
    },
    {
      server: 'calendar',
      name: 'update_calendar_event',
      description: 'Update an existing calendar event',
      scope: 'write',
      input: {
        accountId: z.string().describe('Calendar account ID'),
        calendarId: z.string().describe('Calendar ID'),
        eventId: z.string().describe('Event ID to update'),
        summary: z.string().optional().describe('New event title'),
        description: z.string().optional().describe('New event description'),
        location: z.string().optional().describe('New event location'),
        start: z.string().optional().describe('New start time in ISO 8601 format'),
        end: z.string().optional().describe('New end time in ISO 8601 format. For all-day events, use the day AFTER the last day (exclusive end date)'),
        isAllDay: z.boolean().optional().describe('Set to true if updating to/from an all-day event. Required when changing start/end of all-day events'),
      },
      handler: async (rawArgs) => {
        const args = z.object({
          accountId: z.string(),
          calendarId: z.string(),
          eventId: z.string(),
          summary: z.string().optional(),
          description: z.string().optional(),
          location: z.string().optional(),
          start: z.string().optional(),
          end: z.string().optional(),
          isAllDay: z.boolean().optional(),
        }).parse(rawArgs)

        const account = await prisma.calendarAccount.findFirst({
          where: { id: args.accountId, userId: context.userId },
        })

        if (!account) {
          return {
            content: [{
              type: 'text',
              text: 'Account not found or unauthorized.',
            }],
          }
        }

        const selectedCalendars = (account.selectedCalendarIds || ['primary']) as string[]
        if (!selectedCalendars.includes(args.calendarId)) {
          return {
            content: [{
              type: 'text',
              text: 'Calendar not authorized. The specified calendar is not in your selected calendars.',
            }],
          }
        }

        try {
          const provider = await getProviderForAccount(args.accountId)
          const timezone = context.userTimezone || 'America/Los_Angeles'
          const patch: Record<string, unknown> = {}
          if (args.summary) patch.summary = args.summary
          if (args.description !== undefined) patch.description = args.description
          if (args.location !== undefined) patch.location = args.location
          if (args.start) {
            patch.start = args.isAllDay
              ? { date: args.start.split('T')[0] }
              : { dateTime: args.start, timeZone: timezone }
          }
          if (args.end) {
            patch.end = args.isAllDay
              ? { date: args.end.split('T')[0] }
              : { dateTime: args.end, timeZone: timezone }
          }

          const event = await provider.patchEvent(
            args.accountId,
            args.calendarId,
            args.eventId,
            patch
          )

          return {
            content: [{
              type: 'text',
              text: `Updated event "${event.summary}" (ID: ${event.id}).`,
            }],
          }
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Failed to update event: ${getErrorMessage(error)}`,
            }],
          }
        }
      },
    },
    {
      server: 'calendar',
      name: 'delete_calendar_event',
      description: 'Permanently delete a calendar event. This action CANNOT be undone.',
      scope: 'delete',
      input: {
        accountId: z.string().describe('Calendar account ID'),
        calendarId: z.string().describe('Calendar ID'),
        eventId: z.string().describe('Event ID to delete'),
      },
      handler: async (rawArgs) => {
        const args = z.object({
          accountId: z.string(),
          calendarId: z.string(),
          eventId: z.string(),
        }).parse(rawArgs)

        if (!context.deleteEnabled) {
          return {
            content: [{
              type: 'text',
              text: 'Calendar event deletion is not enabled. The user must explicitly enable this destructive action in Settings > Advanced > Calendar Tools.',
            }],
          }
        }

        const account = await prisma.calendarAccount.findFirst({
          where: { id: args.accountId, userId: context.userId },
        })

        if (!account) {
          return {
            content: [{
              type: 'text',
              text: 'Account not found or unauthorized.',
            }],
          }
        }

        const selectedCalendars = (account.selectedCalendarIds || ['primary']) as string[]
        if (!selectedCalendars.includes(args.calendarId)) {
          return {
            content: [{
              type: 'text',
              text: 'Calendar not authorized. The specified calendar is not in your selected calendars.',
            }],
          }
        }

        try {
          const provider = await getProviderForAccount(args.accountId)
          const event = await provider.getEvent(args.accountId, args.calendarId, args.eventId)
          const eventSummary = event?.summary || 'Unknown event'

          console.log(`[AUDIT] Agent calendar delete: userId=${context.userId}, accountId=${args.accountId}, calendarId=${args.calendarId}, eventId=${args.eventId}, summary="${eventSummary}"`)

          await provider.deleteEvent(args.accountId, args.calendarId, args.eventId)

          await prisma.cachedCalendarEvent.deleteMany({
            where: {
              userId: context.userId,
              accountId: args.accountId,
              calendarId: args.calendarId,
              eventId: args.eventId,
            },
          })

          return {
            content: [{
              type: 'text',
              text: `Deleted event "${eventSummary}" (ID: ${args.eventId}). This action cannot be undone.`,
            }],
          }
        } catch (error) {
          if (getErrorCode(error) === 404) {
            return {
              content: [{
                type: 'text',
                text: 'Event not found. It may have already been deleted.',
              }],
            }
          }

          return {
            content: [{
              type: 'text',
              text: `Failed to delete event: ${getErrorMessage(error)}`,
            }],
          }
        }
      },
    },
  ]

  const filteredByDeleteFlag = allTools.filter(tool => (
    tool.name !== 'delete_calendar_event' || !!context.deleteEnabled
  ))

  return filterByAllowedTools(filteredByDeleteFlag, context.allowedTools)
}
