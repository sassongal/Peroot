-- supabase/migrations/20260428_auth_profile_autoheal.sql

-- Fix pre-existing handle_new_user_stats trigger to be idempotent
-- (backfill inserts would fail without ON CONFLICT DO NOTHING)
create or replace function public.handle_new_user_stats()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.user_stats (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, plan_tier, credits_balance, credits_refreshed_at)
  values (new.id, new.email, 'free', 2, now())
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

insert into public.profiles (id, email, plan_tier, credits_balance, credits_refreshed_at)
select u.id, u.email, 'free', 2, now()
  from auth.users u
 where u.deleted_at is null
   and not exists (select 1 from public.profiles p where p.id = u.id);

create or replace function public.auth_profile_mismatch_count()
returns table(auth_count int, profile_count int, missing int)
language sql
security definer
set search_path = public, auth
as $$
  select
    (select count(*)::int from auth.users where deleted_at is null) as auth_count,
    (select count(*)::int from public.profiles) as profile_count,
    (select count(*)::int from auth.users u
       where u.deleted_at is null
         and not exists (select 1 from public.profiles p where p.id = u.id)) as missing;
$$;

revoke all on function public.auth_profile_mismatch_count() from public;
grant execute on function public.auth_profile_mismatch_count() to service_role;
