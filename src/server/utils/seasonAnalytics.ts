import type { EventType, TaskStatus, UnitType } from '@prisma/client'

const ACTION_UNIT_TYPES = [
  'ACTION_GATE',
  'ACTION_EXPERIMENT',
  'ACTION_ROUTINE',
  'ACTION_OPS',
] as const satisfies UnitType[]
type ActionUnitType = (typeof ACTION_UNIT_TYPES)[number]

const COMPLETION_EVENT_TYPES = new Set<EventType>([
  'gate_completed',
  'experiment_completed',
  'ops_completed',
])

export interface AnalyticsSeasonInput {
  id: string
  name: string
  startDate: Date
  durationWeeks: number
  utilityRate: number
  isActive: boolean
}

export interface AnalyticsCardInput {
  id: string
  unitType: UnitType
  status: TaskStatus
  seasonId: string | null
  createdAt: Date
  startDate: Date | null
  targetDate: Date | null
  completionDate: Date | null
}

type AnalyticsActionCardInput = AnalyticsCardInput & {
  unitType: ActionUnitType
}

export interface AnalyticsEventInput {
  cardId: string | null
  eventType: EventType
  occurredAt: Date
  payload: unknown
}

export interface SeasonAnalyticsResult {
  id: string
  name: string
  startDate: Date
  durationWeeks: number
  utilityRate: number
  isActive: boolean
  totalCards: number
  completed: number
  inProgress: number
  completionRate: number
  byType: {
    ACTION_GATE: number
    ACTION_EXPERIMENT: number
    ACTION_ROUTINE: number
    ACTION_OPS: number
  }
}

function getSeasonEnd(startDate: Date, durationWeeks: number): Date {
  const end = new Date(startDate)
  end.setDate(end.getDate() + durationWeeks * 7)
  return end
}

function isWithinSeason(date: Date | null | undefined, start: Date, end: Date): boolean {
  return !!date && date >= start && date < end
}

function hasSeasonId(payload: unknown, seasonId: string): boolean {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return false
  }
  return (payload as Record<string, unknown>).season_id === seasonId
}

function isActionUnitType(unitType: UnitType): unitType is ActionUnitType {
  return ACTION_UNIT_TYPES.includes(unitType as ActionUnitType)
}

export function buildSeasonAnalytics(
  seasons: AnalyticsSeasonInput[],
  cards: AnalyticsCardInput[],
  events: AnalyticsEventInput[]
): SeasonAnalyticsResult[] {
  const actionCards: AnalyticsActionCardInput[] = cards.filter(
    (card): card is AnalyticsActionCardInput => isActionUnitType(card.unitType)
  )
  const eventsByCardId = new Map<string, AnalyticsEventInput[]>()

  for (const event of events) {
    if (!event.cardId) {
      continue
    }
    const existing = eventsByCardId.get(event.cardId) ?? []
    existing.push(event)
    eventsByCardId.set(event.cardId, existing)
  }

  return seasons.map((season) => {
    const seasonEnd = getSeasonEnd(season.startDate, season.durationWeeks)
    const seasonCards = actionCards.filter((card) => {
      if (card.seasonId === season.id) {
        return true
      }

      if (
        isWithinSeason(card.createdAt, season.startDate, seasonEnd) ||
        isWithinSeason(card.startDate, season.startDate, seasonEnd) ||
        isWithinSeason(card.targetDate, season.startDate, seasonEnd) ||
        isWithinSeason(card.completionDate, season.startDate, seasonEnd)
      ) {
        return true
      }

      const cardEvents = eventsByCardId.get(card.id) ?? []
      return cardEvents.some((event) =>
        hasSeasonId(event.payload, season.id) ||
        isWithinSeason(event.occurredAt, season.startDate, seasonEnd)
      )
    })

    const completedCardIds = new Set(
      seasonCards
        .filter((card) => {
          if (isWithinSeason(card.completionDate, season.startDate, seasonEnd)) {
            return true
          }

          const cardEvents = eventsByCardId.get(card.id) ?? []
          return cardEvents.some((event) =>
            COMPLETION_EVENT_TYPES.has(event.eventType) && (
              hasSeasonId(event.payload, season.id) ||
              isWithinSeason(event.occurredAt, season.startDate, seasonEnd)
            )
          )
        })
        .map(card => card.id)
    )

    const totalCards = seasonCards.length
    const completed = completedCardIds.size
    const inProgress = Math.max(totalCards - completed, 0)
    const completionRate = totalCards > 0 ? Math.round((completed / totalCards) * 100) : 0

    return {
      id: season.id,
      name: season.name,
      startDate: season.startDate,
      durationWeeks: season.durationWeeks,
      utilityRate: season.utilityRate,
      isActive: season.isActive,
      totalCards,
      completed,
      inProgress,
      completionRate,
      byType: {
        ACTION_GATE: seasonCards.filter(card => card.unitType === 'ACTION_GATE').length,
        ACTION_EXPERIMENT: seasonCards.filter(card => card.unitType === 'ACTION_EXPERIMENT').length,
        ACTION_ROUTINE: seasonCards.filter(card => card.unitType === 'ACTION_ROUTINE').length,
        ACTION_OPS: seasonCards.filter(card => card.unitType === 'ACTION_OPS').length,
      },
    }
  })
}
