-- Add scratchpad field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS scratchpad TEXT;
