# Admin Dashboard Sync + Per-User Credit Details — Design (Spec 1)

**Date:** 2026-04-28
**Status:** Approved (auto mode)
**Follow-up spec:** Spec 2 — Full admin sync audit (deferred).

## Problem

The admin dashboard shows 95 users while the users panel shows 96. Investigation found three independent causes:

1. `/api/admin/dashboard` caches its payload in Redis for 5 minutes; `/api/admin/users` is live. New signups appear in the users panel up to 5 minutes before the dashboard reflects them.
2. There is one row in `auth.users` with no matching row in `public.profiles` (97 vs 96), so any code that counts "users" via `profiles` undercounts by one. There is no DB trigger to auto-create profiles on signup, so this can recur.
3. The admin users page still calls the removed `grant_admin` / `revoke_admin` actions in `toggleAdmin` and `runBulk`. Those buttons silently fail.

The user also wants richer per-row credit info in the users panel (balance, daily limit, refresh-at, last spend, 7-day sparkline).

## Goals

- Admin can force-refresh the dashboard without waiting for the 5-minute TTL.
- New auth users always have a profile row.
- The admin can see when there is an auth↔profile mismatch and fix it in one click.
- Existing role-toggle buttons (single + bulk) work via the unified tier change.
- Each row in the users list shows a rich credit summary including a 7-day sparkline.

## Non-Goals

- A full audit of every admin tab (deferred to Spec 2).
- Replacing Redis cache with a finer-grained event-driven invalidation (deferred).
- Changing the underlying credit model.

## Decisions

- **Q1 — Dashboard refresh.** Keep 5-min Redis cache, add a manual Refresh button that bypasses cache via `?refresh=1`.
- **Q2 — Missing profile.** Both: auto-heal trigger on `auth.users` insert + a warning card on the dashboard with a "Sync now" button when a mismatch is detected.
- **Q3 — Per-user row info.** Full panel: tier, balance, daily limit, refresh-at, last spend, 7-day sparkline.

## Architecture

### 1. Manual dashboard refresh

`src/app/api/admin/dashboard/route.ts`:
- Accept `?refresh=1` query param. If present, skip Redis read and write a fresh payload.
- No change to TTL (5 minutes).

`src/components/admin/AdminDashboard.tsx` (or wherever the dashboard is mounted):
- Add a Refresh button next to the dashboard header.
- On click, refetch with `?refresh=1` and show a "מתעדכן…" loading state.
- Display `payload.generatedAt` ("עדכון אחרון: …") so admins see freshness at a glance.

### 2. Auto-heal trigger + warning card

**Migration `supabase/migrations/20260428_auth_profile_autoheal.sql`:**

```sql
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

-- One-time backfill for the existing orphan
insert into public.profiles (id, email, plan_tier, credits_balance, credits_refreshed_at)
select u.id, u.email, 'free', 2, now()
  from auth.users u
 where not exists (select 1 from public.profiles p where p.id = u.id);
```

**Dashboard endpoint** adds:

```ts
// Cheap auth↔profile reconciliation count
const { data: mismatchRow } = await supabase.rpc("auth_profile_mismatch_count");
// returns { auth_count, profile_count, missing }
```

…via a new SQL function:

```sql
create or replace function public.auth_profile_mismatch_count()
returns table(auth_count int, profile_count int, missing int)
language sql security definer set search_path = public, auth as $$
  select
    (select count(*)::int from auth.users where deleted_at is null) as auth_count,
    (select count(*)::int from public.profiles) as profile_count,
    (select count(*)::int from auth.users u
       where u.deleted_at is null
         and not exists (select 1 from public.profiles p where p.id = u.id)) as missing;
$$;
revoke all on function public.auth_profile_mismatch_count() from public;
grant execute on function public.auth_profile_mismatch_count() to service_role;
```

**Dashboard UI** renders the warning card only when `payload.authProfileMismatch.missing > 0`:

```
⚠ נמצאו {missing} משתמשים ללא פרופיל ({auth_count} ב-auth, {profile_count} ב-profiles).
[סנכרן עכשיו]
```

The button POSTs to existing `/api/admin/sync-users` then refetches dashboard with `?refresh=1`.

### 3. Fix broken grant_admin / revoke_admin callers

**`src/app/admin/users/page.tsx`:**

- `toggleAdmin(userId, currentRole)` — replace the single-user grant/revoke call with:
  ```ts
  const newTier = isNowAdmin ? "free" : "admin";
  fetch(`/api/admin/users/${userId}`, { method: "POST", body: JSON.stringify({ action: "change_tier", value: newTier }) });
  ```
