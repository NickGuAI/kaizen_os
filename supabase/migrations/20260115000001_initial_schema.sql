-- Kaizen OS: Initial Schema with UUID user IDs
-- For Supabase auth.uid() compatibility

-- Enums
CREATE TYPE "EventType" AS ENUM (
    'gate_started',
    'gate_completed',
    'gate_failed',
    'experiment_started',
    'experiment_completed',
    'experiment_failed',
    'experiment_pivoted',
    'criteria_graded',
    'routine_started',
    'routine_replaced',
    'ops_started',
    'ops_completed',
    'veto_added',
    'veto_violated',
    'time_logged',
    'week_planned',
    'season_started',
    'season_ended',
    'agent_mutation',
    'workitem_completed',
    'workitem_attributed',
    'workitem_created'
);

CREATE TYPE "PlanningSessionStatus" AS ENUM (
    'in_progress',
    'committed'
);

CREATE TYPE "TaskStatus" AS ENUM (
    'in_progress',
    'not_started',
    'completed',
    'backlog'
);

CREATE TYPE "UnitType" AS ENUM (
    'THEME',
    'ACTION_GATE',
    'ACTION_EXPERIMENT',
    'ACTION_ROUTINE',
    'ACTION_OPS',
    'VETO'
);

-- Users table (UUID primary key for Supabase auth compatibility)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT DEFAULT '' NOT NULL,
    name VARCHAR(255),
    email_verified_at TIMESTAMP(3),
    timezone VARCHAR(50) DEFAULT 'America/Los_Angeles',
    settings JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Seasons table
CREATE TABLE seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    duration_weeks INTEGER NOT NULL,
    utility_rate DOUBLE PRECISION DEFAULT 40.0 NOT NULL,
    theme_allocations JSONB DEFAULT '{}' NOT NULL,
    is_active BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_seasons_user ON seasons(user_id);
CREATE INDEX idx_seasons_user_active ON seasons(user_id) WHERE is_active = true;

-- Cards table
CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES cards(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_date DATE,
    completion_date DATE,
    start_date DATE,
    status "TaskStatus" DEFAULT 'not_started' NOT NULL,
    unit_type "UnitType" NOT NULL,
    season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
    lag_weeks INTEGER,
    criteria TEXT[] DEFAULT '{}',
    tags JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_cards_user_type ON cards(user_id, unit_type);
CREATE INDEX idx_cards_user_parent ON cards(user_id, parent_id);
CREATE INDEX idx_cards_user_status ON cards(user_id, status);
CREATE INDEX idx_cards_season ON cards(season_id);
CREATE INDEX idx_cards_target_date ON cards(target_date);

-- Events table (BIGINT id for high-volume append-only log)
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type "EventType" NOT NULL,
    card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
    payload JSONB DEFAULT '{}' NOT NULL,
    occurred_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    idempotency_key VARCHAR(255)
);

CREATE UNIQUE INDEX idx_events_idempotency ON events(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_events_user_type ON events(user_id, event_type);
CREATE INDEX idx_events_user_card ON events(user_id, card_id);
CREATE INDEX idx_events_user_time ON events(user_id, occurred_at DESC);

-- Calendar accounts
CREATE TABLE calendar_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) DEFAULT 'google' NOT NULL,
    email VARCHAR(255) NOT NULL,
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT NOT NULL,
    expires_at TIMESTAMP(3) NOT NULL,
    scopes JSONB DEFAULT '[]' NOT NULL,
    selected_calendar_ids JSONB DEFAULT '["primary"]' NOT NULL,
    write_calendar_id VARCHAR(255) DEFAULT 'primary',
    selected_task_list_id VARCHAR(255),
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(user_id, provider, email)
);

CREATE INDEX idx_calendar_accounts_user ON calendar_accounts(user_id);

-- Calendar event annotations
CREATE TABLE calendar_event_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES calendar_accounts(id) ON DELETE CASCADE,
    calendar_id VARCHAR(255) NOT NULL,
    event_id VARCHAR(255) NOT NULL,
    instance_key VARCHAR(255) NOT NULL,
    card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
    source VARCHAR(20) DEFAULT 'manual' NOT NULL,
    confidence DOUBLE PRECISION DEFAULT 1.0 NOT NULL,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(user_id, account_id, calendar_id, event_id, instance_key)
);

CREATE INDEX idx_annotations_user ON calendar_event_annotations(user_id);
CREATE INDEX idx_annotations_card ON calendar_event_annotations(card_id);
CREATE INDEX idx_annotations_lookup ON calendar_event_annotations(account_id, calendar_id, event_id);

-- Event classification rules
CREATE TABLE event_classification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_type VARCHAR(30) NOT NULL,
    match_value TEXT NOT NULL,
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(user_id, match_type, match_value)
);

CREATE INDEX idx_rules_user_active ON event_classification_rules(user_id, is_active);

