import { describe, expect, it } from 'vitest'
import { formatSunsetResponseMessage, parseSunsetCommand, type SunsetExecuteResponse } from '../src/lib/sunsetCommands'

describe('sunset command parser', () => {
  it('parses task create command', () => {
    expect(parseSunsetCommand('/task create Ship release notes')).toEqual({
      kind: 'task.create',
      title: 'Ship release notes',
    })
  })

  it('parses task create with date suffix', () => {
    expect(parseSunsetCommand('task add Write recap for 2026-03-20')).toEqual({
      kind: 'task.create',
      title: 'Write recap',
      dueDate: '2026-03-20',
    })
  })

  it('parses complete/move/park/calendar commands', () => {
    expect(parseSunsetCommand('/task complete gtasks:acc:list:item')).toEqual({
      kind: 'task.complete',
      workItemKey: 'gtasks:acc:list:item',
    })

    expect(parseSunsetCommand('/task move gtasks:acc:list:item to 2026-03-21')).toEqual({
      kind: 'task.move',
      workItemKey: 'gtasks:acc:list:item',
      date: '2026-03-21',
    })

    expect(parseSunsetCommand('/task park gtasks:acc:list:item')).toEqual({
      kind: 'task.park',
      workItemKey: 'gtasks:acc:list:item',
    })

    expect(parseSunsetCommand('/calendar day 2026-03-22')).toEqual({
      kind: 'calendar.focus',
      date: '2026-03-22',
    })
  })

  it('keeps natural language prompts on the SSE path', () => {
    expect(parseSunsetCommand('can you summarize today and help me prioritize?')).toBeNull()
  })
})

describe('sunset response formatting', () => {
  it('prints a receipt line', () => {
    const payload: SunsetExecuteResponse = {
      mode: 'sunset',
      sessionId: 'session-1',
      command: {
        kind: 'task.park',
        raw: '/task park gtasks:acc:tasklist:task',
      },
      receipt: {
        id: 'sunset-123',
        at: '2026-03-14T00:00:00.000Z',
        undoSupported: false,
        invalidate: {
          parking: true,
          workitemDates: [],
          calendarDates: [],
        },
      },
      response: {
        message: 'Moved gtasks:acc:tasklist:task to Parking Lot.',
      },
    }

    expect(formatSunsetResponseMessage(payload)).toContain('Receipt: sunset-123')
  })
})
