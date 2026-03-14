ALTER TABLE calendar_workspace_subscriptions
  ADD COLUMN IF NOT EXISTS channel_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cal_ws_sub_channel_id
  ON calendar_workspace_subscriptions (channel_id)
  WHERE channel_id IS NOT NULL;

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
    url     := 'https://kaizen.gehirn.ai/api/calendar/poll',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.calendar_poll_secret')
    ),
    body    := '{}'::jsonb
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
    url     := 'https://kaizen.gehirn.ai/api/calendar/watch/renew',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.calendar_poll_secret')
    ),
    body    := '{}'::jsonb
  );
  $$
);
