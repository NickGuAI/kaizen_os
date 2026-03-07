import { Router, Request, Response, NextFunction } from 'express'
import { eventService } from '../../services/eventService'

const router = Router()

/**
 * @openapi
 * /api/events/conditions:
 *   get:
 *     summary: Get theme condition scores
 *     tags:
 *       - Events
 *     responses:
 *       200:
 *         description: Condition scores by theme
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/events/theme-hours:
 *   get:
 *     summary: Get actual hours for all themes
 *     tags:
 *       - Events
 *     parameters:
 *       - in: query
 *         name: seasonId
 *         required: false
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Theme hours
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/events/theme-hours/{themeId}:
 *   get:
 *     summary: Get actual hours for a theme
 *     tags:
 *       - Events
 *     parameters:
 *       - in: path
 *         name: themeId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: seasonId
 *         required: false
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Theme hours
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/events/conditions/{themeId}:
 *   get:
 *     summary: Get condition score for a theme
 *     tags:
 *       - Events
 *     parameters:
 *       - in: path
 *         name: themeId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Condition score
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/events/time:
 *   post:
 *     summary: Log time spent
 *     tags:
 *       - Events
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cardId:
 *                 type: number
 *               minutes:
 *                 type: number
 *               date:
 *                 type: string
 *             required:
 *               - cardId
 *               - minutes
 *     responses:
 *       201:
 *         description: Event logged
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/events/criteria-grade:
 *   post:
 *     summary: Grade action criteria
 *     tags:
 *       - Events
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cardId:
 *                 type: number
 *               gradingType:
 *                 type: string
 *               results:
 *                 type: array
 *                 items:
 *                   type: object
 *               notes:
 *                 type: string
 *             required:
 *               - cardId
 *               - gradingType
 *               - results
 *     responses:
 *       201:
 *         description: Event logged
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/events/veto-violated:
 *   post:
 *     summary: Log veto violation
 *     tags:
 *       - Events
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vetoId:
 *                 type: number
 *               reason:
 *                 type: string
 *             required:
 *               - vetoId
 *     responses:
 *       201:
 *         description: Event logged
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/events/gate-started:
 *   post:
 *     summary: Log gate started
 *     tags:
 *       - Events
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cardId:
 *                 type: number
 *             required:
 *               - cardId
 *     responses:
 *       201:
 *         description: Event logged
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/events/gate-completed:
 *   post:
 *     summary: Log gate completed
 *     tags:
 *       - Events
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cardId:
 *                 type: number
 *             required:
 *               - cardId
 *     responses:
 *       201:
 *         description: Event logged
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/events/experiment-started:
 *   post:
 *     summary: Log experiment started
 *     tags:
 *       - Events
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cardId:
 *                 type: number
 *             required:
 *               - cardId
 *     responses:
 *       201:
 *         description: Event logged
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/events/experiment-completed:
 *   post:
 *     summary: Log experiment completed
 *     tags:
 *       - Events
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cardId:
 *                 type: number
 *             required:
 *               - cardId
 *     responses:
 *       201:
 *         description: Event logged
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/events/routine-started:
 *   post:
 *     summary: Log routine started
 *     tags:
 *       - Events
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cardId:
 *                 type: number
 *             required:
 *               - cardId
 *     responses:
 *       201:
 *         description: Event logged
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/events/ops-started:
 *   post:
 *     summary: Log ops started
 *     tags:
 *       - Events
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cardId:
 *                 type: number
 *             required:
 *               - cardId
 *     responses:
 *       201:
 *         description: Event logged
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/events/ops-completed:
 *   post:
 *     summary: Log ops completed
 *     tags:
 *       - Events
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cardId:
 *                 type: number
 *             required:
 *               - cardId
 *     responses:
 *       201:
 *         description: Event logged
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/events:
 *   get:
 *     summary: List events
 *     tags:
 *       - Events
 *     parameters:
 *       - in: query
 *         name: cardId
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: start
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: end
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Events
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericArray'
 *   post:
 *     summary: Log a new event
 *     tags:
 *       - Events
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventType:
 *                 type: string
 *               cardId:
 *                 type: number
 *               payload:
 *                 type: object
 *               idempotencyKey:
 *                 type: string
 *             required:
 *               - eventType
 *     responses:
 *       201:
 *         description: Event logged
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/events/{id}:
 *   get:
 *     summary: Get event by ID
 *     tags:
 *       - Events
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 */
function getUserId(req: Request, res: Response): string | null {
  const userId = req.user?.id
  if (!userId) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    })
    return null
  }
  return userId
}

// v4 EventType values
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

