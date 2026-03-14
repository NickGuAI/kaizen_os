import { Router, Request, Response, NextFunction } from 'express'
import { UnitType, TaskStatus } from '@prisma/client'
import prisma from '../../lib/db'
import { catalog } from '../../services/catalog'
import { validateCreateCard, validateUpdateCard, formatValidationErrors } from '../../lib/validation'
import {
  Theme,
  ThemeWithStats,
  Action,
  Veto,
} from '../../domain/entities'
import { actionTypeToUnitType, isActionUnitType, ACTION_UNIT_TYPES, toAction } from '../../repositories/prisma/mappers'
import { getUserSettings } from '../../services/userSettingsTypes'
import { eventService } from '../../services/eventService'

const router = Router()

/**
 * @openapi
 * /api/cards:
 *   get:
 *     summary: List cards
 *     tags:
 *       - Cards
 *     parameters:
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cards
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericArray'
 *   post:
 *     summary: Create a card
 *     tags:
 *       - Cards
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenericObject'
 *     responses:
 *       200:
 *         description: Created card
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/cards/vetoes:
 *   get:
 *     summary: List veto cards
 *     tags:
 *       - Cards
 *     responses:
 *       200:
 *         description: Veto cards
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericArray'
 * /api/cards/active-actions:
 *   get:
 *     summary: List active actions
 *     tags:
 *       - Cards
 *     responses:
 *       200:
 *         description: Active actions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericArray'
 * /api/cards/themes/{id}/backlog:
 *   get:
 *     summary: Get theme backlog
 *     tags:
 *       - Cards
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Theme backlog
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericArray'
 * /api/cards/{id}:
 *   get:
 *     summary: Get card by ID
 *     tags:
 *       - Cards
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Card
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 *   put:
 *     summary: Update a card
 *     tags:
 *       - Cards
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
 *         description: Updated card
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 *   delete:
 *     summary: Delete a card
 *     tags:
 *       - Cards
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Card deleted
 * /api/cards/{id}/children:
 *   get:
 *     summary: List card children
 *     tags:
 *       - Cards
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Card children
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericArray'
 * /api/cards/{id}/hierarchy:
 *   get:
 *     summary: Get card hierarchy
 *     tags:
 *       - Cards
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Card hierarchy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 * /api/cards/{id}/child-count:
 *   get:
 *     summary: Get child count for a card
 *     tags:
 *       - Cards
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Child count
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 */
// Helper to create API errors
function createError(statusCode: number, code: string, message: string, details?: Record<string, string[]>) {
  const error = new Error(message) as Error & { statusCode: number; code: string; details?: Record<string, string[]> }
  error.statusCode = statusCode
  error.code = code
  if (details) error.details = details
  return error
}

// =============================================================================
// CARD RESPONSE TYPES (unified API shape)
// =============================================================================

interface CardResponse {
  id: string
  userId: string
  parentId: string | null
  title: string
  description: string | null
  unitType: UnitType
  status: TaskStatus
  targetDate: Date | null
  completionDate: Date | null
  startDate: Date | null
  seasonId: string | null
  lagWeeks: number | null
  criteria: string[]
  tags: Record<string, string>
  createdAt: Date
  updatedAt: Date
  // Optional computed fields
  actionCount?: number
  children?: CardResponse[]
}

// =============================================================================
// MAPPERS: Domain entities -> Card API response
// =============================================================================

function themeToCard(theme: Theme | ThemeWithStats): CardResponse {
  return {
    id: theme.id,
    userId: theme.userId,
    parentId: null,
    title: theme.title,
    description: theme.description,
    unitType: 'THEME',
    status: 'not_started',
    targetDate: null,
    completionDate: null,
    startDate: null,
    seasonId: null,
    lagWeeks: null,
    criteria: [],
    tags: {},
    createdAt: theme.createdAt,
    updatedAt: theme.updatedAt,
    actionCount: 'activeActionCount' in theme ? theme.activeActionCount : undefined,
  }
}

