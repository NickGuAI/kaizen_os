-- Add pg_cron job to pre-classify time entries the day before each user's review date.
-- Runs at 2 AM UTC daily; the endpoint does per-user timezone math to decide who to process.
-- IMPORTANT: Replace <CALENDAR_POLL_SECRET> with actual value before running.
--            Do NOT commit this file with the real secret filled in.
SELECT cron.schedule(
  'pre-classify-review',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url     => 'https://kaizen.gehirn.ai/api/calendar/pre-classify',
    headers => '{"Content-Type": "application/json", "Authorization": "Bearer <CALENDAR_POLL_SECRET>"}'::jsonb,
    body    => '{}'::jsonb
  );
  $$
);
