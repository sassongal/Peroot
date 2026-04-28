# Admin Dashboard Sync + Per-User Credit Details — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the admin dashboard show synced/live counts on demand, auto-heal missing profiles, fix the broken `toggleAdmin` button, and replace the per-row credit badge with a richer block (balance + daily limit + refresh-at + last spend + 7-day sparkline).

**Architecture:** Trigger on `auth.users` insert + one-time backfill solve the auth↔profile divergence. Dashboard endpoint accepts `?refresh=1` to bypass Redis. New SQL RPC reports the auth/profile mismatch counts so the dashboard can render a warning card. The users-list endpoint joins per-user 7-day spend aggregates from `credit_ledger`. A new `UserCreditsBlock` component renders the rich panel; `toggleAdmin` switches to the unified `change_tier` action.

**Tech Stack:** Next.js 16 App Router · Supabase (Postgres triggers + RPC + RLS) · Upstash Redis · Vitest · Tailwind 4

**Spec:** `docs/superpowers/specs/2026-04-28-admin-dashboard-sync-and-credits-row-design.md`

---

## File Structure

**Create:**
- `supabase/migrations/20260428_auth_profile_autoheal.sql` — trigger, backfill, mismatch RPC.
- `src/components/admin/UserCreditsBlock.tsx` — rich per-row credit panel (replaces UserCreditsCell).
- `src/components/admin/DashboardMismatchCard.tsx` — warning card shown when auth/profile counts differ.
- `src/app/api/admin/users/__tests__/route.test.ts` — verifies new fields in the list response.
- `src/app/api/admin/dashboard/__tests__/refresh-bypass.test.ts` — verifies `?refresh=1` skips cache.

**Modify:**
- `src/app/api/admin/dashboard/route.ts` — accept `?refresh=1`, add `authProfileMismatch` to payload.
- `src/app/api/admin/users/route.ts` — return `daily_limit`, `last_spend_at`, `refresh_at`, `usage_last_7_days` per row.
- `src/app/admin/page.tsx` — Refresh button + mismatch card.
- `src/app/admin/users/page.tsx` — fix `toggleAdmin`, swap UserCreditsCell→UserCreditsBlock.

**Untouched:**
- `src/app/api/admin/users/bulk/route.ts` — already uses `grant_admin`/`revoke_admin` actions which are still wired to existing `grant_admin_role` RPCs (those RPCs still exist in the DB; only the per-user route stopped calling them).

---

## Task 1: Auth↔Profile auto-heal migration

**Files:**
- Create: `supabase/migrations/20260428_auth_profile_autoheal.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260428_auth_profile_autoheal.sql
-- Trigger: auto-create a profiles row whenever an auth.users row is inserted.
-- Backfill: heal the existing 1 orphan auth.users row with no profile.
-- RPC: report mismatch counts so the admin dashboard can show a warning card.

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

-- One-time backfill
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
```

- [ ] **Step 2: Apply via Supabase MCP**

Use `mcp__supabase__apply_migration` with `name: "auth_profile_autoheal"` and the SQL above. project_id: `ravinxlujmlvxhgbjxti`.

Expected: success.

- [ ] **Step 3: Verify mismatch is now 0**

Use `mcp__supabase__execute_sql`:

```sql
select * from auth_profile_mismatch_count();
```

Expected: `auth_count = 97, profile_count = 97, missing = 0`.

- [ ] **Step 4: Commit**

```bash
git -C /c/Users/sasso/dev/Peroot add Prut/web/supabase/migrations/20260428_auth_profile_autoheal.sql
git -C /c/Users/sasso/dev/Peroot commit -m "feat(db): auth↔profile auto-heal trigger + mismatch RPC"
```

---

## Task 2: Dashboard endpoint — refresh bypass + mismatch field

**Files:**
- Modify: `src/app/api/admin/dashboard/route.ts`

- [ ] **Step 1: Add refresh bypass and mismatch query**

