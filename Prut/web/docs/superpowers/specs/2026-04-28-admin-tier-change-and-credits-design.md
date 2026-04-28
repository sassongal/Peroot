# Admin Tier Change & Credit Visibility — Design

**Date:** 2026-04-28
**Author:** Gal Sasson (with Claude)
**Status:** Approved (auto mode)

## Problem

1. Admin panel "Change Tier" action fails for existing users. The current implementation only flips `profiles.plan_tier`, accepts an invalid `"premium"` value not used anywhere else in the runtime, and does not perform the side effects required for a real tier transition (credit reset, role change, subscription cleanup, app_metadata sync).
2. Credit status is shown only in the header pill. Users have no detailed view in Settings, and admins have no per-user credit column in the users list.

## Goals

- A single admin action — selecting Free / Pro / Admin from a dropdown — performs all required side effects atomically.
- Every signed-in user sees a clear credits panel in Settings.
- Admin sees per-user credit status in the users list.
- No partial-state windows on tier change.

## Non-Goals

- Calling the LemonSqueezy API on demotion (per decision C — DB-only mark as cancelled; manual refund if needed).
- Adding a "premium" tier — runtime only knows free / pro / admin.
- Changing the rolling-24h credit reset semantics for free tier.

## Decisions (from brainstorming)

- **Q1 — Unified dropdown.** Free / Pro / Admin in one control. Replaces the separate `grant_admin`/`revoke_admin` flow.
- **Q2 — Pro→Free with active subscription.** Allow it; mark `subscriptions.status = 'cancelled'` in our DB only; do not call LemonSqueezy.
- **Q3 — Credits on tier change.** Hard reset to baseline: Free=2, Pro=150, Admin=0 (admin is unlimited; balance is ignored at spend-time).
- **Q4 — Credit visibility.** Header pill (already exists, verify), Settings credits panel (new), admin users list credits column (new).

## Architecture

### 1. Database — `supabase/migrations/20260428_admin_change_tier.sql`

New `security definer` function `admin_change_tier(target_user_id uuid, new_tier text)` that, in one transaction:

- Validates `new_tier ∈ {'free','pro','admin'}`.
- Locks the profile row (`SELECT ... FOR UPDATE`).
- Sets `profiles.plan_tier`, `credits_balance` to baseline, `credits_refreshed_at = now()`.
- For free tier: clears `last_prompt_at` so the rolling-window timer doesn't immediately re-block.
- Inserts/upserts into `user_roles` when new tier is admin; deletes the admin row otherwise.
- If old tier was `pro` and new tier ≠ `pro`, marks any active `subscriptions` row as `cancelled` with `cancelled_at = now()`.
- Writes a `credit_ledger` audit row (`reason = 'admin_tier_change'`, `source = 'admin'`).
- Returns `jsonb { success, old_tier, new_tier, credits_balance }`.

`grant execute … to service_role` only. `revoke … from public`.

### 2. API — `src/app/api/admin/users/[id]/route.ts`

The `POST` handler's `change_tier` case is replaced to:

1. Validate `value ∈ {'free','pro','admin'}`.
2. **Last-admin & self-demotion guard** when `new_tier ≠ 'admin'` and the target's current role is admin: refuse if `id === adminUser.id`, refuse if there is only one admin in `user_roles`.
3. Call `supabase.rpc('admin_change_tier', { target_user_id, new_tier })`.
4. `supabase.auth.admin.updateUserById(id, { app_metadata: { role: new_tier === 'admin' ? 'admin' : null, plan_tier: new_tier } })`.
5. `supabase.auth.admin.signOut(id, 'global')` to force the user's JWT to refresh on their next request (so the proxy sees the new role/tier without waiting for natural expiry).
6. `logAdminAction(adminUser.id, 'user_change_tier', { target_user_id: id, value })`.

The `grant_admin` and `revoke_admin` cases (and their entries in the Zod schema) are removed. Any internal caller (search reveals none in app code; the only references are inside `[id]/route.ts` and its test file) is updated to call `change_tier` with `'admin'` or `'free'`.

### 3. Admin user-detail UI — `src/app/admin/users/[id]/page.tsx`

- Tier `<select>` options: Free / Pro / Admin (drop Premium).
- `tierValue` initialized from `role?.role === 'admin' ? 'admin' : profile.plan_tier ?? 'free'`.
- "Grant/Revoke Admin" sidebar block deleted (the dropdown handles it).
- "Update Tier" button calls `doAction('change_tier', tierValue)` (unchanged).
- After success, `fetchDetail()` re-pulls (already implemented) and the avatar tier badge re-renders.

### 4. Admin users list — `src/app/admin/users/page.tsx`