-- Routine calendar links
CREATE TABLE routine_calendar_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES calendar_accounts(id) ON DELETE CASCADE,
    calendar_id VARCHAR(255) NOT NULL,
    recurring_event_id VARCHAR(255) NOT NULL,
    ical_uid VARCHAR(255),
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(user_id, card_id),
    UNIQUE(account_id, calendar_id, recurring_event_id)
);

CREATE INDEX idx_routine_links_user ON routine_calendar_links(user_id);
CREATE INDEX idx_routine_links_account ON routine_calendar_links(account_id, recurring_event_id);

-- Cached calendar events
CREATE TABLE cached_calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL,
    calendar_id VARCHAR(255) NOT NULL,
    event_id VARCHAR(255) NOT NULL,
    summary VARCHAR(500),
    description TEXT,
    location VARCHAR(500),
    start_date_time TIMESTAMP(3) NOT NULL,
    end_date_time TIMESTAMP(3) NOT NULL,
    is_all_day BOOLEAN DEFAULT false NOT NULL,
    attendees JSONB DEFAULT '[]' NOT NULL,
    html_link VARCHAR(500),
    recurring_event_id VARCHAR(255),
    ical_uid VARCHAR(255),
    content_hash VARCHAR(64) NOT NULL,
    fetched_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMP(3) NOT NULL,
    UNIQUE(account_id, calendar_id, event_id)
);

CREATE INDEX idx_cached_events_user_expires ON cached_calendar_events(user_id, expires_at);
CREATE INDEX idx_cached_events_user_time ON cached_calendar_events(user_id, start_date_time, end_date_time);

-- Event tags
CREATE TABLE event_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id VARCHAR(255) NOT NULL,
    tag_type VARCHAR(50) NOT NULL,
    tag_value VARCHAR(50) NOT NULL,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(user_id, event_id, tag_type)
);

CREATE INDEX idx_event_tags_user_type ON event_tags(user_id, tag_type);

-- AI classification suggestions
CREATE TABLE ai_classification_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_title VARCHAR(500) NOT NULL,
    suggestions JSONB NOT NULL,
    model VARCHAR(50) DEFAULT 'gemini-1.5-flash' NOT NULL,
    prompt TEXT,
    raw_response TEXT,
    latency_ms INTEGER,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMP(3) NOT NULL,
    UNIQUE(user_id, event_title)
);

CREATE INDEX idx_ai_suggestions_user ON ai_classification_suggestions(user_id);
CREATE INDEX idx_ai_suggestions_expires ON ai_classification_suggestions(expires_at);

-- Planning sessions
CREATE TABLE planning_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start VARCHAR(10) NOT NULL,
    action_states JSONB DEFAULT '{}' NOT NULL,
    gcal_assignments JSONB DEFAULT '{}' NOT NULL,
    status "PlanningSessionStatus" DEFAULT 'in_progress' NOT NULL,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(user_id, week_start)
);

CREATE INDEX idx_planning_sessions_user_status ON planning_sessions(user_id, status);

-- Work item links
CREATE TABLE work_item_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    work_item_key VARCHAR(500) NOT NULL UNIQUE,
    source VARCHAR(50) NOT NULL,
    kind VARCHAR(20) NOT NULL,
    card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
    account_id VARCHAR(255),
    task_list_id VARCHAR(255),
    external_id VARCHAR(255),
    planned_for_date DATE,
    playlist_rank INTEGER,
    is_weekly_deliverable BOOLEAN DEFAULT false NOT NULL,
    captured_in_event_key VARCHAR(500),
    completed_in_event_key VARCHAR(500),
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_work_item_links_user_card ON work_item_links(user_id, card_id);
CREATE INDEX idx_work_item_links_user_date ON work_item_links(user_id, planned_for_date);
CREATE INDEX idx_work_item_links_weekly ON work_item_links(user_id, is_weekly_deliverable);

-- Daily focus
CREATE TABLE daily_focus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    date DATE NOT NULL,
    top_keys JSONB DEFAULT '[]' NOT NULL,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_focus_user_date ON daily_focus(user_id, date);

-- Notion accounts
CREATE TABLE notion_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token_encrypted TEXT NOT NULL,
    workspace_id VARCHAR(255) NOT NULL,
    workspace_name VARCHAR(255),
    bot_id VARCHAR(255) NOT NULL,
    selected_database_ids JSONB DEFAULT '[]' NOT NULL,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(user_id, workspace_id)
);

CREATE INDEX idx_notion_accounts_user ON notion_accounts(user_id);

-- Agent sessions
CREATE TABLE agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claude_session_id TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_agent_sessions_user ON agent_sessions(user_id);

-- Agent messages
CREATE TABLE agent_messages (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    checkpoint_uuid TEXT,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_agent_messages_session ON agent_messages(session_id);