Replace lines 17-26 (the cache-read block at the top) and lines 35-116 (Promise.all) and lines 171-194 (payload assembly) with the changes below. Read the file to find exact line numbers — they shift.

At the top of `GET`, after the `withAdmin` wrapper:

```ts
export const GET = withAdmin(async (req) => {
  const supabase = createServiceClient();
  const skipCache = new URL(req.url).searchParams.get("refresh") === "1";

  if (!skipCache) {
    try {
      const cached = await redis.get<Record<string, unknown>>(CACHE_KEY);
      if (cached) return NextResponse.json(cached);
    } catch (err) {
      logger.warn("[Admin Dashboard] Redis cache read failed:", err);
    }
  }
```

Inside the existing `Promise.all`, append one more entry at the end:

```ts
    // Auth/profile divergence so the dashboard can flag it
    supabase.rpc("auth_profile_mismatch_count"),
```

Adjust the destructuring to receive the new value as `{ data: mismatchRows }` (the RPC returns a one-row table).

After all aggregation, before assembling `payload`, add:

```ts
const mismatchRow = Array.isArray(mismatchRows) && mismatchRows[0] ? mismatchRows[0] : null;
const authProfileMismatch = mismatchRow
  ? {
      authCount: mismatchRow.auth_count ?? 0,
      profileCount: mismatchRow.profile_count ?? 0,
      missing: mismatchRow.missing ?? 0,
    }
  : null;
```

Add `authProfileMismatch` to the `payload` object.

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git -C /c/Users/sasso/dev/Peroot add 'Prut/web/src/app/api/admin/dashboard/route.ts'
git -C /c/Users/sasso/dev/Peroot commit -m "feat(api): admin dashboard refresh=1 bypass + auth↔profile mismatch field"
```

---

## Task 3: Dashboard test — refresh bypass

**Files:**
- Create: `src/app/api/admin/dashboard/__tests__/refresh-bypass.test.ts`

- [ ] **Step 1: Read existing dashboard tests if any**

```bash
ls src/app/api/admin/dashboard/__tests__/ 2>/dev/null
```

If a `route.test.ts` already exists, append cases there instead of creating a new file. Otherwise, create the file below.

- [ ] **Step 2: Write the test**

```ts
// src/app/api/admin/dashboard/__tests__/refresh-bypass.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const redisGet = vi.fn();
const redisSet = vi.fn();

vi.mock("@/lib/redis", () => ({
  redis: { get: redisGet, set: redisSet },
}));

vi.mock("@/lib/api-middleware", () => ({
  withAdmin: (h: unknown) => h,
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => {
    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ count: 0, data: [], error: null }),
    };
    return {
      from: vi.fn(() => queryBuilder),
      rpc: vi.fn().mockResolvedValue({
        data: [{ auth_count: 97, profile_count: 96, missing: 1 }],
        error: null,
      }),
    };
  },
}));

