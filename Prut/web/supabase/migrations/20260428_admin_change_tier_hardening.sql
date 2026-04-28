-- supabase/migrations/20260428_admin_change_tier_hardening.sql
-- Hardening fixes for admin_change_tier:
--   #2 Last-admin guard moved INSIDE the RPC (atomic with the delete).
--   #3 Same-tier no-op short-circuits before any writes.
--   #6 Subscription cancellation now triggers whenever new_tier = 'free',
--      not only when leaving 'pro' (covers admin→free with stale active sub).
--   #4 Pro→Admin promotion no longer cancels the subscription; cancellation
--      is reserved for explicit demotions to free.

create or replace function public.admin_change_tier(
  target_user_id uuid,
  new_tier text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_tier      text;
  v_old_balance   int;
  v_baseline      int;
  v_delta         int;
  v_was_admin     boolean;
  v_admin_count   int;
begin
  if new_tier not in ('free','pro','admin') then
    raise exception 'invalid tier: %', new_tier using errcode = '22023';
  end if;

  select plan_tier, coalesce(credits_balance, 0)
    into v_old_tier, v_old_balance
    from profiles
   where id = target_user_id
   for update;

  if v_old_tier is null then
    raise exception 'user not found: %', target_user_id using errcode = 'P0002';
  end if;

  -- (#3) Same-tier no-op: skip writes entirely so accidental
  -- "Update Tier" clicks don't wipe earned credits.
  if v_old_tier = new_tier then
    return jsonb_build_object(
      'success',         true,
      'noop',            true,
      'old_tier',        v_old_tier,
      'new_tier',        new_tier,
      'credits_balance', v_old_balance,
      'delta',           0
    );
  end if;

  -- (#2) Last-admin guard atomic with the delete: lock user_roles for the
  -- target row so concurrent demotions can't both observe count >= 2.
  select exists (select 1 from user_roles where user_id = target_user_id and role = 'admin')
    into v_was_admin;

  if v_was_admin and new_tier <> 'admin' then
    select count(*) into v_admin_count
      from user_roles
     where role = 'admin'
     for update;
    if v_admin_count <= 1 then
      raise exception 'refusing: would remove last remaining admin'
        using errcode = '23514';
    end if;
  end if;

  v_baseline := case new_tier
                  when 'free' then 2
                  when 'pro'  then 150
                  else 0
                end;
  v_delta := v_baseline - v_old_balance;

  update profiles
     set plan_tier            = new_tier,
         credits_balance      = v_baseline,
         credits_refreshed_at = now(),
         updated_at           = now()
   where id = target_user_id;

  if new_tier = 'admin' then
    insert into user_roles (user_id, role)
    values (target_user_id, 'admin')
    on conflict (user_id) do update set role = 'admin';
  else
    delete from user_roles
     where user_id = target_user_id and role = 'admin';
  end if;

  -- (#6) Cancel any active subscription when demoting to free, regardless
  -- of whether the user was previously pro or admin. Promotion to admin
  -- preserves the subscription (#4).
  if new_tier = 'free' then
    update subscriptions
       set status     = 'cancelled',
           ends_at    = coalesce(ends_at, now()),
           updated_at = now()
     where user_id = target_user_id
       and status   = 'active';
  end if;

  insert into credit_ledger (user_id, delta, balance_after, reason, source)
  values (target_user_id, v_delta, v_baseline, 'admin_tier_change', 'admin');

  return jsonb_build_object(
    'success',         true,
    'noop',            false,
    'old_tier',        v_old_tier,
    'new_tier',        new_tier,
    'credits_balance', v_baseline,
    'delta',           v_delta
  );
end;
$$;

revoke all on function public.admin_change_tier(uuid, text) from public;
grant execute on function public.admin_change_tier(uuid, text) to service_role;

comment on function public.admin_change_tier(uuid, text) is
  'Atomic admin tier change. Same-tier is a no-op. Last-admin demotion blocked atomically. Subscription cancelled on demotion to free only.';
