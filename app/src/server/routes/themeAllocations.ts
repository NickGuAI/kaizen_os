import { Router, Request, Response } from 'express'
import prisma from '../../lib/db'

const router = Router()

/**
 * @openapi
 * /api/allocations/season/{seasonId}:
 *   get:
 *     summary: List theme allocations for a season
 *     tags:
 *       - Allocations
 *     parameters:
 *       - in: path
 *         name: seasonId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Allocations
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericArray'
 * /api/allocations/season/{seasonId}/theme/{themeId}:
 *   get:
 *     summary: Get allocation for a theme
 *     tags:
 *       - Allocations
 *     parameters:
 *       - in: path
 *         name: seasonId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: themeId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Allocation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 *   put:
 *     summary: Update allocation for a theme
 *     tags:
 *       - Allocations
 *     parameters:
 *       - in: path
 *         name: seasonId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: themeId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               allocation:
 *                 type: number
 *             required:
 *               - allocation
 *     responses:
 *       200:
 *         description: Updated allocation
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

// Get all allocations for a season
router.get('/season/:seasonId', async (req: Request, res: Response) => {
  try {
    const seasonId = req.params.seasonId as string
    const userId = getUserId(req, res)
    if (!userId) return
    const season = await prisma.season.findFirst({
      where: { id: seasonId, userId },
      select: { themeAllocations: true },
    })
    
    if (!season) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Season not found' } })
    }
    
    // Convert JSON to array format for API compatibility
    const allocations = season.themeAllocations as Record<string, number> || {}
    const result = Object.entries(allocations).map(([themeId, allocation]) => ({
      seasonId,
      themeId,
      allocation,
    }))
    
    res.json(result)
  } catch (error) {
    console.error('Failed to get allocations:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get allocations' } })
  }
})

// Get allocation for a specific theme in a season
router.get('/season/:seasonId/theme/:themeId', async (req: Request, res: Response) => {
  try {
    const seasonId = req.params.seasonId as string
    const themeId = req.params.themeId as string
    const userId = getUserId(req, res)
    if (!userId) return
    
    const season = await prisma.season.findFirst({
      where: { id: seasonId, userId },
      select: { themeAllocations: true },
    })
    
    if (!season) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Season not found' } })
    }
    
    const allocations = season.themeAllocations as Record<string, number> || {}
    const allocation = allocations[themeId] ?? 0
    
    res.json({ seasonId, themeId, allocation })
  } catch (error) {
    console.error('Failed to get allocation:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get allocation' } })
  }
})

// Set/update allocation for a theme in a season
router.put('/season/:seasonId/theme/:themeId', async (req: Request, res: Response) => {
  try {
    const seasonId = req.params.seasonId as string
    const themeId = req.params.themeId as string
    const { allocation } = req.body
    const userId = getUserId(req, res)
    if (!userId) return
    
    if (typeof allocation !== 'number' || allocation < 0 || allocation > 1) {
      return res.status(400).json({ 
        error: { code: 'VALIDATION_ERROR', message: 'Allocation must be a number between 0 and 1' } 
      })
    }

    const season = await prisma.season.findFirst({
      where: { id: seasonId, userId },
    })
    
    if (!season) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Season not found' } })
    }

    const currentAllocations = season.themeAllocations as Record<string, number> || {}
    const updatedAllocations = {
      ...currentAllocations,
      [themeId]: allocation,
    }

    await prisma.season.update({
      where: { id: seasonId },
      data: { themeAllocations: updatedAllocations },
    })
    
    res.json({ seasonId, themeId, allocation })
  } catch (error) {
    console.error('Failed to update allocation:', error)
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update allocation' } })
  }
})

export default router
