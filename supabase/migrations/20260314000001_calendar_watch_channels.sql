-- IMPORTANT: Replace <CALENDAR_POLL_SECRET> with actual value before running.
--            Do NOT commit this file with the real secret filled in.

ALTER TABLE calendar_workspace_subscriptions
  ADD COLUMN IF NOT EXISTS channel_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS resource_id TEXT,
  ADD COLUMN IF NOT EXISTS sync_token TEXT,
  ADD COLUMN IF NOT EXISTS channel_token TEXT,
  ADD COLUMN IF NOT EXISTS channel_address TEXT,
  ADD COLUMN IF NOT EXISTS last_notification_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_message_number BIGINT,
  ADD COLUMN IF NOT EXISTS last_error TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_cal_ws_sub_channel_id
  ON calendar_workspace_subscriptions (channel_id)
  WHERE channel_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cal_ws_sub_state_expiration
  ON calendar_workspace_subscriptions (state, expiration);

CREATE INDEX IF NOT EXISTS idx_cal_ws_sub_last_notification
  ON calendar_workspace_subscriptions (last_notification_at);

UPDATE calendar_workspace_subscriptions
SET channel_id = subscription_name
WHERE channel_id IS NULL;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'calendar-poll';

SELECT cron.schedule(
  'calendar-poll',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url     => 'https://kaizen.gehirn.ai/api/calendar/poll',
    headers => '{"Content-Type": "application/json", "Authorization": "Bearer <CALENDAR_POLL_SECRET>"}'::jsonb,
    body    => '{}'::jsonb
  );
  $$
);

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'calendar-watch-renew';

SELECT cron.schedule(
  'calendar-watch-renew',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url     => 'https://kaizen.gehirn.ai/api/calendar/watch/renew',
    headers => '{"Content-Type": "application/json", "Authorization": "Bearer <CALENDAR_POLL_SECRET>"}'::jsonb,
    body    => '{}'::jsonb
  );
  $$
);
