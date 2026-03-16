import { Router, Request, Response, NextFunction } from 'express'
import { seasonService } from '../../services/seasonService'
import { eventService } from '../../services/eventService'
import { validateCreateSeason, formatValidationErrors } from '../../lib/validation'
import { getSeasonReviewAvailability } from '../../utils/seasonReviewUtils'
import { prisma } from '../../lib/db'

const router = Router()

/**
 * @openapi
 * /api/seasons:
 *   get:
 *     summary: List seasons
 *     tags:
 *       - Seasons
 *     responses:
 *       200:
 *         description: List of seasons
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericArray'
 *   post:
 *     summary: Create a season
 *     tags:
 *       - Seasons
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               startDate:
 *                 type: string
 *               durationWeeks:
 *                 type: number
 *               utilityRate:
 *                 type: number
 *     responses:
 *       201:
 *         description: Created season
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/seasons/active:
 *   get:
 *     summary: Get active season
 *     tags:
 *       - Seasons
 *     responses:
 *       200:
 *         description: Active season or null
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/seasons/{id}:
 *   get:
 *     summary: Get season by ID
 *     tags:
 *       - Seasons
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Season
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 *   put:
 *     summary: Update a season
 *     tags:
 *       - Seasons
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenericObject'
 *     responses:
 *       200:
 *         description: Updated season
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 *   delete:
 *     summary: Delete a season
 *     tags:
 *       - Seasons
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Season deleted
 * /api/seasons/{id}/activate:
 *   put:
 *     summary: Activate a season
 *     tags:
 *       - Seasons
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Activated season
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/seasons/{id}/deactivate:
 *   put:
 *     summary: Deactivate a season
 *     tags:
 *       - Seasons
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deactivated season
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/seasons/{id}/grading/submit:
 *   post:
 *     summary: Submit batch grading for a season
 *     tags:
 *       - Seasons
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               gradingType:
 *                 type: string
 *                 enum: [mid_season, end_season]
 *               gradings:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     cardId:
 *                       type: string
 *                     results:
 *                       type: array
 *                     notes:
 *                       type: string
 *                     markComplete:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Grading submitted
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

// Helper to create API errors
function createError(statusCode: number, code: string, message: string, details?: Record<string, string[]>) {
  const error = new Error(message) as Error & { statusCode: number; code: string; details?: Record<string, string[]> }
  error.statusCode = statusCode
  error.code = code
  if (details) error.details = details
  return error
}

// GET /api/seasons - List all seasons
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req, res)
    if (!userId) return
    const seasons = await seasonService.getAll(userId)
    res.json(seasons)
  } catch (error) {
    next(error)
  }
})

// GET /api/seasons/active - Get active season
router.get('/active', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req, res)
    if (!userId) return
    const season = await seasonService.getActive(userId)
    if (!season) {
      return res.json(null)
    }
    res.json(season)
  } catch (error) {
    next(error)
  }
})

// GET /api/seasons/active/vetoes - Get vetoes scoped to the active season (including global vetoes)
router.get('/active/vetoes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req, res)
    if (!userId) return

    const activeSeason = await seasonService.getActive(userId)
    if (!activeSeason) {
      return res.json([])
    }

    const vetoes = await prisma.card.findMany({
      where: {
        userId,
        unitType: 'VETO',
        parentId: null,
        OR: [
          { seasonId: activeSeason.id },
          { seasonId: null },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        seasonId: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    res.json(vetoes)
  } catch (error) {
    next(error)
  }
})

// GET /api/seasons/:id - Get season by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string
    const userId = getUserId(req, res)
    if (!userId) return

    const season = await seasonService.getById(id, userId)
    if (!season) {
      throw createError(404, 'NOT_FOUND', 'Season not found')
    }

    res.json(season)
  } catch (error) {
    next(error)
  }
})

// POST /api/seasons - Create new season
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = validateCreateSeason(req.body)
    if (!validation.valid) {
      throw createError(400, 'VALIDATION_ERROR', 'Validation failed', formatValidationErrors(validation.errors))
    }
    const userId = getUserId(req, res)
    if (!userId) return

    const season = await seasonService.create({
      userId,
      name: req.body.name,
      startDate: new Date(req.body.startDate),
      durationWeeks: parseInt(req.body.durationWeeks, 10),
      utilityRate: req.body.utilityRate ? parseFloat(req.body.utilityRate) : undefined,
    })

    res.status(201).json(season)
  } catch (error) {
    next(error)
  }
})

// PUT /api/seasons/:id/activate - Activate a season
router.put('/:id/activate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string
    const userId = getUserId(req, res)
    if (!userId) return

    const season = await seasonService.activate(id, userId)
    
    // Log season_started event
    await eventService.log({
      userId,
      eventType: 'season_started',
      payload: { season_id: id, season_name: season.name },
    })
    
    res.json(season)
  } catch (error) {
    if (error instanceof Error && error.message === 'Season not found') {
      next(createError(404, 'NOT_FOUND', 'Season not found'))
    } else {
      next(error)
    }
  }
})

// PUT /api/seasons/:id/deactivate - Deactivate a season
router.put('/:id/deactivate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string
    const userId = getUserId(req, res)
    if (!userId) return

    const season = await seasonService.deactivate(id, userId)
    
    // Log season_ended event
    await eventService.log({
      userId,
      eventType: 'season_ended',
      payload: { season_id: id, season_name: season.name },
    })
    
    res.json(season)
  } catch (error) {
    if (error instanceof Error && error.message === 'Season not found') {
      next(createError(404, 'NOT_FOUND', 'Season not found'))
    } else {
      next(error)
    }
  }
})

// PUT /api/seasons/:id - Update season
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string
    const userId = getUserId(req, res)
    if (!userId) return

    const season = await seasonService.update(id, userId, {
      name: req.body.name,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      durationWeeks: req.body.durationWeeks !== undefined ? Number(req.body.durationWeeks) : undefined,
      utilityRate: req.body.utilityRate !== undefined ? Number(req.body.utilityRate) : undefined,
      themeAllocations: req.body.themeAllocations,
    })

    res.json(season)
  } catch (error) {
    if (error instanceof Error && error.message === 'Season not found') {
      next(createError(404, 'NOT_FOUND', 'Season not found'))
    } else {
      next(error)
    }
  }
})

// POST /api/seasons/:id/grading/submit - Submit batch grading for a season
router.post('/:id/grading/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const seasonId = req.params.id as string
    const userId = getUserId(req, res)
    if (!userId) return

    const { gradingType, gradings } = req.body as {
      gradingType: 'mid_season' | 'end_season'
      gradings: Array<{
        cardId: string
        results: { criterion: string; passed: boolean }[]
        notes?: string
        markComplete: boolean
      }>
    }

    // Validate gradingType
    if (!gradingType || !['mid_season', 'end_season'].includes(gradingType)) {
      throw createError(400, 'VALIDATION_ERROR', 'Invalid grading type. Must be mid_season or end_season.')
    }

    // Validate gradings array
    if (!gradings || !Array.isArray(gradings) || gradings.length === 0) {
      throw createError(400, 'VALIDATION_ERROR', 'Gradings array is required and must not be empty.')
    }

    // Verify season exists and belongs to user
    const season = await seasonService.getById(seasonId, userId)
    if (!season) {
      throw createError(404, 'NOT_FOUND', 'Season not found')
    }

    const reviewAvailability = getSeasonReviewAvailability(season)
    if (!reviewAvailability.availableType) {
      throw createError(400, 'VALIDATION_ERROR', 'Season review is locked until 40% progress.')
    }
    if (gradingType !== reviewAvailability.availableType) {
      throw createError(
        400,
        'VALIDATION_ERROR',
        `Invalid grading type for current season timing. Use ${reviewAvailability.availableType}.`
      )
    }

    // Submit all gradings atomically
    const result = await eventService.submitSeasonGrading(userId, seasonId, gradingType, gradings)

    res.json({
      success: true,
      gradedCount: result.gradedCount,
      completedCount: result.completedCount,
    })
  } catch (error) {
    console.error('Season grading submission failed:', { seasonId: req.params.id, gradingType: req.body?.gradingType, gradingCount: req.body?.gradings?.length, error: error instanceof Error ? error.message : error })
    next(error)
  }
})

// GET /api/seasons/:id/gradings - Get grading history for a season
router.get('/:id/gradings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const seasonId = req.params.id as string
    const userId = getUserId(req, res)
    if (!userId) return

    // Verify season exists and belongs to user
    const season = await seasonService.getById(seasonId, userId)
    if (!season) {
      throw createError(404, 'NOT_FOUND', 'Season not found')
    }

    // Fetch grading events for this season
    const gradings = await eventService.getSeasonGradings(userId, seasonId)

    res.json(gradings)
  } catch (error) {
    next(error)
  }
})

// DELETE /api/seasons/:id - Delete season
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string
    const userId = getUserId(req, res)
    if (!userId) return

    await seasonService.delete(id, userId)
    res.status(204).send()
  } catch (error) {
    if (error instanceof Error && error.message === 'Season not found') {
      next(createError(404, 'NOT_FOUND', 'Season not found'))
    } else {
      next(error)
    }
  }
})

export default router
