import { Prisma } from '@prisma/client'
import db from '../lib/db'
import { randomUUID } from 'crypto'

const prisma = db

// v4 EventType enum values from schema
type EventType = 
  | 'gate_started' | 'gate_completed' | 'gate_failed'
  | 'experiment_started' | 'experiment_completed' | 'experiment_failed' | 'experiment_pivoted'
  | 'criteria_graded'
  | 'routine_started' | 'routine_replaced'
  | 'ops_started' | 'ops_completed'
  | 'veto_added' | 'veto_violated'
  | 'time_logged'
  | 'week_planned' | 'week_reviewed'
  | 'season_started' | 'season_ended'

export interface LogEventInput {
  userId: string
  eventType: EventType
  cardId?: string
  payload?: Record<string, unknown>
  idempotencyKey?: string
}

export class EventService {
  /**
   * Log a new event
   */
  async log(data: LogEventInput) {
    // Check for idempotency
    if (data.idempotencyKey) {
      const existing = await prisma.event.findFirst({
        where: {
          userId: data.userId,
          idempotencyKey: data.idempotencyKey,
        },
      })

      if (existing) {
        return existing
      }
    }

    return prisma.event.create({
      data: {
        userId: data.userId,
        eventType: data.eventType,
        cardId: data.cardId,
        payload: (data.payload as Prisma.InputJsonValue) ?? {},
        idempotencyKey: data.idempotencyKey,
      },
    })
  }

  /**
   * Get events for a specific card
   */
  async getByCard(cardId: string, userId: string) {
    return prisma.event.findMany({
      where: {
        cardId,
        userId,
      },
      orderBy: {
        occurredAt: 'desc',
      },
    })
  }

  /**
   * Get events by type for a user
   */
  async getByType(userId: string, eventType: EventType) {
    return prisma.event.findMany({
      where: {
        userId,
        eventType,
      },
      orderBy: {
        occurredAt: 'desc',
      },
    })
  }

  /**
   * Get events within a time range
   */
  async getByTimeRange(userId: string, start: Date, end: Date) {
    return prisma.event.findMany({
      where: {
        userId,
        occurredAt: {
          gte: start,
          lte: end,
        },
      },
      orderBy: {
        occurredAt: 'desc',
      },
    })
  }

  /**
   * Get recent events for a user
   */
  async getRecent(userId: string, limit: number = 50) {
    return prisma.event.findMany({
      where: { userId },
      orderBy: { occurredAt: 'desc' },
      take: limit,
    })
  }

  /**
   * Get event by ID
   */
  async getById(id: bigint, userId: string) {
    return prisma.event.findFirst({
      where: {
        id,
        userId,
      },
    })
  }

  /**
   * Calculate condition score for a theme using exponential decay (τ = 7 days)
   * Formula: 100 * SUM(minutes * e^(-days/7)) / SUM(60 * e^(-days/7))
   * This gives a score where 60 minutes/day = 100%
   */
  async getThemeCondition(themeId: string, userId: string): Promise<{ conditionScore: number; lastActivity: Date | null }> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Get all time_logged events for this theme and its children
    const descendants = await this.getThemeDescendants(themeId, userId)
    const cardIds = [themeId, ...descendants.map(d => d.id)]

    const events = await prisma.event.findMany({
      where: {
        userId,
        eventType: 'time_logged',
        cardId: { in: cardIds },
        occurredAt: { gte: thirtyDaysAgo },
      },
      orderBy: { occurredAt: 'desc' },
    })

    if (events.length === 0) {
      return { conditionScore: 0, lastActivity: null }
    }

    const now = new Date()
    const TAU = 7 // decay constant in days

    let weightedMinutes = 0
    let weightedBaseline = 0

    for (const event of events) {
      const payload = event.payload as { minutes?: number; date?: string }
      const minutes = payload.minutes || 0
      
      // Use event date from payload if available, otherwise use occurredAt
      const eventDate = payload.date ? new Date(payload.date) : event.occurredAt
      const daysSince = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24)
      
