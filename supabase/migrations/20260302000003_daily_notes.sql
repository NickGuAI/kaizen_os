-- Daily Notes: per-day gratitude text and mindful moments checklist
-- Used by the new Daily Plan layout (DailyDashboard redesign)

CREATE TABLE daily_notes (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date                 date NOT NULL,
  gratitude_text       text,
  mindful_meditated    bool NOT NULL DEFAULT false,
  mindful_stepped_away bool NOT NULL DEFAULT false,
  mindful_closed_gmail bool NOT NULL DEFAULT false,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Indexes
CREATE INDEX daily_notes_user_date_idx ON daily_notes(user_id, date);

-- RLS
ALTER TABLE daily_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_notes_select_own" ON daily_notes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "daily_notes_insert_own" ON daily_notes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "daily_notes_update_own" ON daily_notes FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "daily_notes_delete_own" ON daily_notes FOR DELETE USING (user_id = auth.uid());

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_daily_notes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER daily_notes_updated_at
  BEFORE UPDATE ON daily_notes
  FOR EACH ROW EXECUTE FUNCTION update_daily_notes_updated_at();
