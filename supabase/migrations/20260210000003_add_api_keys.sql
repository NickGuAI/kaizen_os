-- Add API keys for external MCP authentication
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_prefix VARCHAR(12) NOT NULL,
    key_hash VARCHAR(64) UNIQUE NOT NULL,
    scopes JSONB NOT NULL DEFAULT '["read"]',
    allowed_servers JSONB NOT NULL DEFAULT '["kaizen-db"]',
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    request_count INTEGER NOT NULL DEFAULT 0,
    rate_limit INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys_select_own" ON api_keys FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "api_keys_insert_own" ON api_keys FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "api_keys_update_own" ON api_keys FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "api_keys_delete_own" ON api_keys FOR DELETE
  USING (user_id = auth.uid());
