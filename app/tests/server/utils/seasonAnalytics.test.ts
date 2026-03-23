import { describe, expect, it } from 'vitest'
import { buildSeasonAnalytics } from '@/server/utils/seasonAnalytics'

describe('buildSeasonAnalytics', () => {
  it('attributes cards to a season from events and dates when seasonId is null', () => {
    const seasons = [
      {
        id: 'season-1',
        name: 'S1 2026',
        startDate: new Date('2025-12-29T00:00:00.000Z'),
        durationWeeks: 12,
        utilityRate: 90,
        isActive: false,
      },
      {
        id: 'season-2',
        name: 'S2 2026',
        startDate: new Date('2026-03-29T00:00:00.000Z'),
        durationWeeks: 12,
        utilityRate: 98,
        isActive: false,
      },
    ]

    const cards = [
      {
        id: 'gate-1',
        unitType: 'ACTION_GATE' as const,
        status: 'completed' as const,
        seasonId: null,
        createdAt: new Date('2026-01-05T00:00:00.000Z'),
        startDate: null,
        targetDate: null,
        completionDate: null,
      },
      {
        id: 'exp-1',
        unitType: 'ACTION_EXPERIMENT' as const,
        status: 'completed' as const,
        seasonId: null,
        createdAt: new Date('2026-01-10T00:00:00.000Z'),
        startDate: null,
        targetDate: null,
        completionDate: null,
      },
      {
        id: 'routine-1',
        unitType: 'ACTION_ROUTINE' as const,
        status: 'in_progress' as const,
        seasonId: null,
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
        startDate: null,
        targetDate: null,
        completionDate: null,
      },
      {
        id: 'ops-1',
        unitType: 'ACTION_OPS' as const,
        status: 'not_started' as const,
        seasonId: null,
        createdAt: new Date('2026-02-15T00:00:00.000Z'),
        startDate: null,
        targetDate: null,
        completionDate: null,
      },
    ]

    const events = [
      {
        cardId: 'gate-1',
        eventType: 'gate_completed' as const,
        occurredAt: new Date('2026-03-23T15:21:09.132Z'),
        payload: { season_id: 'season-1' },
      },
      {
        cardId: 'exp-1',
        eventType: 'experiment_completed' as const,
        occurredAt: new Date('2026-03-23T15:21:08.959Z'),
        payload: { season_id: 'season-1' },
      },
      {
        cardId: 'routine-1',
        eventType: 'time_logged' as const,
        occurredAt: new Date('2026-03-10T12:00:00.000Z'),
        payload: {},
      },
      {
        cardId: 'ops-1',
        eventType: 'time_logged' as const,
        occurredAt: new Date('2026-03-12T09:00:00.000Z'),
        payload: {},
      },
    ]

    const analytics = buildSeasonAnalytics(seasons, cards, events)

    expect(analytics).toEqual([
      expect.objectContaining({
        id: 'season-1',
        totalCards: 4,
        completed: 2,
        inProgress: 2,
        completionRate: 50,
        byType: {
          ACTION_GATE: 1,
          ACTION_EXPERIMENT: 1,
          ACTION_ROUTINE: 1,
          ACTION_OPS: 1,
        },
      }),
      expect.objectContaining({
        id: 'season-2',
        totalCards: 0,
        completed: 0,
        inProgress: 0,
        completionRate: 0,
        byType: {
          ACTION_GATE: 0,
          ACTION_EXPERIMENT: 0,
          ACTION_ROUTINE: 0,
          ACTION_OPS: 0,
        },
      }),
    ])
  })
})
