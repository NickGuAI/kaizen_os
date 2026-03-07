-- Update onboarding_progress to use object format instead of array format.
-- New format: { currentStep: number, completedAt: string | null, steps: {} }

-- Update the trigger function to use new format for new users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, settings)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
    jsonb_build_object(
      'onboarding_progress',
      jsonb_build_object(
        'currentStep', 0,
        'completedAt', null,
        'steps', '{}'::jsonb
      )
    )
  )
  on conflict do nothing;

  return new;
end;
$$;

-- Migrate existing users with legacy array format to new object format
-- Only migrate users who have the old array format (check if it's an array)
update public.users
set settings = jsonb_set(
  settings,
  '{onboarding_progress}',
  jsonb_build_object(
    'currentStep', 0,
    'completedAt', null,
    'steps', '{}'::jsonb
  ),
  true
)
where jsonb_typeof(settings->'onboarding_progress') = 'array';
