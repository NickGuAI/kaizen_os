-- Track credit refresh timing for monthly resets
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_credit_refresh_at TIMESTAMP(3);