// Helper to create API errors
function createError(statusCode: number, code: string, message: string) {
  const error = new Error(message) as Error & { statusCode: number; code: string }
  error.statusCode = statusCode
  error.code = code
  return error
}

// Helper to serialize Event (BigInt id to string)
function serializeEvent(event: { id: bigint; [key: string]: unknown }) {
  return {
    ...event,
    id: event.id.toString(),
  }
}

function serializeEvents(events: Array<{ id: bigint; [key: string]: unknown }>) {
  return events.map(serializeEvent)
}

// GET /api/events/conditions - Get all theme condition scores
router.get('/conditions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req, res)
    if (!userId) return
    const conditions = await eventService.getAllThemeConditions(userId)
    // Convert Map to object for JSON serialization
    const result: Record<string, { conditionScore: number; lastActivity: string | null }> = {}
    conditions.forEach((value, key) => {
      result[key] = {
        conditionScore: value.conditionScore,
        lastActivity: value.lastActivity?.toISOString() || null,
      }
    })
    res.json(result)
  } catch (error) {
    next(error)
  }
})

// GET /api/events/theme-hours - Get actual hours for all themes
router.get('/theme-hours', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req, res)
    if (!userId) return
    const seasonId = req.query.seasonId ? String(req.query.seasonId) : undefined
    const hoursMap = await eventService.getAllThemeHours(userId, seasonId)
    // Convert Map to object for JSON serialization
    const result: Record<string, number> = {}
    hoursMap.forEach((value, key) => {
      result[key] = value
    })
    res.json(result)
  } catch (error) {
    next(error)
  }
})

// GET /api/events/theme-hours/:themeId - Get actual hours for a specific theme
router.get('/theme-hours/:themeId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req, res)
    if (!userId) return
    const themeId = req.params.themeId as string
    const seasonId = req.query.seasonId ? String(req.query.seasonId) : undefined
    const hours = await eventService.getThemeActualHours(themeId, userId, seasonId)
    res.json({ themeId, actualHours: hours })
  } catch (error) {
    next(error)
  }
})

// GET /api/events/conditions/:themeId - Get condition score for a specific theme
router.get('/conditions/:themeId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req, res)
    if (!userId) return
    const themeId = req.params.themeId as string
    const condition = await eventService.getThemeCondition(themeId, userId)
    res.json({
      themeId,
      conditionScore: condition.conditionScore,
      lastActivity: condition.lastActivity?.toISOString() || null,
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/events/time - Log time spent (v4 API)
router.post('/time', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cardId, minutes, date } = req.body
    
    if (!cardId || typeof minutes !== 'number') {
      throw createError(400, 'VALIDATION_ERROR', 'cardId and minutes are required')
    }
    
    if (minutes <= 0) {
      throw createError(400, 'VALIDATION_ERROR', 'minutes must be positive')
    }
    const userId = getUserId(req, res)
    if (!userId) return
    const event = await eventService.logTime(userId, cardId, minutes, date)
    res.status(201).json(serializeEvent(event))
  } catch (error) {
    next(error)
  }
})

// POST /api/events/criteria-grade - Grade criteria for an action (v4 API - season grading)
router.post('/criteria-grade', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cardId, gradingType, results, notes } = req.body
    
    if (!cardId || !gradingType || !Array.isArray(results)) {
      throw createError(400, 'VALIDATION_ERROR', 'cardId, gradingType, and results array are required')
    }

    if (!['mid_season', 'end_season'].includes(gradingType)) {
      throw createError(400, 'VALIDATION_ERROR', 'gradingType must be "mid_season" or "end_season"')
    }
    const userId = getUserId(req, res)
    if (!userId) return
    const event = await eventService.gradeSeasonCriteria(userId, cardId, gradingType, results, notes)
    res.status(201).json(serializeEvent(event))
  } catch (error) {
    next(error)
  }
})

// POST /api/events/veto-violated - Log veto violation (v4 API)
router.post('/veto-violated', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { vetoId, reason } = req.body
    
    if (!vetoId) {
      throw createError(400, 'VALIDATION_ERROR', 'vetoId is required')
    }
    const userId = getUserId(req, res)
    if (!userId) return
    const event = await eventService.logVetoViolation(userId, vetoId, reason)
    res.status(201).json(serializeEvent(event))
  } catch (error) {
    next(error)
  }
})

// POST /api/events/gate-started - Log gate started (v4 API)
router.post('/gate-started', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req, res)
    if (!userId) return
    const { cardId } = req.body
    if (!cardId) throw createError(400, 'VALIDATION_ERROR', 'cardId is required')
    const event = await eventService.logGateStarted(userId, cardId)
    res.status(201).json(serializeEvent(event))
  } catch (error) {
    next(error)
  }
})

