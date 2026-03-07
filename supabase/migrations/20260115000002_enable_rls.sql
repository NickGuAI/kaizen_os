-- Kaizen OS: Enable Row-Level Security
-- All policies use auth.uid() which returns UUID

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_classification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_calendar_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE cached_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_classification_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_item_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_focus ENABLE ROW LEVEL SECURITY;
ALTER TABLE notion_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;

-- Users: can only access own record
CREATE POLICY "users_select_own" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Seasons: user_id must match auth.uid()
CREATE POLICY "seasons_select_own" ON seasons FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "seasons_insert_own" ON seasons FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "seasons_update_own" ON seasons FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "seasons_delete_own" ON seasons FOR DELETE USING (user_id = auth.uid());

-- Cards: user_id must match auth.uid()
CREATE POLICY "cards_select_own" ON cards FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "cards_insert_own" ON cards FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "cards_update_own" ON cards FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "cards_delete_own" ON cards FOR DELETE USING (user_id = auth.uid());

-- Events: user_id must match auth.uid()
CREATE POLICY "events_select_own" ON events FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "events_insert_own" ON events FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "events_update_own" ON events FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "events_delete_own" ON events FOR DELETE USING (user_id = auth.uid());

-- Calendar accounts: user_id must match auth.uid()
CREATE POLICY "calendar_accounts_select_own" ON calendar_accounts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "calendar_accounts_insert_own" ON calendar_accounts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "calendar_accounts_update_own" ON calendar_accounts FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "calendar_accounts_delete_own" ON calendar_accounts FOR DELETE USING (user_id = auth.uid());

-- Calendar event annotations: user_id must match auth.uid()
CREATE POLICY "annotations_select_own" ON calendar_event_annotations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "annotations_insert_own" ON calendar_event_annotations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "annotations_update_own" ON calendar_event_annotations FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "annotations_delete_own" ON calendar_event_annotations FOR DELETE USING (user_id = auth.uid());

-- Event classification rules: user_id must match auth.uid()
CREATE POLICY "rules_select_own" ON event_classification_rules FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "rules_insert_own" ON event_classification_rules FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "rules_update_own" ON event_classification_rules FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "rules_delete_own" ON event_classification_rules FOR DELETE USING (user_id = auth.uid());

-- Routine calendar links: user_id must match auth.uid()
CREATE POLICY "routine_links_select_own" ON routine_calendar_links FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "routine_links_insert_own" ON routine_calendar_links FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "routine_links_update_own" ON routine_calendar_links FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "routine_links_delete_own" ON routine_calendar_links FOR DELETE USING (user_id = auth.uid());

-- Cached calendar events: user_id must match auth.uid()
CREATE POLICY "cached_events_select_own" ON cached_calendar_events FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "cached_events_insert_own" ON cached_calendar_events FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "cached_events_update_own" ON cached_calendar_events FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "cached_events_delete_own" ON cached_calendar_events FOR DELETE USING (user_id = auth.uid());

-- Event tags: user_id must match auth.uid()
CREATE POLICY "event_tags_select_own" ON event_tags FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "event_tags_insert_own" ON event_tags FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "event_tags_update_own" ON event_tags FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "event_tags_delete_own" ON event_tags FOR DELETE USING (user_id = auth.uid());

-- AI classification suggestions: user_id must match auth.uid()
CREATE POLICY "ai_suggestions_select_own" ON ai_classification_suggestions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "ai_suggestions_insert_own" ON ai_classification_suggestions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "ai_suggestions_update_own" ON ai_classification_suggestions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "ai_suggestions_delete_own" ON ai_classification_suggestions FOR DELETE USING (user_id = auth.uid());

-- Planning sessions: user_id must match auth.uid()
CREATE POLICY "planning_sessions_select_own" ON planning_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "planning_sessions_insert_own" ON planning_sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "planning_sessions_update_own" ON planning_sessions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "planning_sessions_delete_own" ON planning_sessions FOR DELETE USING (user_id = auth.uid());

-- Work item links: user_id must match auth.uid()
CREATE POLICY "work_items_select_own" ON work_item_links FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "work_items_insert_own" ON work_item_links FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "work_items_update_own" ON work_item_links FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "work_items_delete_own" ON work_item_links FOR DELETE USING (user_id = auth.uid());

-- Daily focus: user_id must match auth.uid()
CREATE POLICY "daily_focus_select_own" ON daily_focus FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "daily_focus_insert_own" ON daily_focus FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "daily_focus_update_own" ON daily_focus FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "daily_focus_delete_own" ON daily_focus FOR DELETE USING (user_id = auth.uid());

-- Notion accounts: user_id must match auth.uid()
CREATE POLICY "notion_accounts_select_own" ON notion_accounts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notion_accounts_insert_own" ON notion_accounts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "notion_accounts_update_own" ON notion_accounts FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notion_accounts_delete_own" ON notion_accounts FOR DELETE USING (user_id = auth.uid());

-- Agent sessions: user_id must match auth.uid()
CREATE POLICY "agent_sessions_select_own" ON agent_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "agent_sessions_insert_own" ON agent_sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "agent_sessions_update_own" ON agent_sessions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "agent_sessions_delete_own" ON agent_sessions FOR DELETE USING (user_id = auth.uid());

-- Agent messages: access via session ownership (join check)
CREATE POLICY "agent_messages_select_own" ON agent_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM agent_sessions WHERE agent_sessions.id = agent_messages.session_id AND agent_sessions.user_id = auth.uid()));
CREATE POLICY "agent_messages_insert_own" ON agent_messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM agent_sessions WHERE agent_sessions.id = agent_messages.session_id AND agent_sessions.user_id = auth.uid()));
CREATE POLICY "agent_messages_update_own" ON agent_messages FOR UPDATE
  USING (EXISTS (SELECT 1 FROM agent_sessions WHERE agent_sessions.id = agent_messages.session_id AND agent_sessions.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM agent_sessions WHERE agent_sessions.id = agent_messages.session_id AND agent_sessions.user_id = auth.uid()));
CREATE POLICY "agent_messages_delete_own" ON agent_messages FOR DELETE
  USING (EXISTS (SELECT 1 FROM agent_sessions WHERE agent_sessions.id = agent_messages.session_id AND agent_sessions.user_id = auth.uid()));
