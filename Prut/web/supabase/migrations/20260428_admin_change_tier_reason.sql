-- supabase/migrations/20260428_admin_change_tier_reason.sql
-- Allow 'admin_tier_change' as a credit_ledger reason and update
-- admin_change_tier() to emit it instead of the two-value workaround
-- ('admin_grant' / 'admin_revoke') used in the initial migration.

alter table credit_ledger drop constraint if exists credit_ledger_reason_check;
alter table credit_ledger
  add constraint credit_ledger_reason_check
  check (reason = any (array[
    'registration_bonus'::text,
    'daily_reset'::text,
    'subscription_grant'::text,
    'spend'::text,
    'refund'::text,
    'admin_grant'::text,
    'admin_revoke'::text,
    'churn_revoke'::text,
    'referral_bonus'::text,
    'admin_tier_change'::text
  ]));

-- Re-create the function body using the new unified reason.
create or replace function public.admin_change_tier(
  target_user_id uuid,
  new_tier text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_tier    text;
  v_old_balance int;
  v_baseline    int;
  v_delta       int;
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

  if v_old_tier = 'pro' and new_tier <> 'pro' then
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
  'Atomic admin tier change. Resets credits to baseline (free=2, pro=150, admin=0), syncs user_roles, marks active subscriptions cancelled on Pro→other, writes credit_ledger row with reason=admin_tier_change.';
