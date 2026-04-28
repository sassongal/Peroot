# Admin Tier Change & Credit Visibility — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify admin tier change into a single Free/Pro/Admin dropdown that atomically performs all required side-effects, and surface credit status to every user (Settings panel + admin users list column).

**Architecture:** A new `security definer` Postgres function `admin_change_tier(uuid, text)` performs the tier change as one transaction (profile + role + subscription + credit ledger). The route handler wraps it with last-admin/self-lockout guards, syncs `app_metadata`, and forces JWT refresh via `signOut`. The admin sidebar's separate "Grant Admin" button is removed. A new Settings credits panel and admin users list credits column read from existing endpoints.

**Tech Stack:** Next.js 16 App Router · Supabase (Postgres + RLS + Auth admin API) · Vitest · Tailwind 4

**Spec:** `docs/superpowers/specs/2026-04-28-admin-tier-change-and-credits-design.md`

---

## File Structure

**Create:**
- `supabase/migrations/20260428_admin_change_tier.sql` — RPC definition.
- `src/app/api/me/credits/ledger/route.ts` — user-scoped ledger endpoint (last 10 entries).
- `src/components/settings/CreditsPanel.tsx` — Settings credits panel (RTL Hebrew).
- `src/components/admin/UserCreditsCell.tsx` — small column cell for the admin users list (kept separate so it's reusable and the list page stays focused).

**Modify:**
- `src/app/api/admin/users/[id]/route.ts` — replace `change_tier` case body, drop `grant_admin`/`revoke_admin` cases and Zod enum entries.
- `src/app/api/admin/users/[id]/__tests__/route.test.ts` — update tier-change tests, remove obsolete admin-role tests.
- `src/app/admin/users/[id]/page.tsx` — dropdown options Free/Pro/Admin only; remove Admin Role sidebar block; init `tierValue` from role.
- `src/app/admin/users/page.tsx` — add Credits column rendering.
- `src/app/settings/page.tsx` — mount `<CreditsPanel/>`.

**Untouched (verify only):**
- `src/components/PromptLimitIndicator.tsx` — already renders all four states.
- `src/app/api/me/quota/route.ts` — already returns `{plan_tier, credits_balance, daily_limit, refresh_at}`.

---

### Task 1: Add the `admin_change_tier` RPC migration

**Files:**
- Create: `supabase/migrations/20260428_admin_change_tier.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260428_admin_change_tier.sql
-- Atomic admin tier change: updates plan_tier, resets credits to baseline,
-- syncs user_roles for admin, marks active subscriptions cancelled when leaving pro,
-- writes credit_ledger audit row. All in one transaction.

create or replace function public.admin_change_tier(
  target_user_id uuid,
  new_tier text  -- 'free' | 'pro' | 'admin'
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
         last_prompt_at       = case when new_tier = 'free' then null else last_prompt_at end,
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
  'Atomic admin tier change. Resets credits to baseline (free=2, pro=150, admin=0), syncs user_roles, marks active subscriptions cancelled on Pro→other, writes credit_ledger row.';
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Use `mcp__supabase__apply_migration` with `name: "admin_change_tier"` and the SQL above.

Expected: success, no errors.

- [ ] **Step 3: Smoke-test the RPC via SQL**

Use `mcp__supabase__execute_sql` (replace UUID with a real test user id from `profiles`):

```sql
select admin_change_tier('00000000-0000-0000-0000-000000000000'::uuid, 'invalid_tier');
```

Expected: error `invalid tier: invalid_tier`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260428_admin_change_tier.sql
git commit -m "feat(db): admin_change_tier RPC for atomic tier transitions"
```

---

### Task 2: Replace `change_tier` case in admin user route

**Files:**
- Modify: `src/app/api/admin/users/[id]/route.ts`

- [ ] **Step 1: Update the Zod schema — drop grant_admin / revoke_admin actions**

Replace lines 9–20:

```ts
const adminActionSchema = z.object({
  action: z.enum([
    "change_tier",
    "grant_credits",
    "revoke_credits",
    "ban",
    "unban",
  ]),
  value: z.union([z.string(), z.number()]).optional(),
});
```

- [ ] **Step 2: Remove the `revoke_admin` last-admin guard block (lines 220–235)**

Delete the `if (action === "revoke_admin") { ... }` block entirely. The new tier-change case re-implements the guard inline.

Note: keep the self-lockout block at lines 214–219 but tighten it to ban only:

```ts
if (id === adminUser.id && action === "ban") {
  return NextResponse.json(
    { error: "Refusing ban: admin cannot ban themselves" },
    { status: 400 },
  );
}
```

- [ ] **Step 3: Replace the entire `case "change_tier"` block**

Replace lines 238–256 with:

```ts
case "change_tier": {
  const validTiers = ["free", "pro", "admin"] as const;
  type Tier = (typeof validTiers)[number];
  if (typeof value !== "string" || !validTiers.includes(value as Tier)) {
    return NextResponse.json(
      { error: `value must be one of: ${validTiers.join(", ")}` },
      { status: 400 },
    );
  }
  const newTier = value as Tier;

  // Last-admin / self-demotion guards (only when leaving admin)
  if (newTier !== "admin") {
    const { data: currentRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", id)
      .maybeSingle();

    if (currentRole?.role === "admin") {
      if (id === adminUser.id) {
        return NextResponse.json(
          { error: "Refusing: admin cannot demote self" },
          { status: 400 },
        );
      }
      const { count, error: countErr } = await supabase
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "admin");
      if (countErr) {
        logger.error("[Admin User POST] change_tier admin-count check failed:", countErr);
        return NextResponse.json({ error: "Failed to verify admin count" }, { status: 500 });
      }
      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: "Refusing: this would remove the last remaining admin" },
          { status: 400 },
        );
      }
    }
  }

  const { error: rpcErr } = await supabase.rpc("admin_change_tier", {
    target_user_id: id,
    new_tier: newTier,
  });
  if (rpcErr) {
    logger.error("[Admin User POST] change_tier RPC error:", rpcErr);
    return NextResponse.json({ error: "Failed to change tier" }, { status: 500 });
  }

  // Sync app_metadata so proxy.ts JWT checks see the new role/tier without a DB hit.
  const { error: metaErr } = await supabase.auth.admin.updateUserById(id, {
    app_metadata: {
      role: newTier === "admin" ? "admin" : null,
      plan_tier: newTier,
    },
  });
  if (metaErr) logger.error("[Admin User POST] change_tier app_metadata error:", metaErr);

  // Force JWT refresh so the new role/tier is visible on the user's next request.
  const { error: signOutErr } = await supabase.auth.admin.signOut(id, "global");
  if (signOutErr) logger.error("[Admin User POST] change_tier signOut error:", signOutErr);
  break;
}
```

- [ ] **Step 4: Delete the `grant_admin` and `revoke_admin` case blocks (lines 330–366)**

Remove both `case "grant_admin": { ... }` and `case "revoke_admin": { ... }` blocks entirely. They're superseded by `change_tier`.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: pass with no errors related to this file.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/users/[id]/route.ts
git commit -m "feat(api): unify admin tier change to call admin_change_tier RPC"
```

---

### Task 3: Update admin user-route tests

**Files:**
- Modify: `src/app/api/admin/users/[id]/__tests__/route.test.ts`

- [ ] **Step 1: Read the current test file to learn its mock pattern**

Run: read the file in full. Note how it mocks `createServiceClient`, `withAdminWrite`, `parseAdminInput`. Reuse those mocks.

- [ ] **Step 2: Add tests for the new change_tier behavior**

Append (or replace existing tier-change tests with) the following test cases. The exact mock shape must match what the existing file uses — adapt names if needed.

```ts
describe("POST change_tier (unified)", () => {
  it("calls admin_change_tier RPC with 'pro' and syncs app_metadata", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const updateUserById = vi.fn().mockResolvedValue({ error: null });
    const signOut = vi.fn().mockResolvedValue({ error: null });
    mockServiceClient({ rpc, auth: { admin: { updateUserById, signOut } } });

    const res = await POST(
      makeReq({ action: "change_tier", value: "pro" }),
      makeCtx({ params: Promise.resolve({ id: TARGET_ID }) }),
    );

    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("admin_change_tier", {
      target_user_id: TARGET_ID,
      new_tier: "pro",
    });
    expect(updateUserById).toHaveBeenCalledWith(TARGET_ID, {
      app_metadata: { role: null, plan_tier: "pro" },
    });
    expect(signOut).toHaveBeenCalledWith(TARGET_ID, "global");
  });

  it("sets role:'admin' in app_metadata when promoting to admin", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const updateUserById = vi.fn().mockResolvedValue({ error: null });
    const signOut = vi.fn().mockResolvedValue({ error: null });
    mockServiceClient({ rpc, auth: { admin: { updateUserById, signOut } } });

    await POST(
      makeReq({ action: "change_tier", value: "admin" }),
      makeCtx({ params: Promise.resolve({ id: TARGET_ID }) }),
    );

    expect(updateUserById).toHaveBeenCalledWith(TARGET_ID, {
      app_metadata: { role: "admin", plan_tier: "admin" },
    });
  });

  it("refuses self-demotion when admin demotes themselves to free", async () => {
    mockServiceClient({
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { role: "admin" } }) }),
        }),
      })),
    });
    const res = await POST(
      makeReq({ action: "change_tier", value: "free" }),
      makeCtx({ params: Promise.resolve({ id: ADMIN_USER_ID }) }), // == adminUser.id
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/cannot demote self/i);
  });

  it("refuses last-admin demotion", async () => {
    // role lookup says target is admin; count check returns 1
    const fromMock = vi.fn((table: string) => {
      if (table === "user_roles") {
        // First call: select role for target — return admin
        // Second call: select count for total admins — return 1
        let call = 0;
        return {
          select: () => {
            call += 1;
            if (call === 1) {
              return {
                eq: () => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { role: "admin" } }),
                }),
              };
            }
            return {
              eq: () => Promise.resolve({ count: 1, error: null }),
            };
          },
        };
      }
      return {} as never;
    });
    mockServiceClient({ from: fromMock });

    const res = await POST(
      makeReq({ action: "change_tier", value: "free" }),
      makeCtx({ params: Promise.resolve({ id: TARGET_ID }) }), // != adminUser.id
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/last remaining admin/i);
  });

  it("returns 400 for invalid tier value", async () => {
    const res = await POST(
      makeReq({ action: "change_tier", value: "premium" }),
      makeCtx({ params: Promise.resolve({ id: TARGET_ID }) }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/value must be one of/);
  });
});
```

If the file uses different helper names (`mockServiceClient`, `makeReq`, `makeCtx`), adapt accordingly — do not invent new helpers.

- [ ] **Step 3: Delete the old grant_admin / revoke_admin test blocks**

Search the test file for `"grant_admin"` and `"revoke_admin"` and remove the corresponding `it()` / `describe()` blocks — they no longer exist as actions.

- [ ] **Step 4: Run the tests**

Run: `npm run test -- src/app/api/admin/users/\[id\]/__tests__/route.test.ts`
Expected: PASS for all five `change_tier` cases above.

If tests fail because helper names differ, adjust the test to match the file's existing helpers and re-run.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/users/[id]/__tests__/route.test.ts
git commit -m "test(api): cover unified change_tier action and remove obsolete admin-role tests"
```

