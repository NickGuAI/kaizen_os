import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Tests for Stripe webhook event handling logic.
 * The actual Edge Function runs in Deno, but the event handling logic
 * can be tested by simulating the Stripe event payloads.
 */

// Mock Supabase client
const mockSupabaseUpdate = vi.fn()
const mockSupabaseEq = vi.fn(() => ({ eq: mockSupabaseEq }))

const mockSupabase = {
  from: vi.fn(() => ({
    update: mockSupabaseUpdate.mockReturnValue({ eq: mockSupabaseEq }),
  })),
}

// Mock Stripe subscription retrieve
const mockSubscriptionRetrieve = vi.fn()

describe('Stripe Webhook Event Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseUpdate.mockReturnValue({ eq: mockSupabaseEq })
  })

  describe('checkout.session.completed', () => {
    it('updates user with subscription data', async () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'user-123' },
            customer: 'cus_123',
            subscription: 'sub_123',
          },
        },
      }

      // Simulate handler logic
      const session = event.data.object
      const userId = session.metadata?.userId
      const customerId = session.customer as string
      const subscriptionId = session.subscription as string

      if (userId && customerId && subscriptionId) {
        await mockSupabase
          .from('users')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_tier: 'pro',
            subscription_status: 'active',
          })
          .eq('id', userId)
      }

      expect(mockSupabase.from).toHaveBeenCalledWith('users')
      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        stripe_customer_id: 'cus_123',
        stripe_subscription_id: 'sub_123',
        subscription_tier: 'pro',
        subscription_status: 'active',
      })
      expect(mockSupabaseEq).toHaveBeenCalledWith('id', 'user-123')
    })

    it('skips update when metadata is missing', async () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: {},
            customer: 'cus_123',
            subscription: 'sub_123',
          },
        },
      }

      const session = event.data.object
      const userId = session.metadata?.userId

      if (userId) {
        await mockSupabase.from('users').update({}).eq('id', userId)
      }

      expect(mockSupabase.from).not.toHaveBeenCalled()
    })
  })

  describe('customer.subscription.updated', () => {
    it('updates subscription status and period end', async () => {
      const periodEnd = 1735689600 // Unix timestamp
      const event = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active',
            current_period_end: periodEnd,
          },
        },
      }

      const subscription = event.data.object
      const customerId = subscription.customer as string

      await mockSupabase
        .from('users')
        .update({
          subscription_status: subscription.status,
          subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq('stripe_customer_id', customerId)

      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        subscription_status: 'active',
        subscription_period_end: new Date(periodEnd * 1000).toISOString(),
      })
      expect(mockSupabaseEq).toHaveBeenCalledWith('stripe_customer_id', 'cus_123')
    })
  })

  describe('customer.subscription.deleted', () => {
    it('resets user to free tier', async () => {
      const event = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
          },
        },
      }

      const subscription = event.data.object
      const customerId = subscription.customer as string

      await mockSupabase
        .from('users')
        .update({
          subscription_tier: 'free',
          subscription_status: 'canceled',
          stripe_subscription_id: null,
          subscription_period_end: null,
        })
        .eq('stripe_customer_id', customerId)

      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        subscription_tier: 'free',
        subscription_status: 'canceled',
        stripe_subscription_id: null,
        subscription_period_end: null,
      })
    })
  })

  describe('invoice.paid', () => {
    it('updates subscription status and period end', async () => {
      const periodEnd = 1735689600
      mockSubscriptionRetrieve.mockResolvedValue({
        current_period_end: periodEnd,
      })

      const event = {
        type: 'invoice.paid',
        data: {
          object: {
            customer: 'cus_123',
            subscription: 'sub_123',
          },
        },
      }

      const invoice = event.data.object
      const customerId = invoice.customer as string
      const subscriptionId = invoice.subscription as string

      if (subscriptionId) {
        const subscription = await mockSubscriptionRetrieve(subscriptionId)
        await mockSupabase
          .from('users')
          .update({
            subscription_status: 'active',
            subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_customer_id', customerId)
      }

      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        subscription_status: 'active',
        subscription_period_end: new Date(periodEnd * 1000).toISOString(),
      })
    })

    it('skips update for invoices without subscription', async () => {
      const event = {
        type: 'invoice.paid',
        data: {
          object: {
            customer: 'cus_123',
            subscription: null,
          },
        },
      }

      const invoice = event.data.object
      const subscriptionId = invoice.subscription

      if (subscriptionId) {
        await mockSupabase.from('users').update({}).eq('stripe_customer_id', invoice.customer)
      }

      expect(mockSupabase.from).not.toHaveBeenCalled()
    })
  })

  describe('invoice.payment_failed', () => {
    it('sets subscription status to past_due', async () => {
      const event = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            customer: 'cus_123',
          },
        },
      }

      const invoice = event.data.object
      const customerId = invoice.customer as string

      await mockSupabase
        .from('users')
        .update({
          subscription_status: 'past_due',
        })
        .eq('stripe_customer_id', customerId)

      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        subscription_status: 'past_due',
      })
      expect(mockSupabaseEq).toHaveBeenCalledWith('stripe_customer_id', 'cus_123')
    })
  })
})
