# Admin Sync Audit — Design (Spec 2)

**Date:** 2026-04-28
**Status:** Approved (auto mode)
**Predecessor:** Spec 1 — `2026-04-28-admin-dashboard-sync-and-credits-row-design.md`

## Problem

A full pass over admin endpoints found three classes of consistency bugs not addressed in Spec 1:

1. Four endpoints (`analytics`, `costs`, `funnel`, `revenue`) cache for 5 minutes with no refresh-bypass query parameter; admins must wait out the TTL.
2. DAU/WAU/MAU computations disagree across endpoints. `dashboard` derives them from `history.user_id`; `analytics` and `stats` derive them from `activity_logs.user_id`. The `activity_logs` table includes navigation noise (e.g., "viewed dashboard") that inflates active counts relative to real product usage.
3. The bulk endpoint `/api/admin/users/bulk` still calls the legacy `grant_admin_role`/`revoke_admin_role` RPCs, which means bulk admin promotion does NOT perform the credit reset and `app_metadata.plan_tier` sync that the unified `admin_change_tier` RPC does.

## Goals

- Every admin endpoint that caches respects `?refresh=1`.
- DAU/WAU/MAU is identical across the three endpoints that compute it.
- Bulk admin role changes follow the same path as single-user admin role changes.

## Non-Goals

- Replacing the 5-minute Redis cache with finer-grained event-driven invalidation.
- Adding new admin tabs or new metrics.
- Touching unrelated endpoints (database, blog, content-factory, etc.).

## Architecture

### A. `?refresh=1` for analytics/costs/funnel/revenue

Each route follows the exact pattern Spec 1 introduced for dashboard:

```ts
const skipCache = new URL(req.url).searchParams.get("refresh") === "1";
if (!skipCache) {
  const cached = await redis.get(cacheKey);
  if (cached) return NextResponse.json(cached);
}
// ... build payload ...
await redis.set(cacheKey, payload, { ex: CACHE_TTL });
```

Revenue has two cache keys (`admin:revenue:ls_mrr` and `admin:revenue:payload:v1`). Both are bypassed when `refresh=1` is present.

### B. Canonical DAU/WAU/MAU source

Switch all three endpoints (`dashboard`, `analytics`, `stats`) to query `history.user_id` over the relevant window. `activity_logs` retains its role for the activity feed and audit trail; only the active-user count changes.

Rationale: a user who only browsed the marketing pages or admin panel should not count as active. `history` rows represent prompt enhancements, which is the product usage signal we care about.

### C. Bulk endpoint — switch to `admin_change_tier`

`src/app/api/admin/users/bulk/route.ts`:
- Accept new action values `promote_admin` and `demote_admin`. Keep `grant_admin` and `revoke_admin` as aliases mapping to the same code paths (so existing integrations and the audit log continue to work).
- For `promote_admin` / `grant_admin`: per id, call `supabase.rpc("admin_change_tier", { target_user_id: id, new_tier: "admin" })`. Then `supabase.auth.admin.updateUserById(id, { app_metadata: { role: "admin", plan_tier: "admin" } })`. Then `supabase.auth.admin.signOut(id, "global")` (skip when id === adminUser.id).
- For `demote_admin` / `revoke_admin`: same but `new_tier: "free"`. Last-admin guard already at the top of the bulk handler stays as-is (defense-in-depth alongside RPC's internal guard).

`src/app/admin/users/page.tsx` `runBulk` accepts the new names but stays compatible with the old ones for one release.

### D. Tests

- `src/app/api/admin/analytics/__tests__/refresh-bypass.test.ts`
- `src/app/api/admin/costs/__tests__/refresh-bypass.test.ts`
- `src/app/api/admin/funnel/__tests__/refresh-bypass.test.ts`
- `src/app/api/admin/revenue/__tests__/refresh-bypass.test.ts`

All four follow the same shape as Spec 1's `dashboard` test: cached path returns cache; `?refresh=1` skips read and writes fresh.

- Update `src/app/api/admin/users/bulk/__tests__/route.test.ts` (create if missing) to verify `promote_admin` calls `admin_change_tier(id, 'admin')` and bumps app_metadata; same for `demote_admin → 'free'`. Old aliases produce the same calls.

## Migration Order

1. Deploy refresh bypass for 4 endpoints (zero-risk; aliases existing query string).
2. Deploy DAU/WAU/MAU source change. (User-visible numbers will drop slightly. This is correct, not a regression.)
3. Deploy bulk endpoint refactor + UI label update.

Each step is independently safe and reversible.

## Error Handling

- `?refresh=1` bypass: same pattern as Spec 1. Redis failures continue to log and proceed live.
- DAU/WAU/MAU source change: if `history` query fails, fall back to `0` for the affected metric (existing behavior). Activity feed unaffected.
- Bulk endpoint: per-id failures collected in `failed[]`; one batch audit log entry. Same as today.

## Open Questions

None.