---

### Task 4: Simplify admin user-detail UI — single tier dropdown, no separate admin block

**Files:**
- Modify: `src/app/admin/users/[id]/page.tsx`

- [ ] **Step 1: Update tier dropdown options (line 1244 area)**

Replace the three `<option>` lines inside the `<select value={tierValue} ...>`:

```tsx
<option value="free">Free</option>
<option value="pro">Pro</option>
<option value="admin">Admin</option>
```

- [ ] **Step 2: Initialize tierValue from role when admin**

Replace the line in `fetchDetail` that sets `tierValue` (~line 218):

```ts
setTierValue(json.role?.role === "admin" ? "admin" : (json.profile.plan_tier ?? "free"));
```

- [ ] **Step 3: Remove the entire "Admin Role" sidebar block (lines 1340–1372)**

Delete the `<Divider />` immediately preceding it AND the entire `<div className="space-y-3"> ... Admin Role ... Grant/Revoke ... </div>` block. This is the block that contains the `Crown` button and the `doAction(isAdmin ? "revoke_admin" : "grant_admin")` call.

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: pass.

- [ ] **Step 5: Manual smoke test in dev**

```bash
npm run dev
```

Visit `http://localhost:3000/admin/users/<some-user-id>` (replace with a real id). Confirm:
- Dropdown shows Free / Pro / Admin only.
- No "Admin Role" sidebar block.
- Selecting "Admin" + "Update Tier" flips the tier badge after refetch.

