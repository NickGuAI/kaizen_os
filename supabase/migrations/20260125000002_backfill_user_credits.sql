-- Ensure new users get initial credits and backfill missing refresh data

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

update public.users
set credit_balance_usd = case
  when subscription_tier = 'pro' then 15.00
  else 5.00
end,
last_credit_refresh_at = now()
where last_credit_refresh_at is null
  and credit_balance_usd = 0;