function actionToCard(action: Action): CardResponse {
  const unitType = actionTypeToUnitType(action.actionType)
  return {
    id: action.id,
    userId: action.userId,
    parentId: action.parentId,
    title: action.title,
    description: action.description,
    unitType,
    status: action.status as TaskStatus,
    targetDate: 'targetDate' in action ? action.targetDate : null,
    completionDate: 'completionDate' in action ? action.completionDate : null,
    startDate: action.startDate,
    seasonId: action.seasonId,
    lagWeeks: action.actionType === 'experiment' ? action.lagWeeks : null,
    criteria: 'criteria' in action ? action.criteria : [],
    tags: {},
    createdAt: action.createdAt,
    updatedAt: action.updatedAt,
  }
}

function vetoToCard(veto: Veto): CardResponse {
  return {
    id: veto.id,
    userId: veto.userId,
    parentId: null,
    title: veto.title,
    description: veto.description,
    unitType: 'VETO',
    status: 'not_started',
    targetDate: null,
    completionDate: null,
    startDate: null,
    seasonId: null,
    lagWeeks: null,
    criteria: [],
    tags: {},
    createdAt: veto.createdAt,
    updatedAt: veto.updatedAt,
  }
}

// =============================================================================
// ROUTES
// =============================================================================

// GET /api/cards - List cards (with optional type filter)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type } = req.query

    if (type) {
      const unitType = type as UnitType
      let cards: CardResponse[]

      if (unitType === 'THEME') {
        const themes = await catalog.themes.findAll(req.user!.id)
        cards = themes.map(themeToCard)
      } else if (isActionUnitType(unitType)) {
        const actions = await catalog.actions.findAll(req.user!.id)
        cards = actions
          .filter(a => actionTypeToUnitType(a.actionType) === unitType)
          .map(actionToCard)
      } else if (unitType === 'VETO') {
        const vetoes = await catalog.vetoes.findAll(req.user!.id)
        cards = vetoes.map(vetoToCard)
      } else {
        cards = []
      }

      return res.json(cards)
    }

    // Return themes with stats by default
    const themes = await catalog.themes.findAllWithStats(req.user!.id)
    res.json(themes.map(themeToCard))
  } catch (error) {
    next(error)
  }
})

// GET /api/cards/vetoes - Get global vetoes (Don't-Do List)
router.get('/vetoes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vetoes = await catalog.vetoes.findAll(req.user!.id)
    res.json(vetoes.map(vetoToCard))
  } catch (error) {
    next(error)
  }
})

// GET /api/cards/active-actions - Get active actions with parent theme info
router.get('/active-actions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actions = await catalog.actions.findActive(req.user!.id)

    // Collect unique parentIds and fetch all parent themes in ONE query
    const parentIds = [...new Set(actions.map(a => a.parentId).filter(Boolean))] as string[]
    const themes = parentIds.length > 0
      ? await catalog.themes.findByIds(req.user!.id, parentIds)
      : []

    // Build lookup map for O(1) access
    const themeMap = new Map(themes.map(t => [t.id, { id: t.id, title: t.title }]))

    // Map actions with their parent theme (no additional queries)
    const actionsWithTheme = actions.map(action => {
      const card = actionToCard(action)
      const parentTheme = action.parentId ? themeMap.get(action.parentId) || null : null
      return { ...card, parentTheme }
    })

    res.json(actionsWithTheme)
  } catch (error) {
    next(error)
  }
})

// GET /api/cards/review-options - Get themes and actions for review classification
router.get('/review-options', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [themes, actions] = await Promise.all([
      catalog.themes.findAll(req.user!.id),
      catalog.actions.findAll(req.user!.id),
    ])

    const cards = [
      ...themes.map(themeToCard),
      ...actions.map(actionToCard),
    ]

    res.json(cards)
  } catch (error) {
    next(error)
  }
})

// GET /api/cards/themes/:id/backlog - Get backlog items for a theme
router.get('/themes/:id/backlog', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string

    const actions = await catalog.actions.findBacklog(req.user!.id, id)
    res.json(actions.map(actionToCard))
  } catch (error) {
    next(error)
  }
})