If you can't run the server, skip and rely on typecheck.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/users/[id]/page.tsx
git commit -m "feat(admin/ui): unified Free/Pro/Admin tier dropdown, drop separate admin role block"
```

---

### Task 5: Add Credits column to admin users list

**Files:**
- Create: `src/components/admin/UserCreditsCell.tsx`
- Modify: `src/app/admin/users/page.tsx`

- [ ] **Step 1: Create `UserCreditsCell.tsx`**

```tsx
// src/components/admin/UserCreditsCell.tsx
"use client";

import { cn } from "@/lib/utils";
import { Coins, Crown, Shield } from "lucide-react";

interface Props {
  tier: string | null | undefined;
  balance: number | null | undefined;
}

export function UserCreditsCell({ tier, balance }: Props) {
  const t = (tier ?? "free").toLowerCase();
  const b = balance ?? 0;

  if (t === "admin") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest">
        <Shield className="w-3 h-3" />
        ∞
      </span>
    );
  }

  if (t === "pro") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest">
        <Crown className="w-3 h-3" />
        {b}
      </span>
    );
  }

  // free
  const tone =
    b <= 0
      ? "bg-red-500/10 border-red-500/20 text-red-400"
      : b <= 2
        ? "bg-zinc-700/30 border-zinc-600/40 text-zinc-300"
        : "bg-zinc-800/40 border-white/5 text-zinc-400";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest",
        tone,
      )}
    >
      <Coins className="w-3 h-3" />
      {b}
    </span>
  );
}
```

- [ ] **Step 2: Render the cell in the users list**

Open `src/app/admin/users/page.tsx`. Find where each user row renders existing columns (search for `prompt_count` to locate the row). Add a new column header "Credits" and a corresponding cell:

```tsx
import { UserCreditsCell } from "@/components/admin/UserCreditsCell";
// ...
<UserCreditsCell tier={u.plan_tier} balance={u.credits_balance} />
```

Place it immediately after the tier/role column. If the list is a flex layout rather than a table, follow the existing wrapping convention.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/UserCreditsCell.tsx src/app/admin/users/page.tsx
git commit -m "feat(admin/ui): show per-user credit status in users list"
```

