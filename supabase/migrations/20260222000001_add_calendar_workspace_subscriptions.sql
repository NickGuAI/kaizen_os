CREATE TABLE calendar_workspace_subscriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id        UUID NOT NULL REFERENCES calendar_accounts(id) ON DELETE CASCADE,
  calendar_id       VARCHAR(255) NOT NULL,
  subscription_name TEXT NOT NULL UNIQUE,
  expiration        TIMESTAMPTZ NOT NULL,
  state             VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, calendar_id)
);

CREATE INDEX idx_cal_ws_sub_expiration ON calendar_workspace_subscriptions (expiration);
CREATE INDEX idx_cal_ws_sub_user ON calendar_workspace_subscriptions (user_id);

ALTER TABLE calendar_workspace_subscriptions ENABLE ROW LEVEL SECURITY;