// POST /api/events/gate-completed - Log gate completed (v4 API)
router.post('/gate-completed', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req, res)
    if (!userId) return
    const { cardId } = req.body
    if (!cardId) throw createError(400, 'VALIDATION_ERROR', 'cardId is required')
    const event = await eventService.logGateCompleted(userId, cardId)
    res.status(201).json(serializeEvent(event))
  } catch (error) {
    next(error)
  }
})

// POST /api/events/experiment-started - Log experiment started (v4 API)
router.post('/experiment-started', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req, res)
    if (!userId) return
    const { cardId } = req.body
    if (!cardId) throw createError(400, 'VALIDATION_ERROR', 'cardId is required')
    const event = await eventService.logExperimentStarted(userId, cardId)
    res.status(201).json(serializeEvent(event))
  } catch (error) {
    next(error)
  }
})

// POST /api/events/experiment-completed - Log experiment completed (v4 API)
router.post('/experiment-completed', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req, res)
    if (!userId) return
    const { cardId } = req.body
    if (!cardId) throw createError(400, 'VALIDATION_ERROR', 'cardId is required')
    const event = await eventService.logExperimentCompleted(userId, cardId)
    res.status(201).json(serializeEvent(event))
  } catch (error) {
    next(error)
  }
})

// POST /api/events/routine-started - Log routine started (v4 API)
router.post('/routine-started', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req, res)
    if (!userId) return
    const { cardId } = req.body
    if (!cardId) throw createError(400, 'VALIDATION_ERROR', 'cardId is required')
    const event = await eventService.logRoutineStarted(userId, cardId)
    res.status(201).json(serializeEvent(event))
  } catch (error) {
    next(error)
  }
})

// POST /api/events/ops-started - Log ops started (v4 API)
router.post('/ops-started', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req, res)
    if (!userId) return
    const { cardId } = req.body
    if (!cardId) throw createError(400, 'VALIDATION_ERROR', 'cardId is required')
    const event = await eventService.logOpsStarted(userId, cardId)
    res.status(201).json(serializeEvent(event))
  } catch (error) {
    next(error)
  }
})

// POST /api/events/ops-completed - Log ops completed (v4 API)
router.post('/ops-completed', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req, res)
    if (!userId) return
    const { cardId } = req.body
    if (!cardId) throw createError(400, 'VALIDATION_ERROR', 'cardId is required')
    const event = await eventService.logOpsCompleted(userId, cardId)
    res.status(201).json(serializeEvent(event))
  } catch (error) {
    next(error)
  }
})

// GET /api/events - List events with optional filters
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req, res)
    if (!userId) return
    const { cardId, type, start, end, limit } = req.query

    // Filter by card ID
    if (cardId) {
      const events = await eventService.getByCard(String(cardId), userId)
      return res.json(serializeEvents(events))
    }

    // Filter by event type
    if (type) {
      const events = await eventService.getByType(userId, type as EventType)
      return res.json(serializeEvents(events))
    }

    // Filter by time range
    if (start && end) {
      const startDate = new Date(start as string)
      const endDate = new Date(end as string)
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw createError(400, 'INVALID_DATE', 'Invalid date format')
      }
      const events = await eventService.getByTimeRange(userId, startDate, endDate)
      return res.json(serializeEvents(events))
    }

    // Default: return recent events
    const eventLimit = limit ? parseInt(limit as string, 10) : 50
    const events = await eventService.getRecent(userId, eventLimit)
    res.json(serializeEvents(events))
  } catch (error) {
    next(error)
  }
})

// POST /api/events - Log a new event
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req, res)
    if (!userId) return
    const { eventType, cardId, payload, idempotencyKey } = req.body

    if (!eventType) {
      throw createError(400, 'VALIDATION_ERROR', 'Event type is required')
    }

    const event = await eventService.log({
      userId,
      eventType: eventType as EventType,
      cardId: cardId ? String(cardId) : undefined,
      payload: payload || {},
      idempotencyKey,
    })

    res.status(201).json(serializeEvent(event))
  } catch (error) {
    next(error)
  }
})

// GET /api/events/:id - Get event by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req, res)
    if (!userId) return
    const id = BigInt(req.params.id as string)
    const event = await eventService.getById(id, userId)
    
    if (!event) {
      throw createError(404, 'NOT_FOUND', 'Event not found')
    }

    res.json(serializeEvent(event))
  } catch (error) {
    if (error instanceof SyntaxError) {
      next(createError(400, 'INVALID_ID', 'Invalid event ID'))
    } else {
      next(error)
    }
  }
})

export default router