---

### Task 6: Add `/api/me/credits/ledger` endpoint

**Files:**
- Create: `src/app/api/me/credits/ledger/route.ts`

- [ ] **Step 1: Write the route**

```ts
// src/app/api/me/credits/ledger/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * GET /api/me/credits/ledger
 * Returns the authenticated user's last 10 credit_ledger entries.
 * RLS already restricts the table to the row owner; we filter by auth.uid()
 * defensively so the endpoint cannot return cross-user rows even if RLS is loosened.
 */
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("credit_ledger")
      .select("id, delta, balance_after, reason, source, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      logger.error("[me/credits/ledger] query error:", error);
      return NextResponse.json({ error: "Failed to load ledger" }, { status: 500 });
    }

    return NextResponse.json(
      { entries: data ?? [] },
      { headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" } },
    );
  } catch (err) {
    logger.error("[me/credits/ledger] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/me/credits/ledger/route.ts
git commit -m "feat(api): /api/me/credits/ledger returns last 10 entries for current user"
```

---

### Task 7: Build the Settings credits panel

**Files:**
- Create: `src/components/settings/CreditsPanel.tsx`
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 1: Write `CreditsPanel.tsx`**

```tsx
// src/components/settings/CreditsPanel.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Coins, Crown, Shield, Sparkles } from "lucide-react";
import { logger } from "@/lib/logger";

interface Quota {
  plan_tier: "free" | "pro" | "admin";
  credits_balance: number;
  daily_limit: number;
  refresh_at: string | null;
}

interface LedgerEntry {
  id: string;
  delta: number;
  balance_after: number;
  reason: string;
  source: string;
  created_at: string;
}

const REASON_LABELS: Record<string, string> = {
  registration_bonus: "בונוס הרשמה",
  daily_reset: "איפוס יומי",
  subscription_grant: "מנוי Pro",
  spend: "שימוש",
  refund: "החזר",
  admin_grant: "הענקת מנהל",
  admin_revoke: "שלילה ע״י מנהל",
  admin_tier_change: "שינוי מסלול",
  churn_revoke: "ביטול מנוי",
  referral_bonus: "בונוס הפניה",
};

function timeLeft(toIso: string): string {
  const ms = new Date(toIso).getTime() - Date.now();
  if (ms <= 0) return "מתחדש כעת";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${h}ש ${m}ד ${s}ש`;
}

