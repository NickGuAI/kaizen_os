import { Router, Request, Response, NextFunction } from 'express'
import { startOfMonth, endOfMonth } from 'date-fns'
import prisma from '../../lib/db'

const router = Router()

const TIER_LIMITS_USD = {
  free: 5,
  pro: 15,
} as const

/**
 * @openapi
 * /api/usage/summary:
 *   get:
 *     summary: Get monthly usage summary
 *     tags: [Usage]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *         description: YYYY-MM format (defaults to current month)
 *     responses:
 *       200:
 *         description: Usage summary
 */
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const monthParam = req.query.month as string | undefined

    const now = new Date()
    const targetMonth = monthParam ? new Date(`${monthParam}-01`) : now
    const start = startOfMonth(targetMonth)
    const end = endOfMonth(targetMonth)

    const usage = await prisma.agentUsage.findMany({
      where: {
        userId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    })

    const totalCost = usage.reduce((sum, record) => sum + Number(record.costUsd), 0)
    const totalInputTokens = usage.reduce((sum, record) => sum + record.inputTokens, 0)
    const totalOutputTokens = usage.reduce((sum, record) => sum + record.outputTokens, 0)
    const sessionCount = new Set(usage.map(record => record.sessionId)).size

    res.json({
      month: targetMonth.toISOString().slice(0, 7),
      totalCostUsd: totalCost.toFixed(6),
      totalInputTokens,
      totalOutputTokens,
      sessionCount,
      requestCount: usage.length,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * @openapi
 * /api/usage/sessions:
 *   get:
 *     summary: Get per-session usage breakdown
 *     tags: [Usage]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Max sessions to return (default 50)
 *     responses:
 *       200:
 *         description: Session usage list
 */
router.get('/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id
    const limit = parseInt(req.query.limit as string, 10) || 50

    const sessions = await prisma.agentSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        agentUsage: true,
      },
    })

    const result = sessions.map((session) => {
      const totalCost = session.agentUsage.reduce((sum, record) => sum + Number(record.costUsd), 0)
      const totalInputTokens = session.agentUsage.reduce((sum, record) => sum + record.inputTokens, 0)
      const totalOutputTokens = session.agentUsage.reduce((sum, record) => sum + record.outputTokens, 0)

      return {
        sessionId: session.id,
        title: session.title,
        createdAt: session.createdAt,
        requestCount: session.agentUsage.length,
        totalCostUsd: totalCost.toFixed(6),
        totalInputTokens,
        totalOutputTokens,
      }
    })

    res.json(result)
  } catch (error) {
    next(error)
  }
})

/**
 * @openapi
 * /api/usage/balance:
 *   get:
 *     summary: Get credit balance
 *     tags: [Usage]
 *     responses:
 *       200:
 *         description: Credit balance
 */
router.get('/balance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        creditBalanceUsd: true,
        subscriptionTier: true,
        subscriptionPeriodEnd: true,
        lastCreditRefreshAt: true,
      },
    })

    if (!user) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'User not found' },
      })
    }

    const tier = user.subscriptionTier === 'pro' ? 'pro' : 'free'
    const tierLimitUsd = TIER_LIMITS_USD[tier]
    const balanceUsd = Number(user.creditBalanceUsd)
    const usedUsd = Math.max(0, tierLimitUsd - balanceUsd)

    res.json({
      balanceUsd: balanceUsd.toFixed(2),
      tier,
      tierLimitUsd: tierLimitUsd.toFixed(2),
      usedUsd: usedUsd.toFixed(2),
      periodEnd: tier === 'pro' ? user.subscriptionPeriodEnd : null,
      lastRefresh: user.lastCreditRefreshAt ?? null,
    })
  } catch (error) {
    next(error)
  }
})

export default router
