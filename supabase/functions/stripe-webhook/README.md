# Stripe Webhook Edge Function

This Supabase Edge Function handles Stripe webhook events for subscription management.

## Deployment

```bash
# Deploy the function
npx supabase functions deploy stripe-webhook

# Set environment secrets
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxx
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxx
npx supabase secrets set SUPABASE_URL=https://xxx.supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=service_role_key
```

## Stripe Webhook Configuration

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy webhook signing secret and update `STRIPE_WEBHOOK_SECRET`

## Testing Locally

```bash
# Forward webhooks to local function
stripe listen --forward-to https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
```

## Handled Events

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create customer, set tier='pro', status='active' |
| `customer.subscription.updated` | Update status, period_end |
| `customer.subscription.deleted` | Set tier='free', status='canceled' |
| `invoice.paid` | Update period_end |
| `invoice.payment_failed` | Set status='past_due' |
