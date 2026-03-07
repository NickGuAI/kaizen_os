-- Kaizen OS: Agent usage tracking
-- Add credit balance to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS credit_balance_usd NUMERIC(10, 2) NOT NULL DEFAULT 0;

-- Agent usage table
CREATE TABLE agent_usage (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    cache_read_tokens INTEGER NOT NULL DEFAULT 0,
    cache_write_tokens INTEGER NOT NULL DEFAULT 0,
    model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
    cost_usd NUMERIC(10, 6) NOT NULL,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_agent_usage_user ON agent_usage(user_id);
CREATE INDEX idx_agent_usage_session ON agent_usage(session_id);
CREATE INDEX idx_agent_usage_created_at ON agent_usage(created_at);

-- Enable RLS and policies
ALTER TABLE agent_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_usage_select_own" ON agent_usage FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "agent_usage_insert_own" ON agent_usage FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "agent_usage_update_own" ON agent_usage FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "agent_usage_delete_own" ON agent_usage FOR DELETE USING (user_id = auth.uid());