describe("GET /api/admin/dashboard refresh bypass", () => {
  beforeEach(() => {
    redisGet.mockReset();
    redisSet.mockReset();
  });

  it("returns cached payload when ?refresh is absent", async () => {
    redisGet.mockResolvedValue({ totalUsers: 42, generatedAt: "2026-01-01T00:00:00Z" });
    const { GET } = await import("../route");
    const req = new Request("https://x.test/api/admin/dashboard");
    const res = await GET(req as never);
    const body = await res.json();
    expect(redisGet).toHaveBeenCalled();
    expect(body.totalUsers).toBe(42);
  });

  it("skips cache and writes fresh value when ?refresh=1", async () => {
    redisGet.mockResolvedValue({ totalUsers: 42 });
    const { GET } = await import("../route");
    const req = new Request("https://x.test/api/admin/dashboard?refresh=1");
    const res = await GET(req as never);
    const body = await res.json();
    expect(redisGet).not.toHaveBeenCalled();
    expect(redisSet).toHaveBeenCalled();
    expect(body.totalUsers).toBe(0); // fresh path returned 0 counts from mocks
    expect(body.authProfileMismatch).toEqual({
      authCount: 97,
      profileCount: 96,
      missing: 1,
    });
  });
});
```

- [ ] **Step 3: Run the test**

```bash
npm run test -- 'src/app/api/admin/dashboard'
```

Expected: 2 passing.

If the existing dashboard route uses imports the mock setup can't satisfy, adjust the mocks until both tests pass. Do NOT skip tests.

- [ ] **Step 4: Commit**

```bash
git -C /c/Users/sasso/dev/Peroot add 'Prut/web/src/app/api/admin/dashboard/__tests__/refresh-bypass.test.ts'
git -C /c/Users/sasso/dev/Peroot commit -m "test(api): cover dashboard refresh=1 cache bypass + mismatch field"
```

---

## Task 4: Dashboard UI — Refresh button + mismatch warning card

**Files:**
- Create: `src/components/admin/DashboardMismatchCard.tsx`
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Create the warning card component**

```tsx
// src/components/admin/DashboardMismatchCard.tsx
"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getApiPath } from "@/lib/api-path";
import { logger } from "@/lib/logger";

interface Props {
  authCount: number;
  profileCount: number;
  missing: number;
  onSynced: () => void;
}

