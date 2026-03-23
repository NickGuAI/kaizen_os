type ReviewStatus = 'not_started' | 'in_progress' | 'completed' | 'backlog'
type ReviewUnitType = 'ACTION_GATE' | 'ACTION_EXPERIMENT' | 'ACTION_ROUTINE' | 'ACTION_OPS'

export interface SeasonReviewSnapshotSeason {
  id: string
  name: string
  startDate: Date
  durationWeeks: number
  utilityRate: number
  isActive: boolean
}

export interface SeasonReviewSnapshotCard {
  cardId: string
  title: string
  unitType: ReviewUnitType
  statusBefore: ReviewStatus
  statusAfter: ReviewStatus
  seasonId: string | null
  startDate: Date | null
  targetDate: Date | null
  completionDateBefore: Date | null
  completionDateAfter: Date | null
  overallPassed: boolean
  notes: string | null
  markComplete: boolean
  results: Array<{ criterion: string; passed: boolean }>
}

export interface SeasonReviewSnapshot {
  schemaVersion: 1
  submissionId: string
  gradingType: 'end_season'
  capturedAt: string
  season: {
    id: string
    name: string
    startDate: string
    durationWeeks: number
    utilityRate: number
    isActive: boolean
  }
  summary: {
    reviewedCount: number
    passedCount: number
    failedCount: number
    markedCompleteCount: number
    byType: Record<ReviewUnitType, number>
    statusBefore: Record<ReviewStatus, number>
    statusAfter: Record<ReviewStatus, number>
  }
  reviewedCards: Array<{
    cardId: string
    title: string
    unitType: ReviewUnitType
    statusBefore: ReviewStatus
    statusAfter: ReviewStatus
    seasonId: string | null
    startDate: string | null
    targetDate: string | null
    completionDateBefore: string | null
    completionDateAfter: string | null
    overallPassed: boolean
    notes: string | null
    markComplete: boolean
    results: Array<{ criterion: string; passed: boolean }>
  }>
}

const REVIEW_STATUSES: ReviewStatus[] = ['not_started', 'in_progress', 'completed', 'backlog']
const REVIEW_UNIT_TYPES: ReviewUnitType[] = [
  'ACTION_GATE',
  'ACTION_EXPERIMENT',
  'ACTION_ROUTINE',
  'ACTION_OPS',
]

function countBy<T extends string>(values: T[], allValues: readonly T[]): Record<T, number> {
  return allValues.reduce<Record<T, number>>((acc, value) => {
    acc[value] = values.filter(candidate => candidate === value).length
    return acc
  }, {} as Record<T, number>)
}

export function buildSeasonReviewSnapshot(input: {
  submissionId: string
  season: SeasonReviewSnapshotSeason
  reviewedCards: SeasonReviewSnapshotCard[]
  capturedAt?: Date
}): SeasonReviewSnapshot {
  const capturedAt = input.capturedAt ?? new Date()
  const passedCount = input.reviewedCards.filter(card => card.overallPassed).length
  const failedCount = input.reviewedCards.length - passedCount
  const markedCompleteCount = input.reviewedCards.filter(card => card.markComplete).length

  return {
    schemaVersion: 1,
    submissionId: input.submissionId,
    gradingType: 'end_season',
    capturedAt: capturedAt.toISOString(),
    season: {
      id: input.season.id,
      name: input.season.name,
      startDate: input.season.startDate.toISOString(),
      durationWeeks: input.season.durationWeeks,
      utilityRate: input.season.utilityRate,
      isActive: input.season.isActive,
    },
    summary: {
      reviewedCount: input.reviewedCards.length,
      passedCount,
      failedCount,
      markedCompleteCount,
      byType: countBy(
        input.reviewedCards.map(card => card.unitType),
        REVIEW_UNIT_TYPES
      ),
      statusBefore: countBy(
        input.reviewedCards.map(card => card.statusBefore),
        REVIEW_STATUSES
      ),
      statusAfter: countBy(
        input.reviewedCards.map(card => card.statusAfter),
        REVIEW_STATUSES
      ),
    },
    reviewedCards: input.reviewedCards.map(card => ({
      cardId: card.cardId,
      title: card.title,
      unitType: card.unitType,
      statusBefore: card.statusBefore,
      statusAfter: card.statusAfter,
      seasonId: card.seasonId,
      startDate: card.startDate?.toISOString() ?? null,
      targetDate: card.targetDate?.toISOString() ?? null,
      completionDateBefore: card.completionDateBefore?.toISOString() ?? null,
      completionDateAfter: card.completionDateAfter?.toISOString() ?? null,
      overallPassed: card.overallPassed,
      notes: card.notes,
      markComplete: card.markComplete,
      results: card.results,
    })),
  }
}
