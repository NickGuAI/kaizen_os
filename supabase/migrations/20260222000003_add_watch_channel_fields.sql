ALTER TABLE calendar_workspace_subscriptions
  ADD COLUMN resource_id TEXT,
  ADD COLUMN sync_token TEXT,
  ADD COLUMN channel_token TEXT;
