import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY not configured - billing features will be disabled')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'PLACEHOLDER_sk_test_xxxx', {
  apiVersion: '2025-02-24.acacia',
})

export const STRIPE_CONFIG = {
  proPriceId: process.env.STRIPE_PRO_PRICE_ID || 'PLACEHOLDER_price_xxxx',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'PLACEHOLDER_whsec_xxxx',
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'PLACEHOLDER_pk_test_xxxx',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
}
