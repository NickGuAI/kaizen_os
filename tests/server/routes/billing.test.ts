import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import express, { Express, Request, Response, NextFunction } from 'express'

// Mock Stripe
const mockCheckoutSessionCreate = vi.fn()
const mockPortalSessionCreate = vi.fn()
const mockCustomerCreate = vi.fn()

vi.mock('@/services/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: mockCheckoutSessionCreate,
      },
    },
    billingPortal: {
      sessions: {
        create: mockPortalSessionCreate,
      },
    },
    customers: {
      create: mockCustomerCreate,
    },
  },
  STRIPE_CONFIG: {
    proPriceId: 'price_test_123',
    webhookSecret: 'whsec_test',
    publishableKey: 'pk_test',
    appUrl: 'http://localhost:3000',
  },
}))

// Mock Prisma
const mockFindUnique = vi.fn()
const mockUpdate = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
  },
}))

import billingRouter from '@/server/routes/billing'

describe('Billing API Routes', () => {
  let app: Express
  const testUserId = 'user-123'
  const testUserEmail = 'test@example.com'

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use((req: Request, _res: Response, next: NextFunction) => {
      req.user = { id: testUserId, email: testUserEmail } as any
      next()
    })
    app.use('/api/billing', billingRouter)

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /subscription', () => {
    it('returns subscription data for authenticated user', async () => {
      mockFindUnique.mockResolvedValue({
        subscriptionTier: 'pro',
        subscriptionStatus: 'active',
        subscriptionPeriodEnd: new Date('2025-02-01'),
        stripeCustomerId: 'cus_123',
      })

      const response = await request(app).get('/api/billing/subscription')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        tier: 'pro',
        status: 'active',
        periodEnd: expect.any(String),
        hasPaymentMethod: true,
      })
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: testUserId },
        select: {
          subscriptionTier: true,
          subscriptionStatus: true,
          subscriptionPeriodEnd: true,
          stripeCustomerId: true,
        },
      })
    })

    it('returns free tier for user without subscription', async () => {
      mockFindUnique.mockResolvedValue({
        subscriptionTier: 'free',
        subscriptionStatus: 'none',
        subscriptionPeriodEnd: null,
        stripeCustomerId: null,
      })

      const response = await request(app).get('/api/billing/subscription')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        tier: 'free',
        status: 'none',
        periodEnd: null,
        hasPaymentMethod: false,
      })
    })

    it('returns 404 when user not found', async () => {
      mockFindUnique.mockResolvedValue(null)

      const response = await request(app).get('/api/billing/subscription')

      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('NOT_FOUND')
    })
  })

  describe('POST /create-checkout-session', () => {
    it('creates checkout session for user without Stripe customer', async () => {
      mockFindUnique.mockResolvedValue({ stripeCustomerId: null })
      mockCustomerCreate.mockResolvedValue({ id: 'cus_new_123' })
      mockUpdate.mockResolvedValue({})
      mockCheckoutSessionCreate.mockResolvedValue({
        url: 'https://checkout.stripe.com/session_123',
      })

      const response = await request(app).post('/api/billing/create-checkout-session')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        url: 'https://checkout.stripe.com/session_123',
      })
      expect(mockCustomerCreate).toHaveBeenCalledWith({
        email: testUserEmail,
        metadata: { userId: testUserId },
      })
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: testUserId },
        data: { stripeCustomerId: 'cus_new_123' },
      })
    })

    it('uses existing Stripe customer if present', async () => {
      mockFindUnique.mockResolvedValue({ stripeCustomerId: 'cus_existing_123' })
      mockCheckoutSessionCreate.mockResolvedValue({
        url: 'https://checkout.stripe.com/session_456',
      })

      const response = await request(app).post('/api/billing/create-checkout-session')

      expect(response.status).toBe(200)
      expect(mockCustomerCreate).not.toHaveBeenCalled()
      expect(mockCheckoutSessionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_existing_123',
          mode: 'subscription',
        })
      )
    })

    it('returns 404 when user not found', async () => {
      mockFindUnique.mockResolvedValue(null)

      const response = await request(app).post('/api/billing/create-checkout-session')

      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('NOT_FOUND')
    })
  })

  describe('POST /create-portal-session', () => {
    it('creates portal session for user with Stripe customer', async () => {
      mockFindUnique.mockResolvedValue({ stripeCustomerId: 'cus_123' })
      mockPortalSessionCreate.mockResolvedValue({
        url: 'https://billing.stripe.com/portal_123',
      })

      const response = await request(app).post('/api/billing/create-portal-session')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        url: 'https://billing.stripe.com/portal_123',
      })
      expect(mockPortalSessionCreate).toHaveBeenCalledWith({
        customer: 'cus_123',
        return_url: 'http://localhost:3000/settings',
      })
    })

    it('returns 400 when user has no Stripe customer', async () => {
      mockFindUnique.mockResolvedValue({ stripeCustomerId: null })

      const response = await request(app).post('/api/billing/create-portal-session')

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('NO_CUSTOMER')
    })
  })
})