Add a **Credits** column to the table:

- Display `{credits_balance}` next to a small tier chip (Free/Pro/Admin).
- Color rules: admin = blue chip & "∞" instead of number, pro = amber chip, free = neutral chip; balance text turns red at `0`, amber at `≤2` for free.
- No API change — `credits_balance` and `plan_tier` already returned by `/api/admin/users`.

### 5. Settings credits panel — new component, mounted in `src/app/settings/page.tsx`

Component `src/components/settings/CreditsPanel.tsx` (client component):

- Reads from `/api/me/quota` (existing) for balance / tier / daily_limit / refresh_at.
- Reads from new `/api/me/credits/ledger` for last 10 ledger entries.
- Layout (RTL, Hebrew):
  - Tier badge + tier label.
  - Large balance number — for admin shows ∞ symbol with "ללא הגבלה".
  - Daily limit row — free only.
  - Countdown timer to `refresh_at` — free only, ticks every second client-side.
  - Ledger list — last 10 entries, same shape as the admin user-detail Credits tab.
  - CTA: "שדרג ל-Pro" if free; "ניהול מנוי" link to `/settings/subscription` if pro; no CTA if admin.

New endpoint `src/app/api/me/credits/ledger/route.ts`:

- `withAuth` SSR client.
- `select id, delta, balance_after, reason, source, created_at from credit_ledger where user_id = auth.uid() order by created_at desc limit 10`.
- RLS already restricts the table to the owner — no extra filtering needed; we still filter by `user.id` defensively.

### 6. Header pill — `src/components/PromptLimitIndicator.tsx`

Already handles all four states (admin / pro / free / guest). No code change. Verify visually after deploy.

### 7. Tests

`src/app/api/admin/users/[id]/__tests__/route.test.ts` updates:

- `change_tier free→pro` → RPC called with `new_tier: 'pro'`, app_metadata gets `plan_tier: 'pro'`, role: null.
- `change_tier pro→free` → RPC called, app_metadata role: null.
- `change_tier free→admin` → RPC called with `new_tier: 'admin'`, app_metadata role: 'admin'.
- `change_tier admin→free` when target is the only admin → 400 "Refusing: would remove last admin".
- `change_tier admin→free` when target === adminUser.id → 400 "Refusing: admin cannot demote self".
- `change_tier` with invalid value → 400.
- Removed: separate `grant_admin` / `revoke_admin` test cases (folded into above).

DB-side: a Vitest+pg integration covering the RPC is out of scope here; we rely on the route-level test plus a manual SQL test in staging before merging.

## Data Flow — Tier Change

```
Admin UI (select Pro)
  → POST /api/admin/users/:id { action: "change_tier", value: "pro" }
  → withAdminWrite + last-admin/self-lockout guard
  → supabase.rpc("admin_change_tier", { target_user_id, new_tier: "pro" })
       │
       ├── UPDATE profiles SET plan_tier='pro', credits_balance=150, credits_refreshed_at=now()
       ├── DELETE FROM user_roles WHERE user_id=… AND role='admin'  (no-op if not admin)
       ├── (if old_tier='pro' and new_tier<>'pro') UPDATE subscriptions SET status='cancelled'
       └── INSERT INTO credit_ledger (delta=150-old_balance, balance_after=150, reason='admin_tier_change')
  → auth.admin.updateUserById(id, app_metadata: { role: null, plan_tier: 'pro' })
  → auth.admin.signOut(id, 'global')
  → logAdminAction(adminUser.id, 'user_change_tier', { target_user_id, value: 'pro' })
  → 200 { success: true }
Admin UI re-fetches detail; new tier badge + balance render.
```

## Error Handling

- RPC raises → caught, route returns 500 `{ error: "Failed to change tier" }`. No partial state because the RPC is one transaction.
- `app_metadata` update fails after RPC succeeds → logged, request still returns 200. Effect: user keeps stale JWT until expiry (~1 h) or until they log in again. Acceptable; corrected on next refresh.
- `signOut` fails → logged, returns 200. Same fallback as above.
- Last-admin / self-demotion → 400 before any write.

## Migration Order

1. Apply SQL migration.
2. Deploy backend (route handler + new ledger endpoint).
3. Deploy frontend (admin UI changes + settings panel + users list column).

Since the SQL function is additive and the old `grant_admin_role`/`revoke_admin_role` RPCs are left in place (just unused by the new code), there is no breaking window.

## Open Questions / Future Work

- LemonSqueezy auto-cancellation on Pro→Free is deliberately deferred (decision C). Add when there is a clear support workflow.
- Credit ledger UI in Settings shows raw `reason` strings; if this gets shown to non-Hebrew users we'll need translations. Out of scope.