// GET /api/cards/ops-review - Ops cards due/overdue for a review week
router.get('/ops-review', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const weekStart = req.query.weekStart as string
    if (!weekStart) {
      throw createError(400, 'VALIDATION_ERROR', 'weekStart query parameter is required')
    }

    const start = new Date(weekStart)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)

    // Ops cards due this week or overdue (targetDate <= weekEnd)
    const cards = await prisma.card.findMany({
      where: {
        userId: req.user!.id,
        unitType: 'ACTION_OPS',
        status: { in: ['in_progress', 'not_started'] },
        targetDate: { lte: end },
      },
      orderBy: [{ targetDate: 'asc' }, { createdAt: 'asc' }],
    })

    // Fetch parent themes for grouping
    const parentIds = [...new Set(cards.map(c => c.parentId).filter(Boolean))] as string[]
    const themes = parentIds.length > 0
      ? await catalog.themes.findByIds(req.user!.id, parentIds)
      : []
    const themeMap = new Map(themes.map(t => [t.id, { id: t.id, title: t.title }]))

    const ops = cards.map(card => ({
      ...actionToCard(toAction(card)),
      parentTheme: card.parentId ? themeMap.get(card.parentId) || null : null,
      overdue: card.targetDate ? card.targetDate < start : false,
    }))

    res.json(ops)
  } catch (error) {
    next(error)
  }
})

// GET /api/cards/week-summary - Completed + active ops for the review week
router.get('/week-summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const weekStart = req.query.weekStart as string
    if (!weekStart) {
      throw createError(400, 'VALIDATION_ERROR', 'weekStart query parameter is required')
    }

    const start = new Date(weekStart)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)

    // Ops completed during or before this week with completionDate in the week
    const completedCards = await prisma.card.findMany({
      where: {
        userId: req.user!.id,
        unitType: 'ACTION_OPS',
        status: 'completed',
        completionDate: { gte: start, lte: end },
      },
      orderBy: [{ completionDate: 'desc' }],
    })

    // Active ops (in_progress)
    const activeCards = await prisma.card.findMany({
      where: {
        userId: req.user!.id,
        unitType: 'ACTION_OPS',
        status: 'in_progress',
      },
      orderBy: [{ targetDate: 'asc' }, { createdAt: 'asc' }],
    })

    // Fetch parent themes
    const allCards = [...completedCards, ...activeCards]
    const parentIds = [...new Set(allCards.map(c => c.parentId).filter(Boolean))] as string[]
    const themes = parentIds.length > 0
      ? await catalog.themes.findByIds(req.user!.id, parentIds)
      : []
    const themeMap = new Map(themes.map(t => [t.id, { id: t.id, title: t.title }]))

    const mapCard = (card: typeof allCards[0]) => ({
      ...actionToCard(toAction(card)),
      parentTheme: card.parentId ? themeMap.get(card.parentId) || null : null,
    })

    res.json({
      completed: completedCards.map(mapCard),
      active: activeCards.map(mapCard),
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/cards/week-reviewed - Check if a week has been reviewed
router.get('/week-reviewed', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const weekStart = req.query.weekStart as string
    if (!weekStart) {
      throw createError(400, 'VALIDATION_ERROR', 'weekStart query parameter is required')
    }

    const idempotencyKey = `week_reviewed:${req.user!.id}-${weekStart}`
    const existing = await prisma.event.findFirst({
      where: { userId: req.user!.id, idempotencyKey },
    })

    res.json({ reviewed: !!existing })
  } catch (error) {
    next(error)
  }
})