export function CreditsPanel() {
  const [quota, setQuota] = useState<Quota | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [qRes, lRes] = await Promise.all([
          fetch("/api/me/quota", { credentials: "include" }),
          fetch("/api/me/credits/ledger", { credentials: "include" }),
        ]);
        if (cancelled) return;
        if (qRes.ok) setQuota(await qRes.json());
        if (lRes.ok) {
          const json = await lRes.json();
          setLedger(json.entries ?? []);
        }
      } catch (e) {
        logger.error("[CreditsPanel] load failed:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!quota?.refresh_at) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [quota?.refresh_at]);

  if (loading || !quota) {
    return (
      <div className="rounded-3xl border border-white/5 bg-zinc-950/50 p-8 animate-pulse">
        <div className="h-6 w-40 bg-zinc-800 rounded mb-4" />
        <div className="h-12 w-24 bg-zinc-800 rounded" />
      </div>
    );
  }

  const tier = quota.plan_tier;
  const tierBadge =
    tier === "admin" ? (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest">
        <Shield className="w-3 h-3" /> מנהל
      </span>
    ) : tier === "pro" ? (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest">
        <Crown className="w-3 h-3" /> Pro
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-800/60 border border-white/5 text-zinc-300 text-[10px] font-black uppercase tracking-widest">
        <Sparkles className="w-3 h-3" /> חינמי
      </span>
    );

  void tick; // re-render trigger for countdown

  return (
    <div className="rounded-3xl border border-white/5 bg-zinc-950/50 p-8 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-white uppercase tracking-[0.25em] flex items-center gap-3">
          <Coins className="w-4 h-4 text-amber-400" />
          קרדיטים
        </h3>
        {tierBadge}
      </div>

      <div className="flex items-end gap-4">
        {tier === "admin" ? (
          <span className="text-5xl font-black text-blue-400">∞</span>
        ) : (
          <span className="text-5xl font-black text-white">{quota.credits_balance}</span>
        )}
        {tier === "free" && (
          <span className="text-xs text-zinc-500 mb-2">/ {quota.daily_limit} ביום</span>
        )}
      </div>

      {tier === "admin" && (
        <p className="text-xs text-zinc-400">חשבון מנהל — ללא הגבלת שימוש.</p>
      )}

      {tier === "free" && quota.refresh_at && (
        <p className="text-xs text-zinc-500">
          חידוש בעוד <span className="text-amber-400 font-mono">{timeLeft(quota.refresh_at)}</span>
        </p>
      )}

      {tier === "free" && (
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-black uppercase tracking-widest hover:bg-amber-400 transition-colors"
        >
          שדרג ל-Pro
        </Link>
      )}
      {tier === "pro" && (
        <Link
          href="/settings/subscription"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 border border-white/10 text-zinc-200 text-xs font-black uppercase tracking-widest hover:bg-zinc-700 transition-colors"
        >
          ניהול מנוי
        </Link>
      )}

      {ledger.length > 0 && (
        <div className="pt-4 border-t border-white/5 space-y-2">
          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
            פעילות אחרונה
          </span>
          <ul className="space-y-1.5">
            {ledger.map((e) => {
              const positive = e.delta > 0;
              return (
                <li
                  key={e.id}
                  className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-white/2 border border-white/5"
                >
                  <span className="text-xs font-bold text-zinc-300">
                    {REASON_LABELS[e.reason] ?? e.reason}
                  </span>
                  <span
                    className={
                      positive
                        ? "text-xs font-mono text-emerald-400"
                        : "text-xs font-mono text-red-400"
                    }
                  >
                    {positive ? "+" : ""}
                    {e.delta}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Mount it in the Settings page**

Open `src/app/settings/page.tsx`. Add the import and render the panel near the top of the settings content (place it under the profile section if there is one, otherwise as the first card):

```tsx
import { CreditsPanel } from "@/components/settings/CreditsPanel";
// ...
<CreditsPanel />
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: pass.

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
```

Visit `http://localhost:3000/settings`. Confirm balance, tier badge, and (for free tier) the countdown ticks every second.

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/CreditsPanel.tsx src/app/settings/page.tsx
git commit -m "feat(settings): add credits panel with balance, tier, refresh timer, recent activity"
```

---

### Task 8: End-to-end manual verification

**Files:** none (verification only)

- [ ] **Step 1: Run full lint + typecheck + tests**

```bash
npm run lint && npm run typecheck && npm run test
```

Expected: all pass.

- [ ] **Step 2: Manual flow — Free → Pro**

In dev (`npm run dev`):
1. Pick a free test user from `/admin/users`.
2. Open detail page, set tier to Pro, click Update Tier.
3. Confirm: tier badge updates, Credits quick-stat shows 150, Credits tab shows a new `admin_tier_change` row with `+148` (or whatever delta from old balance).
4. From the user's browser session (separate window): they should be signed out (next request); after re-login, header pill shows the gold Pro pill with 150 credits.

- [ ] **Step 3: Manual flow — Pro → Free with active subscription**

1. In SQL editor (Supabase MCP `execute_sql`), confirm the user has an active row in `subscriptions`.
2. Set tier back to Free in the admin panel.
3. Confirm: subscription row's `status` is now `cancelled`, profile balance is 2.

- [ ] **Step 4: Manual flow — Free → Admin**

1. Promote a test user to Admin.
2. Confirm: `user_roles` has the row, `app_metadata.role === 'admin'`, header pill shows the blue Admin shield, header pill text says Admin.

- [ ] **Step 5: Manual guard checks**

1. Try to set the only-admin user back to Free — expect 400 with "last remaining admin".
2. Try to set yourself (the logged-in admin) to Free — expect 400 with "cannot demote self".

- [ ] **Step 6: Commit any docs follow-ups**

If you discover anything during manual testing that needs noting, add it to the spec:

```bash
git add docs/superpowers/specs/2026-04-28-admin-tier-change-and-credits-design.md
git commit -m "docs(spec): note manual verification follow-ups"
```

(If nothing to note, skip this step.)

---

## Self-review notes

- All 7 design sections are covered (DB → API → user-detail UI → users list column → settings panel → header pill verify-only → tests).
- Header pill (section 6 of the spec) is intentionally verify-only — not a task — because the existing component already handles all four states.
- No placeholders, all SQL/TS shown in full, file paths absolute-relative to `src/` and `supabase/`.
- `admin_change_tier` signature is consistent across migration, route handler, and tests.
