-- Add pg_cron jobs for daily summary and weekly review reminder emails.
-- Both Edge Functions handle per-user timezone logic internally: they iterate
-- all users, compute local hour/day, and only send when it matches. The cron
-- runs hourly so every timezone window is covered; email_log deduplicates.
--
-- IMPORTANT: Before running `supabase db push`:
--   Replace <CRON_SECRET> with the actual CRON_SECRET value
--   (the Edge Functions check Authorization against env CRON_SECRET,
--    NOT the service role key). Revert placeholder before committing.

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