// POST /api/cards/week-reviewed - Mark a week as reviewed
router.post('/week-reviewed', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { weekStart } = req.body
    if (!weekStart) {
      throw createError(400, 'VALIDATION_ERROR', 'weekStart is required')
    }

    await eventService.log({
      userId: req.user!.id,
      eventType: 'week_reviewed',
      payload: { weekStart },
      idempotencyKey: `week_reviewed:${req.user!.id}-${weekStart}`,
    })

    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

// GET /api/cards/backlog-review - All backlogged cards with WIP availability
router.get('/backlog-review', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id

    const cards = await prisma.card.findMany({
      where: {
        userId,
        unitType: { in: ACTION_UNIT_TYPES },
        status: 'backlog',
      },
      orderBy: [{ parentId: 'asc' }, { unitType: 'asc' }, { createdAt: 'asc' }],
    })

    const parentIds = [...new Set(cards.map(c => c.parentId).filter(Boolean))] as string[]
    const themes = parentIds.length > 0
      ? await catalog.themes.findByIds(userId, parentIds)
      : []
    const themeMap = new Map(themes.map(t => [t.id, { id: t.id, title: t.title }]))

    // WIP info: active counts per theme+type
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { settings: true } })
    const settings = getUserSettings(user?.settings)

    const activeCounts = await prisma.card.groupBy({
      by: ['parentId', 'unitType'],
      where: {
        userId,
        unitType: { in: ACTION_UNIT_TYPES },
        status: 'in_progress',
        parentId: { in: parentIds },
      },
      _count: true,
    })

    const wipInfo: Record<string, Record<string, { active: number; limit: number }>> = {}
    for (const themeId of parentIds) {
      wipInfo[themeId] = {}
      for (const ut of ACTION_UNIT_TYPES) {
        const count = activeCounts.find(c => c.parentId === themeId && c.unitType === ut)
        const limit = (() => {
          switch (ut) {
            case 'ACTION_GATE': return settings.maxGatesPerTheme
            case 'ACTION_EXPERIMENT': return settings.maxExperimentsPerTheme
            case 'ACTION_ROUTINE': return settings.maxRoutinesPerTheme
            case 'ACTION_OPS': return settings.maxOpsPerTheme
            default: return Infinity
          }
        })()
        wipInfo[themeId][ut] = { active: count?._count ?? 0, limit }
      }
    }

    const backlog = cards.map(card => ({
      ...actionToCard(toAction(card)),
      parentTheme: card.parentId ? themeMap.get(card.parentId) || null : null,
    }))

    res.json({ backlog, wipInfo })
  } catch (error) {
    next(error)
  }
})

// GET /api/cards/:id - Get card by ID (dispatches based on unitType lookup)
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string

    // Try each repository in order: theme -> action -> veto
    const theme = await catalog.themes.findByIdWithChildren(req.user!.id, id)
    if (theme) {
      const card = themeToCard(theme)
      card.children = theme.children.map(actionToCard)
      return res.json(card)
    }

    const actionWithChildren = await catalog.actions.findByIdWithChildren(req.user!.id, id)
    if (actionWithChildren) {
      const card = actionToCard(actionWithChildren.action)
      return res.json(card)
    }

    const veto = await catalog.vetoes.findById(req.user!.id, id)
    if (veto) {
      return res.json(vetoToCard(veto))
    }

    throw createError(404, 'NOT_FOUND', 'Card not found')
  } catch (error) {
    next(error)
  }
})

// GET /api/cards/:id/children - Get children of a card
router.get('/:id/children', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string

    const { type } = req.query

    const card = await prisma.card.findFirst({
      where: { id, userId: req.user!.id },
      select: { unitType: true },
    })

    if (!card) {
      throw createError(404, 'NOT_FOUND', 'Card not found')
    }

    if (card.unitType !== 'THEME') {
      return res.json([]) // Actions and vetoes have no children
    }

    if (type && isActionUnitType(type as UnitType)) {
      // Filter by action type
      const actionType = unitTypeToActionType(type as UnitType)
      if (actionType) {
        const actions = await catalog.actions.findByParentAndType(req.user!.id, id, actionType)
        return res.json(actions.map(actionToCard))
      }
    }
    const actions = await catalog.actions.findByParent(req.user!.id, id)
    return res.json(actions.map(actionToCard))
  } catch (error) {
    next(error)
  }
})

