import { Router, Request, Response, NextFunction } from 'express'
import { stripe, STRIPE_CONFIG } from '../../services/stripe'
import { prisma } from '../../lib/db'

const router = Router()

/**
 * @openapi
 * /api/billing/subscription:
 *   get:
 *     summary: Get user subscription status
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Subscription details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tier:
 *                   type: string
 *                   enum: [free, pro]
 *                 status:
 *                   type: string
 *                 periodEnd:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get('/subscription', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        },
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
        subscriptionPeriodEnd: true,
        stripeCustomerId: true,
      },
    })

    if (!user) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      })
    }

    return res.json({
      tier: user.subscriptionTier,
      status: user.subscriptionStatus,
      periodEnd: user.subscriptionPeriodEnd,
      hasPaymentMethod: !!user.stripeCustomerId,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * @openapi
 * /api/billing/create-checkout-session:
 *   post:
 *     summary: Create Stripe Checkout session for Pro subscription
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Checkout session created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   description: Stripe Checkout URL
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.post('/create-checkout-session', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id
    const userEmail = req.user?.email

    if (!userId || !userEmail) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        },
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    })

    if (!user) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      })
    }

    // Create or retrieve Stripe customer
    let customerId = user.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { userId },
      })
      customerId = customer.id

      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      })
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_CONFIG.proPriceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      success_url: `${STRIPE_CONFIG.appUrl}/settings?upgrade=success`,
      cancel_url: `${STRIPE_CONFIG.appUrl}/settings?upgrade=canceled`,
      metadata: { userId },
    })

    return res.json({ url: session.url })
  } catch (error) {
    next(error)
  }
})

/**
 * @openapi
 * /api/billing/create-portal-session:
 *   post:
 *     summary: Create Stripe Customer Portal session
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Portal session created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.post('/create-portal-session', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
        },
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    })

    if (!user?.stripeCustomerId) {
      return res.status(400).json({
        error: {
          code: 'NO_CUSTOMER',
          message: 'No Stripe customer found',
        },
      })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${STRIPE_CONFIG.appUrl}/settings`,
    })

    return res.json({ url: session.url })
  } catch (error) {
    next(error)
  }
})

export default router
