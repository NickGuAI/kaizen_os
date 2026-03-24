import { describe, expect, it } from 'vitest'
import { buildSeasonReviewSnapshot } from '@/server/utils/seasonReviewSnapshot'

describe('buildSeasonReviewSnapshot', () => {
  it('captures reviewed cards and stable summary counts', () => {
    const snapshot = buildSeasonReviewSnapshot({
      submissionId: 'submission-1',
      capturedAt: new Date('2026-03-23T15:21:09.000Z'),
      season: {
        id: 'season-1',
        name: 'S1 2026',
        startDate: new Date('2025-12-29T00:00:00.000Z'),
        durationWeeks: 12,
        utilityRate: 90,
        isActive: true,
      },
      reviewedCards: [
        {
          cardId: 'card-1',
          title: 'Close founder role search',
          unitType: 'ACTION_GATE',
          statusBefore: 'in_progress',
          statusAfter: 'completed',
          seasonId: null,
          startDate: new Date('2026-01-05T00:00:00.000Z'),
          targetDate: new Date('2026-03-01T00:00:00.000Z'),
          completionDateBefore: null,
          completionDateAfter: new Date('2026-03-23T15:21:09.000Z'),
          overallPassed: true,
          notes: 'Closed during review',
          markComplete: true,
          results: [
            { criterion: 'criterion-a', passed: true },
          ],
        },
        {
          cardId: 'card-2',
          title: 'Ship product experiment',
          unitType: 'ACTION_EXPERIMENT',
          statusBefore: 'in_progress',
          statusAfter: 'in_progress',
          seasonId: null,
          startDate: new Date('2026-01-10T00:00:00.000Z'),
          targetDate: new Date('2026-03-10T00:00:00.000Z'),
          completionDateBefore: null,
          completionDateAfter: null,
          overallPassed: false,
          notes: null,
          markComplete: false,
          results: [
            { criterion: 'criterion-b', passed: false },
          ],
        },
      ],
    })

    expect(snapshot.summary).toEqual({
      reviewedCount: 2,
      passedCount: 1,
      failedCount: 1,
      markedCompleteCount: 1,
      byType: {
        ACTION_GATE: 1,
        ACTION_EXPERIMENT: 1,
        ACTION_ROUTINE: 0,
        ACTION_OPS: 0,
      },
      statusBefore: {
        not_started: 0,
        in_progress: 2,
        completed: 0,
        backlog: 0,
      },
      statusAfter: {
        not_started: 0,
        in_progress: 1,
        completed: 1,
        backlog: 0,
      },
    })

    expect(snapshot.reviewedCards[0]).toEqual(
      expect.objectContaining({
        cardId: 'card-1',
        statusBefore: 'in_progress',
        statusAfter: 'completed',
        markComplete: true,
      })
    )
    expect(snapshot.reviewedCards[1]).toEqual(
      expect.objectContaining({
        cardId: 'card-2',
        statusBefore: 'in_progress',
        statusAfter: 'in_progress',
        markComplete: false,
      })
    )
  })
})