// Helper to convert UnitType to actionType
function unitTypeToActionType(unitType: UnitType): Action['actionType'] | null {
  switch (unitType) {
    case 'ACTION_GATE': return 'gate'
    case 'ACTION_EXPERIMENT': return 'experiment'
    case 'ACTION_ROUTINE': return 'routine'
    case 'ACTION_OPS': return 'ops'
    default: return null
  }
}

// GET /api/cards/:id/hierarchy - Get hierarchy path
router.get('/:id/hierarchy', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string

    // Try each repository to find the entity and get its hierarchy
    const theme = await catalog.themes.findById(req.user!.id, id)
    if (theme) {
      const hierarchy = await catalog.themes.getHierarchy(req.user!.id, id)
      return res.json(hierarchy.map(themeToCard))
    }

    const action = await catalog.actions.findById(req.user!.id, id)
    if (action) {
      const hierarchy = await catalog.actions.getHierarchy(req.user!.id, id)
      return res.json(hierarchy.map(item => {
        if ('actionType' in item) return actionToCard(item as Action)
        return themeToCard(item as Theme)
      }))
    }

    const veto = await catalog.vetoes.findById(req.user!.id, id)
    if (veto) {
      return res.json([vetoToCard(veto)])
    }

    throw createError(404, 'NOT_FOUND', 'Card not found')
  } catch (error) {
    next(error)
  }
})


// POST /api/cards - Create new card
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = validateCreateCard(req.body)
    if (!validation.valid) {
      throw createError(400, 'VALIDATION_ERROR', 'Validation failed', formatValidationErrors(validation.errors))
    }

    const { unitType, title, description, parentId, status, targetDate, startDate, seasonId, lagWeeks, criteria } = req.body

    let card: CardResponse

    if (unitType === 'THEME') {
      const theme = await catalog.themes.create(req.user!.id, {
        title,
        description,
      })
      card = themeToCard(theme)
    } else if (isActionUnitType(unitType as UnitType)) {
      const actionType = unitTypeToActionType(unitType as UnitType)
      if (!actionType || !parentId) {
        throw createError(400, 'VALIDATION_ERROR', 'Actions require a parentId')
      }
      
      const baseInput = {
        parentId,
        title,
        description,
        status: status || 'not_started',
        startDate: startDate ? new Date(startDate) : undefined,
        seasonId,
      }

      let action: Action
      if (actionType === 'experiment') {
        action = await catalog.actions.create(req.user!.id, {
          ...baseInput,
          actionType: 'experiment',
          targetDate: targetDate ? new Date(targetDate) : undefined,
          lagWeeks: lagWeeks ?? 6,
          criteria: criteria || [],
        })
      } else if (actionType === 'gate') {
        action = await catalog.actions.create(req.user!.id, {
          ...baseInput,
          actionType: 'gate',
          targetDate: targetDate ? new Date(targetDate) : undefined,
          criteria: criteria || [],
        })
      } else if (actionType === 'routine') {
        action = await catalog.actions.create(req.user!.id, {
          ...baseInput,
          actionType: 'routine',
        })
      } else {
        action = await catalog.actions.create(req.user!.id, {
          ...baseInput,
          actionType: 'ops',
          targetDate: targetDate ? new Date(targetDate) : undefined,
        })
      }
      card = actionToCard(action)
    } else if (unitType === 'VETO') {
      const veto = await catalog.vetoes.create(req.user!.id, {
        title,
        description,
      })
      card = vetoToCard(veto)
    } else {
      throw createError(400, 'VALIDATION_ERROR', `Unknown unitType: ${unitType}`)
    }

    res.status(201).json(card)
  } catch (error) {
    if (error instanceof Error && error.message.includes('WIP limit')) {
      next(createError(400, 'WIP_LIMIT_REACHED', error.message))
    } else {
      next(error)
    }
  }
})

