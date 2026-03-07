-- Sync auth.users to public.users and initialize onboarding progress.

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
      jsonb_build_array(
        jsonb_build_object('step_0', 'welcome', 'status', 'pending'),
        jsonb_build_object('step_1', 'first_project', 'status', 'pending')
      )
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

update public.users
set settings = jsonb_set(
  coalesce(settings, '{}'::jsonb),
  '{onboarding_progress}',
  jsonb_build_array(
    jsonb_build_object('step_0', 'welcome', 'status', 'pending'),
    jsonb_build_object('step_1', 'first_project', 'status', 'pending')
  ),
  true
)
where not (settings ? 'onboarding_progress');
