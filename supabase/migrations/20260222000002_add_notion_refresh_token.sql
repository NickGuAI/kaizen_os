-- Add refresh_token_encrypted to notion_accounts for OAuth token refresh support
ALTER TABLE notion_accounts ADD COLUMN IF NOT EXISTS refresh_token_encrypted TEXT;
