-- Reschedule calendar poll cron with secret hardcoded in the job.
-- IMPORTANT: Replace <CALENDAR_POLL_SECRET> with actual value before running.
--            Do NOT commit this file with the real secret filled in.
SELECT cron.unschedule('calendar-poll');

SELECT cron.schedule(
  'calendar-poll',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url     => 'https://kaizen.gehirn.ai/api/calendar/poll',
    headers => '{"Content-Type": "application/json", "Authorization": "Bearer <CALENDAR_POLL_SECRET>"}'::jsonb,
    body    => '{}'::jsonb
  );
  $$
);
