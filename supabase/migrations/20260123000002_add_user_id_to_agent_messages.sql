-- Add user_id column to agent_messages for defense-in-depth multi-tenancy
-- Currently messages are scoped only through session; this adds direct user scoping

-- Add user_id column to agent_messages
ALTER TABLE agent_messages
ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Backfill user_id from existing sessions
UPDATE agent_messages am
SET user_id = s.user_id
FROM agent_sessions s
WHERE am.session_id = s.id;

-- Make column NOT NULL after backfill
ALTER TABLE agent_messages
ALTER COLUMN user_id SET NOT NULL;

-- Add index for user-based queries
CREATE INDEX idx_agent_messages_user ON agent_messages(user_id);
