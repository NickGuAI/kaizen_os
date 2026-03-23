-- Add pg_cron jobs for daily summary and weekly review reminder emails.
-- Both Edge Functions handle per-user timezone logic internally: they iterate
-- all users, compute local hour/day, and only send when it matches. The cron
-- runs hourly so every timezone window is covered; email_log deduplicates.
-- IMPORTANT: Replace <CRON_SECRET> with actual value before running.
--            Do NOT commit this file with the real secret filled in.

SELECT cron.schedule(
  'daily-summary-email',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url     => 'https://bcmfjyjkmyqvqiaztrje.supabase.co/functions/v1/daily-summary-email',
    headers => '{"Content-Type": "application/json", "Authorization": "Bearer <CRON_SECRET>"}'::jsonb,
    body    => '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'weekly-review-reminder',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url     => 'https://bcmfjyjkmyqvqiaztrje.supabase.co/functions/v1/weekly-review-reminder',
    headers => '{"Content-Type": "application/json", "Authorization": "Bearer <CRON_SECRET>"}'::jsonb,
    body    => '{}'::jsonb
  );
  $$
);
