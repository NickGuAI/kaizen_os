-- Sync auth.users to public.users for existing and new users.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS credit_balance_usd NUMERIC(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_credit_refresh_at TIMESTAMP(3);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, settings, credit_balance_usd, last_credit_refresh_at)
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
    ),
    5.00,
    now()
  )
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into public.users (id, email, name, settings, credit_balance_usd, last_credit_refresh_at)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name'),
  jsonb_build_object(
    'onboarding_progress',
    jsonb_build_array(
      jsonb_build_object('step_0', 'welcome', 'status', 'pending'),
      jsonb_build_object('step_1', 'first_project', 'status', 'pending')
    )
  ),
  5.00,
  now()
from auth.users u
where u.email is not null
  and not exists (
    select 1 from public.users pu where pu.id = u.id
  )
on conflict do nothing;

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
