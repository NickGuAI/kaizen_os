-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule calendar poll every 5 minutes via pg_cron + pg_net
-- Requires app.calendar_poll_secret to be set on the database:
--   ALTER DATABASE postgres SET app.calendar_poll_secret = '<your-secret>';
SELECT cron.schedule(
  'calendar-poll',
  '*/5 * * * *',
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
