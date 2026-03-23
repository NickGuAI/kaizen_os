-- Add pg_cron jobs for daily summary and weekly review reminder emails.
-- Both Edge Functions handle per-user timezone logic internally: they iterate
-- all users, compute local hour/day, and only send when it matches. The cron
-- runs hourly so every timezone window is covered; email_log deduplicates.
--
-- IMPORTANT: Before running `supabase db push`:
--   1. Replace <SUPABASE_FUNCTIONS_URL> with your project's Edge Functions URL
--      (e.g. https://<project-ref>.supabase.co/functions/v1)
--   2. Replace <CRON_SECRET> with the service role key
--   3. Revert both placeholders before committing

SELECT cron.schedule(
  'daily-summary-email',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url     => '<SUPABASE_FUNCTIONS_URL>/daily-summary-email',
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
    url     => '<SUPABASE_FUNCTIONS_URL>/weekly-review-reminder',
    headers => '{"Content-Type": "application/json", "Authorization": "Bearer <CRON_SECRET>"}'::jsonb,
    body    => '{}'::jsonb
  );
  $$
);
