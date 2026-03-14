export type SunsetCommand =
  | { kind: 'task.create'; title: string; dueDate?: string }
  | { kind: 'task.complete'; workItemKey: string }
  | { kind: 'task.move'; workItemKey: string; date: string }
  | { kind: 'task.park'; workItemKey: string }
  | { kind: 'calendar.focus'; date: string }

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function cleanInput(input: string): string {
  return input.trim().replace(/\s+/g, ' ')
}

function isLocalDate(value: string): boolean {
  return LOCAL_DATE_PATTERN.test(value)
}

export function parseSunsetCommand(input: string): SunsetCommand | null {
  const normalized = cleanInput(input)
  if (!normalized) return null

  const createMatch = normalized.match(/^\/?task\s+(?:create|add)\s+(.+)$/i)
  if (createMatch) {
    const body = createMatch[1]?.trim()
    if (!body) return null

    const datedBody = body.match(/^(.*)\s+(?:on|for)\s+(\d{4}-\d{2}-\d{2})$/i)
    if (datedBody && datedBody[1] && datedBody[2] && isLocalDate(datedBody[2])) {
      const title = datedBody[1].trim()
      if (!title) return null
      return {
        kind: 'task.create',
        title,
        dueDate: datedBody[2],
      }
    }

    return {
      kind: 'task.create',
      title: body,
    }
  }

  const completeMatch = normalized.match(/^\/?task\s+(?:complete|done)\s+(\S+)$/i)
  if (completeMatch) {
    return {
      kind: 'task.complete',
      workItemKey: completeMatch[1]!,
    }
  }

  const moveMatch = normalized.match(/^\/?task\s+move\s+(\S+)\s+(?:to\s+)?(\d{4}-\d{2}-\d{2})$/i)
  if (moveMatch && isLocalDate(moveMatch[2]!)) {
    return {
      kind: 'task.move',
      workItemKey: moveMatch[1]!,
      date: moveMatch[2]!,
    }
  }

  const parkMatch = normalized.match(/^\/?task\s+park\s+(\S+)$/i)
  if (parkMatch) {
    return {
      kind: 'task.park',
      workItemKey: parkMatch[1]!,
    }
  }

  const calendarMatch = normalized.match(/^\/?calendar\s+(?:day|date|goto|go)\s+(\d{4}-\d{2}-\d{2})$/i)
  if (calendarMatch && isLocalDate(calendarMatch[1]!)) {
    return {
      kind: 'calendar.focus',
      date: calendarMatch[1]!,
    }
  }

  return null
}

export interface SunsetInvalidateHints {
  parking?: boolean
  workitemDates?: string[]
  calendarDates?: string[]
}

export interface SunsetExecuteResponse {
  mode: 'sunset'
  sessionId: string
  command: {
    kind: SunsetCommand['kind']
    raw: string
  }
  receipt: {
    id: string
    at: string
    undoSupported: boolean
    invalidate: SunsetInvalidateHints
  }
  response: {
    message: string
    navigation?: {
      plannerDate?: string
    }
    data?: Record<string, unknown>
  }
}

export function formatSunsetResponseMessage(payload: SunsetExecuteResponse): string {
  const lines = [payload.response.message]

  if (payload.receipt.undoSupported) {
    lines.push('', `Receipt: ${payload.receipt.id} (undo supported)`)
    return lines.join('\n')
  }

  lines.push('', `Receipt: ${payload.receipt.id}`)
  return lines.join('\n')
}