export function DashboardMismatchCard({ authCount, profileCount, missing, onSynced }: Props) {
  const [busy, setBusy] = useState(false);

  if (missing <= 0) return null;

  async function sync() {
    setBusy(true);
    try {
      const res = await fetch(getApiPath("/api/admin/sync-users"), { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "sync failed");
      toast.success(`סונכרנו ${json.synced ?? missing} משתמשים`);
      onSynced();
    } catch (err) {
      logger.error("[DashboardMismatchCard] sync failed:", err);
      toast.error("סנכרון נכשל");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 flex items-center gap-4"
    >
      <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-bold text-amber-300">
          נמצאו {missing} משתמשים ללא פרופיל
        </p>
        <p className="text-xs text-amber-400/80">
          {authCount} ב-auth · {profileCount} ב-profiles
        </p>
      </div>
      <button
        onClick={sync}
        disabled={busy}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-black uppercase tracking-widest hover:bg-amber-400 transition-all disabled:opacity-50"
      >
        {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
        סנכרן עכשיו
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into the dashboard page**

Open `src/app/admin/page.tsx`. The `DashboardData` interface needs:

```ts
authProfileMismatch?: { authCount: number; profileCount: number; missing: number } | null;
generatedAt?: string;
```

Find the data load function (likely `loadDashboard` or inside `useEffect`). Add a `forceRefresh: boolean = false` parameter. Construct the URL with `?refresh=1` when set.

Replace the existing `RefreshCw` icon (if any), or add a new button:

```tsx
<button
  onClick={() => loadDashboard(true)}
  disabled={refreshing}
  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 border border-white/5 text-xs font-bold text-zinc-300 hover:bg-zinc-700 transition-all disabled:opacity-50"
>
  <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
  רענן
</button>
```

Above the KPI cards block, add:

```tsx
import { DashboardMismatchCard } from "@/components/admin/DashboardMismatchCard";
// ...
{data?.authProfileMismatch && data.authProfileMismatch.missing > 0 && (
  <DashboardMismatchCard
    authCount={data.authProfileMismatch.authCount}
    profileCount={data.authProfileMismatch.profileCount}
    missing={data.authProfileMismatch.missing}
    onSynced={() => loadDashboard(true)}
  />
)}
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git -C /c/Users/sasso/dev/Peroot add 'Prut/web/src/components/admin/DashboardMismatchCard.tsx' 'Prut/web/src/app/admin/page.tsx'
git -C /c/Users/sasso/dev/Peroot commit -m "feat(admin/ui): manual refresh button + auth/profile mismatch warning card"
```

---

## Task 5: Users-list endpoint — daily_limit, last_spend_at, refresh_at, sparkline

**Files:**
- Modify: `src/app/api/admin/users/route.ts`

- [ ] **Step 1: Add the credits aggregation query**

Inside the GET handler, after `const userIds = (profiles ?? []).map((p) => p.id);` block, run an additional query (in parallel where possible):

```ts
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

const ledgerByUser = new Map<
  string,
  { lastSpend: string | null; daily: Record<string, number> }
>();

if (userIds.length > 0) {
  const { data: ledgerRows, error: ledgerErr } = await svc
    .from("credit_ledger")
    .select("user_id, created_at, reason")
    .in("user_id", userIds)
    .gte("created_at", sevenDaysAgo)
    .limit(50000);

  if (ledgerErr) {
    logger.warn("[admin/users] ledger aggregation warning:", ledgerErr);
  } else {
    for (const row of ledgerRows ?? []) {
      const uid = row.user_id as string;
      const ts = row.created_at as string;
      const reason = row.reason as string;
      const entry = ledgerByUser.get(uid) ?? { lastSpend: null, daily: {} };
      if (reason === "spend") {
        if (!entry.lastSpend || ts > entry.lastSpend) entry.lastSpend = ts;
        const day = ts.slice(0, 10); // YYYY-MM-DD (UTC)
        entry.daily[day] = (entry.daily[day] ?? 0) + 1;
      }
      ledgerByUser.set(uid, entry);
    }
  }
}

// Read site daily limit once for free users
const { data: siteSettings } = await svc
  .from("site_settings")
  .select("daily_free_limit")
  .maybeSingle();
const freeDailyLimit = siteSettings?.daily_free_limit ?? 2;

function buildSparkline(daily: Record<string, number>): number[] {
  const out: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    out.push(daily[d] ?? 0);
  }
  return out;
}
```

- [ ] **Step 2: Enrich the user mapping**

Replace the final `return { ...p, ... }` mapping to include the new fields:

```ts
const users = (profiles ?? []).map((p) => {
  const sub = (subscriptions ?? []).find((s) => s.user_id === p.id);
  const authLastSignIn = lastSignInByUser.get(p.id) ?? null;
  const profileLastSignIn = (p as { last_sign_in_at?: string | null }).last_sign_in_at ?? null;
  const lastSignInAt = authLastSignIn ?? profileLastSignIn;
  const lastPromptAt = (p as { last_prompt_at?: string | null }).last_prompt_at ?? null;
  const latestHistory = latestHistoryByUser.get(p.id) ?? null;

  const candidates = [lastPromptAt, latestHistory, lastSignInAt].filter((v): v is string => !!v);
  const lastActivityAt =
    candidates.length > 0
      ? candidates.reduce((a, b) => (new Date(a) > new Date(b) ? a : b))
      : null;

  const role =
    (roles ?? []).find((r) => r.user_id === p.id)?.role ?? "user";
  const tier = role === "admin" ? "admin" : (sub?.plan_name ?? p.plan_tier ?? "free");

  const daily_limit = tier === "admin" ? -1 : tier === "pro" ? 150 : freeDailyLimit;
  const ledger = ledgerByUser.get(p.id) ?? { lastSpend: null, daily: {} };
  const usage_last_7_days = buildSparkline(ledger.daily);

  let refresh_at: string | null = null;
  if (
    tier === "free" &&
    typeof p.credits_balance === "number" &&
    p.credits_balance < freeDailyLimit &&
    ledger.lastSpend
  ) {
    refresh_at = new Date(
      new Date(ledger.lastSpend).getTime() + 24 * 60 * 60 * 1000,
    ).toISOString();
  }

  return {
    ...p,
    last_sign_in_at: lastSignInAt,
    role,
    plan_tier: tier,
    customer_name: sub?.customer_name ?? null,
    prompt_count: promptCountByUser.get(p.id) ?? 0,
    last_prompt_at: lastPromptAt,
    last_activity_at: lastActivityAt,
    daily_limit,
    last_spend_at: ledger.lastSpend,
    refresh_at,
    usage_last_7_days,
  };
});
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git -C /c/Users/sasso/dev/Peroot add 'Prut/web/src/app/api/admin/users/route.ts'
git -C /c/Users/sasso/dev/Peroot commit -m "feat(api): admin users list returns daily_limit, refresh_at, last_spend_at, 7-day sparkline"
```

---

## Task 6: UserCreditsBlock component + users-list integration + toggleAdmin fix

**Files:**
- Create: `src/components/admin/UserCreditsBlock.tsx`
- Modify: `src/app/admin/users/page.tsx`

- [ ] **Step 1: Create UserCreditsBlock**

```tsx
// src/components/admin/UserCreditsBlock.tsx
"use client";

import { useEffect, useState } from "react";
import { Coins, Crown, Shield, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  tier: string | null | undefined;
  balance: number | null | undefined;
  dailyLimit: number; // -1 for admin (unlimited)
  refreshAt: string | null;
  lastSpendAt: string | null;
  usageLast7Days: number[];
}

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "כעת";
  if (m < 60) return `${m}ד`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}ש`;
  return `${Math.floor(h / 24)}י`;
}

function timeLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "מתחדש";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}ש ${m}ד`;
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <svg width={56} height={16} viewBox="0 0 56 16" className="shrink-0" aria-hidden>
      {values.map((v, i) => {
        const h = Math.max(1, Math.round((v / max) * 14));
        return (
          <rect
            key={i}
            x={i * 8}
            y={16 - h}
            width={6}
            height={h}
            className={v > 0 ? "fill-blue-400" : "fill-zinc-700"}
            rx={1}
          />
        );
      })}
    </svg>
  );
}

export function UserCreditsBlock({
  tier,
  balance,
  dailyLimit,
  refreshAt,
  lastSpendAt,
  usageLast7Days,
}: Props) {
  const [, setNow] = useState(0);
  useEffect(() => {
    if (!refreshAt) return;
    const id = setInterval(() => setNow((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [refreshAt]);

  const t = (tier ?? "free").toLowerCase();
  const b = balance ?? 0;
  const limitLabel = dailyLimit === -1 ? "∞" : String(dailyLimit);

  const tierChip =
    t === "admin" ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-widest">
        <Shield className="w-2.5 h-2.5" /> Admin
      </span>
    ) : t === "pro" ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-widest">
        <Crown className="w-2.5 h-2.5" /> Pro
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/60 border border-white/5 text-zinc-300 text-[9px] font-black uppercase tracking-widest">
        Free
      </span>
    );

  const balanceTone =
    t === "admin"
      ? "text-blue-400"
      : t === "pro"
        ? "text-amber-300"
        : b <= 0
          ? "text-red-400"
          : b <= 2
            ? "text-zinc-200"
            : "text-zinc-300";

  const usage = usageLast7Days.length === 7 ? usageLast7Days : Array(7).fill(0);

  return (
    <div className="flex flex-col gap-1.5 min-w-[140px]" dir="rtl">
      <div className="flex items-center gap-2">
        {tierChip}
        <span className={cn("text-xs font-mono font-bold", balanceTone)}>
          {t === "admin" ? "∞" : `${b} / ${limitLabel}`}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Sparkline values={usage} />
        {lastSpendAt ? (
          <span className="text-[9px] text-zinc-600">לפני {timeAgo(lastSpendAt)}</span>
        ) : (
          <span className="text-[9px] text-zinc-700">ללא שימוש</span>
        )}
      </div>
      {t === "free" && refreshAt && b <= 0 ? (
        <div className="flex items-center gap-1 text-[9px] text-amber-400">
          <Clock className="w-2.5 h-2.5" />
          חידוש בעוד {timeLeft(refreshAt)}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Update User type and swap component in users page**

In `src/app/admin/users/page.tsx`, extend the `User` interface:

```ts
interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
  role: string | null;
  is_banned: boolean;
  credits_balance: number;
  plan_tier?: string;
  customer_name?: string | null;
  tags?: string[];
  prompt_count?: number;
  last_prompt_at?: string | null;
  last_activity_at?: string | null;
  // new
  daily_limit?: number;
  last_spend_at?: string | null;
  refresh_at?: string | null;
  usage_last_7_days?: number[];
}
```

Replace the existing `<UserCreditsCell .../>` call with:

```tsx
<UserCreditsBlock
  tier={user.role === "admin" ? "admin" : user.plan_tier}
  balance={user.credits_balance}
  dailyLimit={user.daily_limit ?? 2}
  refreshAt={user.refresh_at ?? null}
  lastSpendAt={user.last_spend_at ?? null}
  usageLast7Days={user.usage_last_7_days ?? []}
/>
```

Update the import:
```ts
import { UserCreditsBlock } from "@/components/admin/UserCreditsBlock";
```

(Remove the `UserCreditsCell` import if present.)

- [ ] **Step 3: Fix toggleAdmin**

Replace the body of `toggleAdmin` (~line 180):

```ts
async function toggleAdmin(userId: string, currentRole: string | null) {
  const isNowAdmin = currentRole === "admin";
  const actionText = isNowAdmin
    ? t.admin.users.toasts.action_remove
    : t.admin.users.toasts.action_add;

  if (!confirm(t.admin.users.toasts.admin_confirm.replace("{action}", actionText))) return;

  try {
    const res = await fetch(getApiPath(`/api/admin/users/${userId}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "change_tier", value: isNowAdmin ? "free" : "admin" }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.error ?? `HTTP ${res.status}`);
    }

    toast.success(t.admin.users.toasts.update_success);
    loadUsers();
  } catch (err) {
    logger.error("[admin/users] toggleAdmin failed:", err);
    toast.error(err instanceof Error ? err.message : "Failed to update role");
  }
}
```

- [ ] **Step 4: Delete `src/components/admin/UserCreditsCell.tsx`**

```bash
rm src/components/admin/UserCreditsCell.tsx
```

(Skip if other consumers exist — verify with `grep -r "UserCreditsCell" src/`.)

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git -C /c/Users/sasso/dev/Peroot add Prut/web/src/components/admin/UserCreditsBlock.tsx 'Prut/web/src/app/admin/users/page.tsx'
git -C /c/Users/sasso/dev/Peroot rm Prut/web/src/components/admin/UserCreditsCell.tsx 2>/dev/null || true
git -C /c/Users/sasso/dev/Peroot commit -m "feat(admin/ui): rich per-user credits block + fix toggleAdmin to use change_tier"
```

---

## Task 7: Users-list endpoint test

**Files:**
- Create: `src/app/api/admin/users/__tests__/route.test.ts`

- [ ] **Step 1: Write the test**

```ts
// src/app/api/admin/users/__tests__/route.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/api-middleware", () => ({
  withAdmin: (h: unknown) => h,
}));

vi.mock("@/lib/sanitize", () => ({
  escapePostgrestValue: (s: string) => s,
}));

const fixtureProfile = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "x@y.com",
  plan_tier: "free",
  credits_balance: 0,
  created_at: "2026-04-20T00:00:00Z",
  last_prompt_at: null,
  last_sign_in_at: null,
};

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            order: () => ({
              range: () =>
                Promise.resolve({ data: [fixtureProfile], count: 1, error: null }),
            }),
          }),
        };
      }
      if (table === "user_roles") {
        return { select: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) };
      }
      if (table === "subscriptions") {
        return { select: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) };
      }
      if (table === "history") {
        return {
          select: () => ({
            in: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "credit_ledger") {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        return {
          select: () => ({
            in: () => ({
              gte: () => ({
                limit: () =>
                  Promise.resolve({
                    data: [
                      { user_id: fixtureProfile.id, created_at: yesterday, reason: "spend" },
                    ],
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }
      if (table === "site_settings") {
        return {
          select: () => ({
            maybeSingle: () => Promise.resolve({ data: { daily_free_limit: 2 }, error: null }),
          }),
        };
      }
      return {
        select: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
      };
    }),
    auth: {
      admin: {
        listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
      },
    },
  }),
}));

describe("GET /api/admin/users enrichment", () => {
  it("returns daily_limit, last_spend_at, refresh_at, usage_last_7_days", async () => {
    const { GET } = await import("../route");
    const req = new Request("https://x.test/api/admin/users") as never;
    const res = await GET(req);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(1);
    const u = body[0];
    expect(u.daily_limit).toBe(2);
    expect(u.last_spend_at).toBeTruthy();
    expect(u.refresh_at).toBeTruthy(); // free + balance < limit + recent spend
    expect(Array.isArray(u.usage_last_7_days)).toBe(true);
    expect(u.usage_last_7_days).toHaveLength(7);
    const total = u.usage_last_7_days.reduce((s: number, v: number) => s + v, 0);
    expect(total).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run the test**

```bash
npm run test -- 'src/app/api/admin/users/__tests__/route.test.ts'
```

Expected: 1 passing.

If the mock chain doesn't match the actual query shape, adjust the fixture mocks until it passes. Do NOT skip.

- [ ] **Step 3: Commit**

```bash
git -C /c/Users/sasso/dev/Peroot add 'Prut/web/src/app/api/admin/users/__tests__/route.test.ts'
git -C /c/Users/sasso/dev/Peroot commit -m "test(api): admin users list returns enriched credit fields"
```

---

## Task 8: End-to-end verification

**Files:** none

- [ ] **Step 1: Lint + typecheck + tests**

```bash
npm run lint && npm run typecheck && npm run test
```

Expected: all green for files we touched. (The repo has 66 pre-existing lint errors in unrelated files — verify none of ours show up.)

- [ ] **Step 2: Manual flow — Refresh button**

```bash
npm run dev
```

Visit `/admin`. Click Refresh. Confirm `generatedAt` timestamp updates.

- [ ] **Step 3: Manual flow — Mismatch card**

In Supabase SQL editor, intentionally remove a profile to simulate a mismatch:

```sql
delete from profiles where id = (select id from profiles order by created_at desc limit 1);
```

Click Refresh on `/admin`. The mismatch card should appear with `missing: 1`. Click "סנכרן עכשיו"; the card disappears, profile is restored.

- [ ] **Step 4: Manual flow — toggleAdmin button**

On `/admin/users`, click the role toggle on a non-admin user. Confirm the toast shows success and the user's badge flips to Admin.

- [ ] **Step 5: Manual flow — Per-row credits block**

On `/admin/users`, scan rows. Confirm tier chip + `balance/limit` + sparkline (with bars on days that had spends) + "לפני Xה" timestamp + countdown for free users at 0.

- [ ] **Step 6: Push**

Only after all four manual flows pass:

```bash
git -C /c/Users/sasso/dev/Peroot push origin main
```

---

## Self-Review

- **Spec coverage:** §1 → Task 2+3+4. §2 → Task 1+4. §3 → Task 6 (toggleAdmin); bulk endpoint left untouched per spec note. §4 → Task 5+6. §5 → Task 3+7. ✓
- **Placeholders:** none — all SQL/TS/test code shown verbatim.
- **Type consistency:** `daily_limit: -1` sentinel for admin used consistently in API/component. `usage_last_7_days` length is always 7. `refresh_at: string | null` consistent across API + component prop.
- **Bulk endpoint:** intentionally NOT in scope. Spec acknowledges it still works because `grant_admin_role`/`revoke_admin_role` RPCs still exist in the DB. Documented as untouched in File Structure.
