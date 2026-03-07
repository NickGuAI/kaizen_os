import { describe, it, expect } from 'vitest'
import { getSeasonReviewAvailability } from '../../src/utils/seasonReviewUtils'

const season = {
  startDate: '2026-01-01T00:00:00.000Z',
  durationWeeks: 12,
}

describe('getSeasonReviewAvailability', () => {
  it('stays locked before 40% progress', () => {
    const availability = getSeasonReviewAvailability(season, new Date('2026-02-03T00:00:00.000Z')) // day 33

    expect(availability.progressPercent).toBe(39)
    expect(availability.availableType).toBeNull()
    expect(availability.remainingUnlockPercent).toBe(1)
  })

  it('unlocks mid-season review at 40% progress', () => {
    const availability = getSeasonReviewAvailability(season, new Date('2026-02-04T00:00:00.000Z')) // day 34

    expect(availability.progressPercent).toBe(40)
    expect(availability.availableType).toBe('mid_season')
  })

  it('keeps mid-season review available after 40% until the last week', () => {
    const availability = getSeasonReviewAvailability(season, new Date('2026-03-09T00:00:00.000Z')) // day 67

    expect(availability.progressPercent).toBe(80)
    expect(availability.availableType).toBe('mid_season')
    expect(availability.isLastWeek).toBe(false)
  })

  it('switches to end-season review in the final week', () => {
    const availability = getSeasonReviewAvailability(season, new Date('2026-03-19T00:00:00.000Z')) // day 77

    expect(availability.progressPercent).toBe(92)
    expect(availability.availableType).toBe('end_season')
    expect(availability.isLastWeek).toBe(true)
  })

  it('keeps end-season review after the season end date', () => {
    const availability = getSeasonReviewAvailability(season, new Date('2026-04-15T00:00:00.000Z'))

    expect(availability.progressPercent).toBe(100)
    expect(availability.availableType).toBe('end_season')
  })
})
