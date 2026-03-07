-- Email log table for tracking cron-sent emails (daily summary, weekly review)
-- Deduplication via UNIQUE(user_id, email_type, sent_date)

CREATE TABLE IF NOT EXISTS email_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_type VARCHAR(50) NOT NULL,
    sent_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(user_id, email_type, sent_date)
);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email logs" ON email_log
  FOR SELECT USING (user_id = auth.uid());