      const decayFactor = Math.exp(-daysSince / TAU)
      weightedMinutes += minutes * decayFactor
      weightedBaseline += 60 * decayFactor // 60 minutes/day is the baseline
    }

    const conditionScore = weightedBaseline > 0 
      ? Math.min(100, Math.round(100 * weightedMinutes / weightedBaseline))
      : 0

    return {
      conditionScore,
      lastActivity: events[0]?.occurredAt || null,
    }
  }

  /**
   * Get all condition scores for all themes for a user (optimized batch query)
   */
  async getAllThemeConditions(userId: string): Promise<Map<string, { conditionScore: number; lastActivity: Date | null }>> {
    const themes = await prisma.card.findMany({
      where: { userId, unitType: 'THEME' },
      select: { id: true },
    })

    if (themes.length === 0) {
      return new Map()
    }

    const themeIds = themes.map(t => t.id)
    
    // Get all descendants for all themes in one batch
    const descendantsMap = await this.getAllThemeDescendantsBatch(themeIds, userId)
    
    // Collect all card IDs we need events for
    const allCardIds = new Set<string>()
    for (const themeId of themeIds) {
      allCardIds.add(themeId)
      const descendants = descendantsMap.get(themeId) || []
      descendants.forEach(id => allCardIds.add(id))
    }

    // Get all time_logged events in one query
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const events = await prisma.event.findMany({
      where: {
        userId,
        eventType: 'time_logged',
        cardId: { in: Array.from(allCardIds) },
        occurredAt: { gte: thirtyDaysAgo },
      },
      orderBy: { occurredAt: 'desc' },
    })

    // Group events by card ID
    const eventsByCard = new Map<string, typeof events>()
    for (const event of events) {
      if (event.cardId) {
        const cardEvents = eventsByCard.get(event.cardId) || []
        cardEvents.push(event)
        eventsByCard.set(event.cardId, cardEvents)
      }
    }

    // Calculate condition for each theme
    const conditions = new Map<string, { conditionScore: number; lastActivity: Date | null }>()
    const now = new Date()
    const TAU = 7

    for (const themeId of themeIds) {
      const cardIds = [themeId, ...(descendantsMap.get(themeId) || [])]
      
      // Collect all events for this theme's cards
      const themeEvents: typeof events = []
      for (const cardId of cardIds) {
        const cardEvents = eventsByCard.get(cardId) || []
        themeEvents.push(...cardEvents)
      }

      if (themeEvents.length === 0) {
        conditions.set(themeId, { conditionScore: 0, lastActivity: null })
        continue
      }

      // Sort by date to get most recent
      themeEvents.sort((a: { occurredAt: Date }, b: { occurredAt: Date }) => b.occurredAt.getTime() - a.occurredAt.getTime())

      let weightedMinutes = 0
      let weightedBaseline = 0

      for (const event of themeEvents) {
        const payload = event.payload as { minutes?: number; date?: string }
        const minutes = payload.minutes || 0
        const eventDate = payload.date ? new Date(payload.date) : event.occurredAt
        const daysSince = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24)
        const decayFactor = Math.exp(-daysSince / TAU)
        weightedMinutes += minutes * decayFactor
        weightedBaseline += 60 * decayFactor
      }

      const conditionScore = weightedBaseline > 0 
        ? Math.min(100, Math.round(100 * weightedMinutes / weightedBaseline))
        : 0

      conditions.set(themeId, {
        conditionScore,
        lastActivity: themeEvents[0]?.occurredAt || null,
      })
    }

    return conditions
  }

  /**
   * Get all descendant cards of a theme (gates, experiments, routines, ops, tasks, criteria)
   * Optimized: single recursive CTE query
   */
  private async getThemeDescendants(themeId: string, userId: string): Promise<{ id: string }[]> {
    // Use raw SQL with recursive CTE for efficiency
    const result = await prisma.$queryRaw<{ id: string }[]>`
      WITH RECURSIVE descendants AS (
        SELECT id FROM "Card" WHERE "parentId" = ${themeId}::uuid AND "userId" = ${userId}::uuid
        UNION ALL
        SELECT c.id FROM "Card" c
        INNER JOIN descendants d ON c."parentId" = d.id
        WHERE c."userId" = ${userId}::uuid
      )
      SELECT id FROM descendants
    `
    return result
  }

  /**
   * Get all descendant IDs for multiple themes at once (batch operation)
   */
  private async getAllThemeDescendantsBatch(themeIds: string[], userId: string): Promise<Map<string, string[]>> {
    if (themeIds.length === 0) return new Map()

    const themeIdParams = Prisma.join(themeIds.map(id => Prisma.sql`${id}::uuid`))

    const rows = await prisma.$queryRaw<{ theme_id: string; card_id: string }[]>`
      WITH RECURSIVE descendants AS (
        SELECT id as theme_id, id as card_id
        FROM "cards"
        WHERE "user_id" = ${userId}::uuid AND id IN (${themeIdParams})
        UNION ALL
        SELECT d.theme_id, c.id
        FROM "cards" c
        INNER JOIN descendants d ON c."parent_id" = d.card_id
        WHERE c."user_id" = ${userId}::uuid
      )
      SELECT theme_id, card_id
      FROM descendants
      WHERE card_id <> theme_id
    `

    const result = new Map<string, string[]>()
    for (const row of rows) {
      const existing = result.get(row.theme_id) || []
      existing.push(row.card_id)
      result.set(row.theme_id, existing)
    }

    return result
  }

  /**
   * Log time spent on a card (v4 API)
   */
  async logTime(userId: string, cardId: string, minutes: number, date?: string) {
    return this.log({
      userId,
      eventType: 'time_logged',
      cardId,
      payload: {
        minutes,
        date: date || new Date().toISOString().split('T')[0],
      },
    })
  }

  /**
   * Grade criteria for an action (season grading)
   * Creates an immutable event with the full grading snapshot
   */
  async gradeSeasonCriteria(
    userId: string,
    cardId: string,
    gradingType: 'mid_season' | 'end_season',
    results: { criterion: string; passed: boolean }[],
    notes?: string
  ) {
    const overallPassed = results.every(r => r.passed)
    
    return this.log({
      userId,
      eventType: 'criteria_graded',
      cardId,
      payload: {
        grading_type: gradingType,
        results,
        overall_passed: overallPassed,
        notes: notes || null,
      },
    })
  }

  /**
   * @deprecated Use gradeSeasonCriteria instead
   */
  async gradeCriteria(userId: string, criteriaId: string, passed: boolean) {
    console.warn('gradeCriteria is deprecated. Use gradeSeasonCriteria instead.')
    return this.log({
      userId,
      eventType: 'criteria_graded',
      cardId: criteriaId,
      payload: { passed },
    })
  }

  /**
   * Log veto violation
   */
  async logVetoViolation(userId: string, vetoId: string, reason?: string) {
    return this.log({
      userId,
      eventType: 'veto_violated',
      cardId: vetoId,
      payload: { reason },
    })
  }

  /**
   * Log gate lifecycle events
   */
  async logGateStarted(userId: string, cardId: string) {
    return this.log({ userId, eventType: 'gate_started', cardId, payload: {} })
  }

  async logGateCompleted(userId: string, cardId: string) {
    return this.log({ userId, eventType: 'gate_completed', cardId, payload: {} })
  }

  async logGateFailed(userId: string, cardId: string) {
    return this.log({ userId, eventType: 'gate_failed', cardId, payload: {} })
  }

  /**
   * Log experiment lifecycle events
   */
  async logExperimentStarted(userId: string, cardId: string) {
    return this.log({ userId, eventType: 'experiment_started', cardId, payload: {} })
  }

  async logExperimentCompleted(userId: string, cardId: string) {
    return this.log({ userId, eventType: 'experiment_completed', cardId, payload: {} })
  }

  async logExperimentFailed(userId: string, cardId: string) {
    return this.log({ userId, eventType: 'experiment_failed', cardId, payload: {} })
  }

  async logExperimentPivoted(userId: string, cardId: string) {
    return this.log({ userId, eventType: 'experiment_pivoted', cardId, payload: {} })
  }

  /**
   * Log routine lifecycle events
   */
  async logRoutineStarted(userId: string, cardId: string) {
    return this.log({ userId, eventType: 'routine_started', cardId, payload: {} })
  }

  async logRoutineReplaced(userId: string, cardId: string) {
    return this.log({ userId, eventType: 'routine_replaced', cardId, payload: {} })
  }

  /**
   * Log ops lifecycle events
   */
  async logOpsStarted(userId: string, cardId: string) {
    return this.log({ userId, eventType: 'ops_started', cardId, payload: {} })
  }

  async logOpsCompleted(userId: string, cardId: string) {
    return this.log({ userId, eventType: 'ops_completed', cardId, payload: {} })
  }

  /**
   * Submit batch grading for a season - atomically grades multiple actions
   * and optionally marks them as complete
   */
  async submitSeasonGrading(
    userId: string,
    seasonId: string,
    gradingType: 'mid_season' | 'end_season',
    gradings: Array<{
      cardId: string
      results: { criterion: string; passed: boolean }[]
      notes?: string
      markComplete: boolean
    }>
  ): Promise<{ gradedCount: number; completedCount: number }> {
    let gradedCount = 0
    let completedCount = 0
    const submissionId = randomUUID()

    await prisma.$transaction(async (tx) => {
      for (const grading of gradings) {
        const overallPassed = grading.results.every(r => r.passed)

        // Log the grading event
        await tx.event.create({
          data: {
            userId,
            eventType: 'criteria_graded',
            cardId: grading.cardId,
            payload: {
              grading_type: gradingType,
              season_id: seasonId,
              submission_id: submissionId,
              results: grading.results,
              overall_passed: overallPassed,
              notes: grading.notes || null,
            },
          },
        })
        gradedCount++

        // If markComplete is true, update card status and log completion event
        if (grading.markComplete) {
          // Get the card to determine its type (with userId validation for security)
          const card = await tx.card.findFirst({
            where: { id: grading.cardId, userId },
            select: { unitType: true },
          })

          if (card) {
            // Update card status to completed (with userId validation for security)
            await tx.card.updateMany({
              where: { id: grading.cardId, userId },
              data: {
                status: 'completed',
                completionDate: new Date(),
              },
            })

            // Log appropriate completion event based on card type
            const completionEventType: EventType =
              card.unitType === 'ACTION_GATE' ? 'gate_completed' :
              card.unitType === 'ACTION_EXPERIMENT' ? 'experiment_completed' :
              'ops_completed'

            await tx.event.create({
              data: {
                userId,
                eventType: completionEventType,
                cardId: grading.cardId,
                payload: {
                  completed_via: 'grading',
                  grading_type: gradingType,
                  season_id: seasonId,
                  submission_id: submissionId,
                },
              },
            })
            completedCount++
          }
        }
      }
    })

    return { gradedCount, completedCount }
  }

  /**
   * Get actual hours logged for a theme (Property 6: Time Aggregation)
   * Sum of time_logged events for theme and all descendant cards
   */
  async getThemeActualHours(themeId: string, userId: string, seasonId?: string): Promise<number> {
    let startDate: Date | undefined
    let endDate: Date | undefined

    if (seasonId) {
      const season = await prisma.season.findFirst({ where: { id: seasonId, userId } })
      if (season) {
        startDate = season.startDate
        endDate = new Date(season.startDate)
        endDate.setDate(endDate.getDate() + season.durationWeeks * 7)
      }
    }

    const result = await prisma.$queryRaw<{ hours: number | string | null }[]>`
      WITH RECURSIVE descendants AS (
        SELECT id FROM "cards" WHERE id = ${themeId}::uuid AND "user_id" = ${userId}::uuid
        UNION ALL
        SELECT c.id FROM "cards" c
        INNER JOIN descendants d ON c."parent_id" = d.id
        WHERE c."user_id" = ${userId}::uuid
      )
      SELECT COALESCE(SUM((payload->>'minutes')::float), 0) / 60.0 as hours
      FROM "events"
      WHERE "user_id" = ${userId}::uuid
        AND "event_type" = 'time_logged'
        AND "card_id" IN (SELECT id FROM descendants)
        ${startDate && endDate ? Prisma.raw(`AND "occurred_at" BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'`) : Prisma.raw('')}
    `

    return Number(result[0]?.hours || 0)
  }

  /**
   * Get actual hours for all themes for a user (optimized batch query)
   */
  async getAllThemeHours(userId: string, seasonId?: string): Promise<Map<string, number>> {
    let startDate: Date | undefined
    let endDate: Date | undefined

    if (seasonId) {
      const season = await prisma.season.findFirst({ where: { id: seasonId, userId } })
      if (season) {
        startDate = season.startDate
        endDate = new Date(season.startDate)
        endDate.setDate(endDate.getDate() + season.durationWeeks * 7)
      }
    }

    const result = await prisma.$queryRaw<{ theme_id: string; actual_hours: number | string | null }[]>`
      WITH RECURSIVE descendants AS (
        -- Base case: all themes for the user
        SELECT id as theme_id, id as card_id
        FROM "cards"
        WHERE "user_id" = ${userId}::uuid AND "unit_type" = 'THEME'
        
        UNION ALL
        
        -- Recursive step: get children of cards already in descendants
        SELECT d.theme_id, c.id
        FROM "cards" c
        INNER JOIN descendants d ON c."parent_id" = d.card_id
        WHERE c."user_id" = ${userId}::uuid
      )
      SELECT 
        d.theme_id,
        COALESCE(SUM((e.payload->>'minutes')::float), 0) / 60.0 as actual_hours
      FROM descendants d
      LEFT JOIN "events" e
        ON d.card_id = e.card_id
        AND e."user_id" = ${userId}::uuid
        AND e."event_type" = 'time_logged'
        ${startDate && endDate ? Prisma.raw(`AND e."occurred_at" BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'`) : Prisma.raw('')}
      GROUP BY d.theme_id
    `

    const hoursMap = new Map<string, number>()
    result.forEach((row) => {
      hoursMap.set(String(row.theme_id), Number(row.actual_hours || 0))
    })

    return hoursMap
  }

  /**
   * Get grading history for a season
   * Returns all criteria_graded events for the season with card details
   */
  async getSeasonGradings(userId: string, seasonId: string): Promise<{
    gradings: Array<{
      id: string
      cardId: string
      cardTitle: string
      effortId: string
      gradingType: 'mid_season' | 'end_season'
      results: Array<{ criterion: string; passed: boolean }>
      overallPassed: boolean
      notes: string | null
      occurredAt: string
    }>
    efforts: Array<{
      id: string
      gradingType: 'mid_season' | 'end_season'
      occurredAt: string
      gradings: Array<{
        id: string
        cardId: string
        cardTitle: string
        effortId: string
        gradingType: 'mid_season' | 'end_season'
        results: Array<{ criterion: string; passed: boolean }>
        overallPassed: boolean
        notes: string | null
        occurredAt: string
      }>
      summary: {
        totalGradings: number
        passedCount: number
        failedCount: number
      }
    }>
    summary: {
      totalGradings: number
      totalEfforts: number
      midSeasonCount: number
      endSeasonCount: number
      midSeasonEffortCount: number
      endSeasonEffortCount: number
      passedCount: number
      failedCount: number
    }
  }> {
    // Fetch all criteria_graded events for this season
    const events = await prisma.event.findMany({
      where: {
        userId,
        eventType: 'criteria_graded',
        payload: {
          path: ['season_id'],
          equals: seasonId,
        },
      },
      include: {
        card: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        occurredAt: 'desc',
      },
    })

    const gradings = events.map((event) => {
      const payload = event.payload as {
        grading_type: 'mid_season' | 'end_season'
        submission_id?: string
        results: Array<{ criterion: string; passed: boolean }>
        overall_passed: boolean
        notes: string | null
      }

      const effortId = typeof payload.submission_id === 'string' && payload.submission_id.length > 0
        ? payload.submission_id
        : `legacy-${payload.grading_type}-${event.occurredAt.toISOString().slice(0, 16)}`

      return {
        id: event.id.toString(),
        cardId: event.cardId || '',
        cardTitle: event.card?.title || 'Unknown Action',
        effortId,
        gradingType: payload.grading_type,
        results: payload.results || [],
        overallPassed: payload.overall_passed,
        notes: payload.notes,
        occurredAt: event.occurredAt.toISOString(),
      }
    })

    const effortMap = new Map<string, {
      id: string
      gradingType: 'mid_season' | 'end_season'
      occurredAt: string
      gradings: typeof gradings
      summary: {
        totalGradings: number
        passedCount: number
        failedCount: number
      }
    }>()

    gradings.forEach((grading) => {
      const existing = effortMap.get(grading.effortId)
      if (existing) {
        existing.gradings.push(grading)
        existing.summary.totalGradings += 1
        if (grading.overallPassed) {
          existing.summary.passedCount += 1
        } else {
          existing.summary.failedCount += 1
        }
        return
      }

      effortMap.set(grading.effortId, {
        id: grading.effortId,
        gradingType: grading.gradingType,
        occurredAt: grading.occurredAt,
        gradings: [grading],
        summary: {
          totalGradings: 1,
          passedCount: grading.overallPassed ? 1 : 0,
          failedCount: grading.overallPassed ? 0 : 1,
        },
      })
    })

    const efforts = Array.from(effortMap.values()).sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    )

    // Calculate summary
    const midSeasonGradings = gradings.filter((g) => g.gradingType === 'mid_season')
    const endSeasonGradings = gradings.filter((g) => g.gradingType === 'end_season')
    const midSeasonEfforts = efforts.filter((e) => e.gradingType === 'mid_season')
    const endSeasonEfforts = efforts.filter((e) => e.gradingType === 'end_season')
    const passedCount = gradings.filter((g) => g.overallPassed).length
    const failedCount = gradings.filter((g) => !g.overallPassed).length

    return {
      gradings,
      efforts,
      summary: {
        totalGradings: gradings.length,
        totalEfforts: efforts.length,
        midSeasonCount: midSeasonGradings.length,
        endSeasonCount: endSeasonGradings.length,
        midSeasonEffortCount: midSeasonEfforts.length,
        endSeasonEffortCount: endSeasonEfforts.length,
        passedCount,
        failedCount,
      },
    }
  }
}

export const eventService = new EventService()