// PUT /api/cards/:id - Update card
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string

    const validation = validateUpdateCard(req.body)
    if (!validation.valid) {
      throw createError(400, 'VALIDATION_ERROR', 'Validation failed', formatValidationErrors(validation.errors))
    }

    const { title, description, status, targetDate, startDate, completionDate, seasonId, lagWeeks, criteria } = req.body

    // Try each repository to find and update
    const theme = await catalog.themes.findById(req.user!.id, id)
    if (theme) {
      const updated = await catalog.themes.update(req.user!.id, id, {
        title,
        description,
      })
      return res.json(themeToCard(updated))
    }

    const action = await catalog.actions.findById(req.user!.id, id)
    if (action) {
      const updated = await catalog.actions.update(req.user!.id, id, {
        title,
        description,
        status,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
        targetDate: targetDate !== undefined ? (targetDate ? new Date(targetDate) : null) : undefined,
        completionDate: completionDate !== undefined ? (completionDate ? new Date(completionDate) : null) : undefined,
        seasonId,
        lagWeeks,
        criteria,
      })

      // Sync routine title change to linked Google Calendar event
      // Use updated.title (trimmed by repository) to match stored card title
      const titleChanged = updated.title !== action.title
      if (titleChanged && action.actionType === 'routine') {
        const { syncRoutineTitleToCalendar } = await import('../../services/calendar/routineLinkService')
        syncRoutineTitleToCalendar(req.user!.id, id, updated.title).catch((err) => {
          console.error('Failed to sync routine title to calendar:', err)
        })
      }

      return res.json(actionToCard(updated))
    }

    const veto = await catalog.vetoes.findById(req.user!.id, id)
    if (veto) {
      const updated = await catalog.vetoes.update(req.user!.id, id, {
        title,
        description,
      })
      return res.json(vetoToCard(updated))
    }

    throw createError(404, 'NOT_FOUND', 'Card not found')
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        next(createError(404, 'NOT_FOUND', 'Card not found'))
      } else if (error.message.includes('WIP limit')) {
        next(createError(400, 'WIP_LIMIT_REACHED', error.message))
      } else {
        next(error)
      }
    } else {
      next(error)
    }
  }
})

// DELETE /api/cards/:id - Delete card
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string

    const cascade = req.query.cascade === 'true'

    // Try each repository to find and delete
    const theme = await catalog.themes.findById(req.user!.id, id)
    if (theme) {
      await catalog.themes.delete(req.user!.id, id, cascade)
      return res.status(204).send()
    }

    const action = await catalog.actions.findById(req.user!.id, id)
    if (action) {
      await catalog.actions.delete(req.user!.id, id, cascade)
      return res.status(204).send()
    }

    const veto = await catalog.vetoes.findById(req.user!.id, id)
    if (veto) {
      await catalog.vetoes.delete(req.user!.id, id)
      return res.status(204).send()
    }

    throw createError(404, 'NOT_FOUND', 'Card not found')
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        next(createError(404, 'NOT_FOUND', 'Card not found'))
      } else if (error.message.includes('with children')) {
        next(createError(400, 'HAS_CHILDREN', 'Cannot delete card with children'))
      } else {
        next(error)
      }
    } else {
      next(error)
    }
  }
})

// GET /api/cards/:id/child-count - Get count of direct children
router.get('/:id/child-count', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string

    // Check if it's a theme
    const theme = await catalog.themes.findById(req.user!.id, id)
    if (theme) {
      const count = await catalog.themes.getChildCount(req.user!.id, id)
      return res.json({ id, count })
    }

    // Check if it's an action
    const action = await catalog.actions.findById(req.user!.id, id)
    if (action) {
      const count = await catalog.actions.getChildCount(req.user!.id, id)
      return res.json({ id, count })
    }

    // Vetoes have no children
    const veto = await catalog.vetoes.findById(req.user!.id, id)
    if (veto) {
      return res.json({ id, count: 0 })
    }

    throw createError(404, 'NOT_FOUND', 'Card not found')
  } catch (error) {
    next(error)
  }
})

export default router
