-- Add Stripe subscription support to users table
-- Migration: 20260119000001_stripe_subscriptions

ALTER TABLE users
  ADD COLUMN stripe_customer_id TEXT UNIQUE,
  ADD COLUMN subscription_tier TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN stripe_subscription_id TEXT UNIQUE,
  ADD COLUMN subscription_period_end TIMESTAMP(3);

-- Index for querying by subscription tier
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);

-- Comments for clarity
COMMENT ON COLUMN users.stripe_customer_id IS 'Stripe Customer ID (cus_xxx)';
COMMENT ON COLUMN users.subscription_tier IS 'Subscription tier: free | pro';
COMMENT ON COLUMN users.subscription_status IS 'Subscription status: none | active | past_due | canceled | trialing';
COMMENT ON COLUMN users.stripe_subscription_id IS 'Stripe Subscription ID (sub_xxx)';
COMMENT ON COLUMN users.subscription_period_end IS 'Current billing period end timestamp';
