# Migrating Data to a New User

## Overview

When you sign up with Supabase Auth, it creates a user with a new UUID. You need to update all existing data to reference this new user ID.

## Step 1: Sign Up New User

### Option A: Via Supabase Dashboard (Recommended)
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select project `bcmfjyjkmyqvqiaztrje`
3. Go to **Authentication > Users**
4. Click **Add User** > **Create New User**
5. Enter your email and password
6. Copy the new user's **UUID** from the User UID column

### Option B: Via App (if signup is implemented)
Sign up through the app's registration flow, then find your UUID in Supabase dashboard.

## Step 2: Update Data to New User ID

Replace `NEW_USER_UUID` with the UUID from Step 1.
Replace `OLD_USER_UUID` with `aed3f6cc-37bb-43a5-a2cb-b89c41651676` (current seed data user).

```sql
-- Run this in order (respects foreign key constraints)
BEGIN;

-- Store the UUIDs
DO $$
DECLARE
    old_id UUID := 'aed3f6cc-37bb-43a5-a2cb-b89c41651676';
    new_id UUID := 'NEW_USER_UUID';  -- Replace this!
BEGIN
    -- Update all tables with user_id foreign key
    UPDATE agent_sessions SET user_id = new_id WHERE user_id = old_id;
    UPDATE agent_task_traces SET user_id = new_id WHERE user_id = old_id;
    UPDATE agent_tasks SET user_id = new_id WHERE user_id = old_id;
    UPDATE ai_classification_suggestions SET user_id = new_id WHERE user_id = old_id;
    UPDATE cached_calendar_events SET user_id = new_id WHERE user_id = old_id;
    UPDATE calendar_accounts SET user_id = new_id WHERE user_id = old_id;
    UPDATE calendar_event_annotations SET user_id = new_id WHERE user_id = old_id;
    UPDATE cards SET user_id = new_id WHERE user_id = old_id;
    UPDATE events SET user_id = new_id WHERE user_id = old_id;
    UPDATE planning_sessions SET user_id = new_id WHERE user_id = old_id;
    UPDATE seasons SET user_id = new_id WHERE user_id = old_id;
    UPDATE time_logs SET user_id = new_id WHERE user_id = old_id;
    UPDATE weekly_snapshots SET user_id = new_id WHERE user_id = old_id;
    UPDATE work_item_links SET user_id = new_id WHERE user_id = old_id;

    -- Finally update the users table itself
    UPDATE users SET id = new_id WHERE id = old_id;
END $$;

COMMIT;
```

## Step 3: Verify

```sql
-- Check user exists with new ID
SELECT id, email, name FROM users;

-- Verify data is linked
SELECT COUNT(*) as cards FROM cards WHERE user_id = 'NEW_USER_UUID';
SELECT COUNT(*) as seasons FROM seasons WHERE user_id = 'NEW_USER_UUID';
```

## Quick Script

Save and run this after replacing the UUID:

```bash
# Replace YOUR_NEW_UUID below
psql postgresql://postgres@localhost:5432/kaizen_os << 'EOF'
BEGIN;
UPDATE agent_sessions SET user_id = 'YOUR_NEW_UUID' WHERE user_id = 'aed3f6cc-37bb-43a5-a2cb-b89c41651676';
UPDATE agent_task_traces SET user_id = 'YOUR_NEW_UUID' WHERE user_id = 'aed3f6cc-37bb-43a5-a2cb-b89c41651676';
UPDATE agent_tasks SET user_id = 'YOUR_NEW_UUID' WHERE user_id = 'aed3f6cc-37bb-43a5-a2cb-b89c41651676';
UPDATE ai_classification_suggestions SET user_id = 'YOUR_NEW_UUID' WHERE user_id = 'aed3f6cc-37bb-43a5-a2cb-b89c41651676';
UPDATE cached_calendar_events SET user_id = 'YOUR_NEW_UUID' WHERE user_id = 'aed3f6cc-37bb-43a5-a2cb-b89c41651676';
UPDATE calendar_accounts SET user_id = 'YOUR_NEW_UUID' WHERE user_id = 'aed3f6cc-37bb-43a5-a2cb-b89c41651676';
UPDATE calendar_event_annotations SET user_id = 'YOUR_NEW_UUID' WHERE user_id = 'aed3f6cc-37bb-43a5-a2cb-b89c41651676';
UPDATE cards SET user_id = 'YOUR_NEW_UUID' WHERE user_id = 'aed3f6cc-37bb-43a5-a2cb-b89c41651676';
UPDATE events SET user_id = 'YOUR_NEW_UUID' WHERE user_id = 'aed3f6cc-37bb-43a5-a2cb-b89c41651676';
UPDATE planning_sessions SET user_id = 'YOUR_NEW_UUID' WHERE user_id = 'aed3f6cc-37bb-43a5-a2cb-b89c41651676';
UPDATE seasons SET user_id = 'YOUR_NEW_UUID' WHERE user_id = 'aed3f6cc-37bb-43a5-a2cb-b89c41651676';
UPDATE time_logs SET user_id = 'YOUR_NEW_UUID' WHERE user_id = 'aed3f6cc-37bb-43a5-a2cb-b89c41651676';
UPDATE weekly_snapshots SET user_id = 'YOUR_NEW_UUID' WHERE user_id = 'aed3f6cc-37bb-43a5-a2cb-b89c41651676';
UPDATE work_item_links SET user_id = 'YOUR_NEW_UUID' WHERE user_id = 'aed3f6cc-37bb-43a5-a2cb-b89c41651676';
UPDATE users SET id = 'YOUR_NEW_UUID' WHERE id = 'aed3f6cc-37bb-43a5-a2cb-b89c41651676';
COMMIT;
EOF
```
