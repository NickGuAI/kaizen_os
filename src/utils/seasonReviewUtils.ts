export type SeasonReviewType = 'mid_season' | 'end_season'

export interface SeasonReviewWindowInput {
  startDate: string | Date
  durationWeeks: number
}

export interface SeasonReviewAvailability {
  progressPercent: number
  unlockProgressPercent: number
  remainingUnlockPercent: number
  isUnlocked: boolean
  isLastWeek: boolean
  availableType: SeasonReviewType | null
}

const DAYS_PER_WEEK = 7
const MS_PER_DAY = 24 * 60 * 60 * 1000
export const MID_SEASON_REVIEW_UNLOCK_PERCENT = 40

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value)
}

export function getSeasonReviewAvailability(
  season: SeasonReviewWindowInput,
  now: Date = new Date()
): SeasonReviewAvailability {
  const totalDays = Math.max(1, Math.round(season.durationWeeks * DAYS_PER_WEEK))
  const startDate = toDate(season.startDate)

  const elapsedDaysRaw = Math.floor((now.getTime() - startDate.getTime()) / MS_PER_DAY)
  const elapsedDays = Math.max(0, Math.min(totalDays, elapsedDaysRaw))

  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)))
  const isUnlocked = progressPercent >= MID_SEASON_REVIEW_UNLOCK_PERCENT
  const isLastWeek = elapsedDays >= totalDays - DAYS_PER_WEEK

  const availableType: SeasonReviewType | null = !isUnlocked
    ? null
    : isLastWeek
      ? 'end_season'
      : 'mid_season'

  return {
    progressPercent,
    unlockProgressPercent: Math.min(100, Math.round((progressPercent / MID_SEASON_REVIEW_UNLOCK_PERCENT) * 100)),
    remainingUnlockPercent: Math.max(0, MID_SEASON_REVIEW_UNLOCK_PERCENT - progressPercent),
    isUnlocked,
    isLastWeek,
    availableType,
  }
}