- `runBulk(action)` — narrow the type to `"ban" | "unban" | "promote_admin" | "demote_admin"`. Translate `promote_admin` → `change_tier: 'admin'`, `demote_admin` → `change_tier: 'free'`.

**`src/app/api/admin/users/bulk/route.ts`** updates:
- Accept new action values `promote_admin` and `demote_admin`.
- Internally call `admin_change_tier` per user. Preserve existing self-skip and last-admin guards (the RPC already enforces last-admin atomically).
- Keep accepting `grant_admin` / `revoke_admin` as aliases for backwards compatibility for at most one release; emit a console warning when used.

### 4. Rich per-user credits in the users list

**`/api/admin/users` GET handler** — return new fields per user row:

```ts
{
  // existing
  id, email, plan_tier, credits_balance, role, customer_name, prompt_count,
  last_prompt_at, last_activity_at, last_sign_in_at, is_banned, ...

  // new
  daily_limit: number,                 // 2 (free) | 150 (pro) | -1 (admin = unlimited sentinel)
  last_spend_at: string | null,        // most recent credit_ledger.created_at where reason='spend'
  refresh_at: string | null,           // last_spend_at + 24h, only when free && balance < daily_limit
  usage_last_7_days: number[]          // length 7, oldest first; counts of spends per day
}
```

Implementation:
- Read `daily_free_limit` from `site_settings` once (already done elsewhere); set `daily_limit` per `plan_tier`.
- One additional Supabase query: `select user_id, created_at, reason from credit_ledger where created_at >= now() - interval '7 days' and user_id = any(:user_ids)`. Group in TS into per-user `{ sparkline[7], lastSpend }`.

**Component `src/components/admin/UserCreditsBlock.tsx`** (replaces the smaller `UserCreditsCell`):

```
[Tier chip]   ⚡ {balance} / {limit}
              ⏱ {refresh_at countdown}     (free, balance==0 only)
              [::sparkline 7 bars::]       (always)
              spent {timeAgo(last_spend_at)} (always when set)
```

- Tier chip styles unchanged from `UserCreditsCell`.
- Daily limit displayed as `∞` for admin.
- Sparkline: 60×18px inline SVG, 7 bars, max-normalized within the row's own values (so a heavy user shows tall bars; a light user shows shorter bars but at full height for their max). Empty days render as a 1px tick.
- Countdown ticks every second client-side using a single `setInterval` shared across rows (lifted to the page; component reads from a context).

`UserCreditsCell` stays for now (used elsewhere: nowhere) — replaced by `UserCreditsBlock` in `src/app/admin/users/page.tsx`. Delete `UserCreditsCell` after the swap if no other consumers.

### 5. Tests

- `src/app/api/admin/dashboard/__tests__/refresh-bypass.test.ts` — verify `?refresh=1` causes a Redis SET regardless of cache hit.
- `src/app/api/admin/users/__tests__/route.test.ts` — verify response includes `usage_last_7_days` (array of 7 numbers), `daily_limit`, `last_spend_at`, `refresh_at`.
- `src/app/api/admin/users/bulk/__tests__/route.test.ts` — verify `promote_admin` translates to `admin_change_tier(id, 'admin')` and `demote_admin` to `'free'`.

## Data Flow — Refresh button

```
Admin clicks Refresh
  → GET /api/admin/dashboard?refresh=1
  → handler skips redis.get
  → 17 parallel queries + RPC for mismatch
  → redis.set(payload, 5min)
  → returns payload with fresh generatedAt
UI re-renders cards. Warning card shows if mismatch.missing > 0.
```

## Migration Order

1. SQL migration: `handle_new_auth_user` trigger + backfill + `auth_profile_mismatch_count` RPC.
2. Apply migration to live DB. Verify mismatch count is now 0.
3. Deploy dashboard endpoint + UI changes (Refresh button, warning card).
4. Deploy users page fixes (broken role toggles + UserCreditsBlock).
5. Deploy bulk endpoint update.

No coordinated rollout needed — each step is independently safe.

## Error Handling

- Trigger fails on insert: auth signup still succeeds (we use ON CONFLICT DO NOTHING and the trigger is fire-and-forget; if it errors, Supabase rolls back the auth insert which is the correct behavior).
- `auth_profile_mismatch_count` RPC fails: dashboard returns `authProfileMismatch: null`; UI hides the warning card. Logged.
- 7-day-usage query fails: rows return `usage_last_7_days: []`; UI shows a flat sparkline placeholder.

## Open Questions

None for this spec. All four decisions captured above.
