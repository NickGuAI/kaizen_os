-- High-friction onboarding profile storage (Seed -> Student -> Gaze)

CREATE TABLE onboarding_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flow_version INTEGER NOT NULL DEFAULT 2,
  current_step VARCHAR(32) NOT NULL DEFAULT 'connect',
  connect_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  seed JSONB NOT NULL DEFAULT '{}'::jsonb,
  student JSONB NOT NULL DEFAULT '{}'::jsonb,
  gaze JSONB NOT NULL DEFAULT '{}'::jsonb,
  kaizen_experiment JSONB NOT NULL DEFAULT '{}'::jsonb,
  synthesis_status VARCHAR(20) NOT NULL DEFAULT 'idle',
  completed_at TIMESTAMP(3),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

CREATE INDEX idx_onboarding_profiles_user_id ON onboarding_profiles(user_id);
CREATE INDEX idx_onboarding_profiles_current_step ON onboarding_profiles(current_step);

-- Optional compatibility backfill: carry forward completion signal for users who already finished
INSERT INTO onboarding_profiles (user_id, current_step, completed_at)
SELECT
  id,
  'gaze',
  (settings -> 'onboarding_progress' ->> 'completedAt')::timestamp(3)
FROM users
WHERE settings ? 'onboarding_progress'
  AND nullif(settings -> 'onboarding_progress' ->> 'completedAt', '') IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE onboarding_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onboarding_profiles_select_own"
  ON onboarding_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "onboarding_profiles_insert_own"
  ON onboarding_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "onboarding_profiles_update_own"
  ON onboarding_profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "onboarding_profiles_delete_own"
  ON onboarding_profiles FOR DELETE
  USING (user_id = auth.uid());
