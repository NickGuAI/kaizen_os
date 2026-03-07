import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@17.5.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || 'PLACEHOLDER_sk_test_xxxx', {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(),
})

// Use Web Crypto API for Deno runtime
const cryptoProvider = Stripe.createSubtleCryptoProvider()

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || 'PLACEHOLDER_https://xxx.supabase.co',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'PLACEHOLDER_service_role_key'
)

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || 'PLACEHOLDER_whsec_xxxx'

const TIER_CREDITS = {
  free: 5.0,
  pro: 15.0,
} as const

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing signature', { status: 400 })
  }

  try {
    const body = await req.text()
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    )

    console.log(`Webhook received: ${event.type}`)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        if (userId && customerId && subscriptionId) {
          await supabase
            .from('users')
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              subscription_tier: 'pro',
              subscription_status: 'active',
              credit_balance_usd: TIER_CREDITS.pro,
              last_credit_refresh_at: new Date().toISOString(),
            })
            .eq('id', userId)

          console.log(`User ${userId} subscribed to Pro`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        await supabase
          .from('users')
          .update({
            subscription_status: subscription.status,
            subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_customer_id', customerId)

        console.log(`Subscription ${subscription.id} updated: ${subscription.status}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        await supabase
          .from('users')
          .update({
            subscription_tier: 'free',
            subscription_status: 'canceled',
            stripe_subscription_id: null,
            subscription_period_end: null,
            credit_balance_usd: TIER_CREDITS.free,
            last_credit_refresh_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId)

        console.log(`Subscription ${subscription.id} canceled`)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        const subscriptionId = invoice.subscription as string

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId as string)
          const periodStart = new Date(subscription.current_period_start * 1000)
          const updateData: Record<string, string | number | null> = {
            subscription_status: 'active',
            subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          }

          const { data: user, error: userError } = await supabase
            .from('users')
            .select('last_credit_refresh_at')
            .eq('stripe_customer_id', customerId)
            .maybeSingle()

          if (userError) {
            console.error('Failed to load user for credit refresh:', userError)
          }

          const lastRefresh = user?.last_credit_refresh_at ? new Date(user.last_credit_refresh_at) : null
          if (!lastRefresh || lastRefresh < periodStart) {
            updateData.credit_balance_usd = TIER_CREDITS.pro
            updateData.last_credit_refresh_at = new Date().toISOString()
          }

          await supabase
            .from('users')
            .update(updateData)
            .eq('stripe_customer_id', customerId)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        await supabase
          .from('users')
          .update({
            subscription_status: 'past_due',
          })
          .eq('stripe_customer_id', customerId)

        console.log(`Payment failed for customer ${customerId}`)
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 })
  }
})
