-- Add pg_cron jobs for daily summary and weekly review reminder emails.
-- Both Edge Functions handle per-user timezone logic internally: they iterate
-- all users, compute local hour/day, and only send when it matches. The cron
-- runs hourly so every timezone window is covered; email_log deduplicates.
--
-- Requires two database settings (set once per environment):
--   ALTER DATABASE postgres SET app.supabase_functions_url = 'https://<project-ref>.supabase.co/functions/v1';
--   ALTER DATABASE postgres SET app.cron_secret = '<service-role-key>';

SELECT cron.schedule(
  'daily-summary-email',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_functions_url') || '/daily-summary-email',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
    ),
    body    := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'weekly-review-reminder',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_functions_url') || '/weekly-review-reminder',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret')
    ),
    body    := '{}'::jsonb
  );
  $$
);
