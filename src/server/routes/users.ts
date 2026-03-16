import { Router, Request, Response, NextFunction } from 'express'
import { userService } from '../../services/userService'
import prisma from '../../lib/db'

const router = Router()

/**
 * @openapi
 * /api/users/settings:
 *   get:
 *     summary: Get user settings
 *     tags:
 *       - Users
 *     responses:
 *       200:
 *         description: User settings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *   put:
 *     summary: Update user settings
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GenericObject'
 *     responses:
 *       200:
 *         description: Updated settings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObject'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get('/settings', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = _req.user?.id
    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      })
    }
    const settings = await userService.getSettings(userId)
    res.json(settings)
  } catch (error) {
    next(error)
  }
})

router.put('/settings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      })
    }
    const settings = await userService.updateSettings(userId, req.body)
    res.json(settings)
  } catch (error) {
    next(error)
  }
})

/**
 * @openapi
 * /api/users/timezone:
 *   get:
 *     summary: Get user timezone
 *     tags:
 *       - Users
 *     responses:
 *       200:
 *         description: User timezone
 *   put:
 *     summary: Update user timezone
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               timezone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated timezone
 */
router.get('/timezone', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      })
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    })
    res.json({ timezone: user?.timezone || 'America/Los_Angeles' })
  } catch (error) {
    next(error)
  }
})

router.put('/timezone', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      })
    }
    const { timezone } = req.body
    if (!timezone || typeof timezone !== 'string') {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'timezone is required',
        },
      })
    }
    const user = await prisma.user.update({
      where: { id: userId },
      data: { timezone },
      select: { timezone: true },
    })
    res.json({ timezone: user.timezone })
  } catch (error) {
    next(error)
  }
})

export default router
