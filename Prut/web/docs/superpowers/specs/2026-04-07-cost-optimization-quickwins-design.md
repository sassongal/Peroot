# Cost Optimization — Quick Wins + Dashboard Closure

**Date:** 2026-04-07
**Status:** Approved design, ready for implementation plan
**Context:** Follow-up to global token-discipline work from `~/.claude/plans/tranquil-hugging-lagoon.md`

## Context

After baking token-saving rules into global CLAUDE.md, project CLAUDE.md, `.claudeignore`, and auto-memory, Gal asked what to focus on next. An audit of Peroot surfaced three distinct waste sources — two in Peroot itself, one in how Claude sessions work against the repo. This spec bundles them into a single focused workstream because they share tooling (Upstash Redis, `api_usage_logs`, the existing CostsTab dashboard) and ship well together.

### Audit findings

| Finding | Impact | Location |
|---|---|---|
| **No result cache on `/api/enhance`** | Every repeat prompt hits an LLM provider. Users iterate on tone/category/wording → many near-duplicate calls. Biggest single cost lever. | `src/app/api/enhance/route.ts` |
| **`trackApiUsage` wired only to `/api/enhance`** | 3 other LLM-calling routes are invisible in `CostsTab.tsx`. The dashboard shows a partial picture. | `src/app/api/chain/generate/route.ts`, `src/app/api/personal-library/suggest-category/route.ts`, `src/app/api/admin/test-engine/route.ts` |
| **5 stale git worktrees + untracked `tools/` dir** | Duplicated repo state on disk, potential scan bloat in Claude sessions, unclear provenance. | `.claude/worktrees/agent-*` (×4), `.worktrees/prompt-entity`, `.worktrees/peroot-upgrade`, `tools/crewai-ui-audit/` |
| **No guardrail against reading huge files** | `repomix-output.xml` (708KB / ~160K tokens) is blocked by `.claudeignore` but nothing prevents accidental Reads of other large files. | `.claude/settings.json` (missing) |

### What's already built

Observability foundation is mature — **don't rebuild it**:

- `api_usage_logs` table with `user_id`, `provider`, `model`, `input_tokens`, `output_tokens`, `estimated_cost_usd`, `endpoint`, `duration_ms` (`supabase/migrations/20260310_admin_cost_tracking.sql`)
- `trackApiUsage()` with pricing table and fire-and-forget semantics (`src/lib/admin/track-api-usage.ts`)
- `manual_costs` table + CSV export + 905-line dashboard (`src/components/admin/tabs/CostsTab.tsx`)

The work is closing the tracking gap and adding a cache layer — not building new dashboards.

## Goals

1. **Reduce `/api/enhance` AI provider cost** by 20–40% via a Redis result cache keyed on normalized input.
2. **Make the cost dashboard trustworthy** by tracking all four LLM-calling endpoints.
3. **Surface cache effectiveness** in the existing dashboard so future optimizations are data-driven.
4. **Clean up accumulated local clutter** (worktrees, untracked `tools/`) so Claude sessions stay lean.
5. **Prevent accidental mega-file reads** with a lightweight PreToolUse hook.

## Non-goals

- No changes to engine system prompts (deferred to a separate "deep engine audit" spec).
- No new dashboard pages. Only new cards/panels on existing `CostsTab.tsx`.
- No per-task `maxOutputTokens` budgets (deferred; needs baseline data first).
- No migration away from Upstash Redis.
- No changes to provider fallback chain or circuit breaker.

## Architecture

Three concurrent workstreams, each independently deployable:

### Workstream 1 — Peroot AI cost reduction

Redis result cache + close tracking gap + `cache_hit` column on `api_usage_logs`.

**Data flow (`/api/enhance` request):**
1. Normalize input → compute cache key `sha256(normalizedPrompt + mode + tone + category + targetModel + engineVersion)`
2. `enhance-cache.getCached(key)` → **hit**: return cached JSON, log usage with `cache_hit: true, input_tokens: 0, output_tokens: 0, cost: 0`
3. **miss**: run engine → stream LLM → in `onFinish`, store result in cache + call `trackApiUsage` with real counts and `cache_hit: false`
4. Cache store is fire-and-forget. Redis failures never break the request — fall through to LLM path.
5. Bypass header: `X-Peroot-Cache-Bypass: 1` (for pro users who explicitly want fresh output; future UI toggle).

**Cache key normalization:**
- Lowercase + trim whitespace on prompt
- Strip trailing punctuation
- `engineVersion` is a constant exported from `src/lib/ai/enhance-cache.ts` (e.g. `export const ENGINE_VERSION = 'v1-2026-04-07'`). Bumped manually when engine logic changes — invalidates all cache entries without a migration since the Redis key prefix changes.

**TTL:** 1 hour. Short enough to stay fresh, long enough to catch iterative refinement within a session.

**Skip cache when:**
- User explicitly passes bypass header
- Request is authenticated as admin in test-engine mode
- `ENHANCE_CACHE_ENABLED` env flag is false (rollout safety)

### Workstream 2 — Claude session hygiene

- **Worktree cleanup** — remove 4 stale `agent-*` worktrees, `prompt-entity` (plan marked complete in `db62885`), and `peroot-upgrade` (confirmed stale).
- **`tools/crewai-ui-audit/`** — add to `.gitignore` + `.claudeignore`. Not versioned, not scanned.
- **PreToolUse hook** — `.claude/settings.json` at project root blocks `Read` on `repomix-output.xml` and warns when target file exceeds 500KB.

### Workstream 3 — Dashboard closure

Additive changes to `CostsTab.tsx` and one new admin endpoint:

- **`CacheHitRateCard`** — shows hit rate %, requests cached, estimated tokens saved (computed from avg tokens/request for that endpoint over the date range).
- **`UntrackedEndpointsWarning`** — red banner if any known LLM endpoint has zero `api_usage_logs` rows in the selected range. Reads from a small new endpoint `/api/admin/costs/coverage`.
- Both panels live at the top of CostsTab, above existing content.

## Components

### New files

| File | Purpose | Approx size |
|---|---|---|
| `src/lib/ai/enhance-cache.ts` | `getCached`/`setCached` wrapping Upstash. Normalizes input, computes SHA-256 key, handles Redis errors silently. | ~80 lines |
| `supabase/migrations/20260407_cache_hit_column.sql` | `ALTER TABLE api_usage_logs ADD COLUMN cache_hit BOOLEAN DEFAULT false;` + index on `(endpoint, cache_hit, created_at)`. | ~15 lines |
| `src/app/api/admin/costs/coverage/route.ts` | Returns list of known LLM endpoints and last-seen timestamp per endpoint over last 24h. Admin-gated. | ~50 lines |
| `.claude/settings.json` | Project-level hooks. PreToolUse for `Read` with size/path checks. | ~30 lines |
| `src/lib/ai/__tests__/enhance-cache.test.ts` | Unit tests: hit, miss, Redis failure, key stability. | ~100 lines |

### Modified files

| File | Change |
|---|---|
| `src/app/api/enhance/route.ts` | Add cache check before engine call; on miss, store on `onFinish`; pass `cacheHit` to `trackApiUsage`. |
| `src/lib/admin/track-api-usage.ts` | Add `cacheHit?: boolean` to `ApiUsageData` interface; write to new column. |
| `src/app/api/chain/generate/route.ts` | Add `trackApiUsage({ endpoint: 'chain', ... })` call after completion. |
| `src/app/api/personal-library/suggest-category/route.ts` | Add `trackApiUsage({ endpoint: 'suggest-category', ... })` call. |
| `src/app/api/admin/test-engine/route.ts` | Add `trackApiUsage({ endpoint: 'test-engine', ... })` call. |
| `src/components/admin/tabs/CostsTab.tsx` | Add `CacheHitRateCard` and `UntrackedEndpointsWarning` components at top of tab. |
| `src/app/api/enhance/__tests__/route.test.ts` | Add cache-hit and cache-miss path tests. |
| `.claudeignore` | Add `tools/crewai-ui-audit/`. |
| `.gitignore` | Add `tools/crewai-ui-audit/`. |

### Git operations (not files)

- `git worktree remove .claude/worktrees/agent-a46ed8a8`
- `git worktree remove .claude/worktrees/agent-a8ef663c`
- `git worktree remove .claude/worktrees/agent-ae5c7c08`
- `git worktree remove .claude/worktrees/agent-af530c42`
- `git worktree remove .worktrees/prompt-entity`
- `git worktree remove .worktrees/peroot-upgrade`

## Data model

**New column on `api_usage_logs`:**
```sql
ALTER TABLE public.api_usage_logs
  ADD COLUMN cache_hit BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint_cachehit
  ON public.api_usage_logs(endpoint, cache_hit, created_at DESC);
```

**Redis cache entries:**
- Key: `peroot:enhance:v1:<sha256>`
- Value: JSON-serialized engine output (the exact shape `/api/enhance` streams back)
- TTL: 3600 seconds
- Namespace prefix lets us bump `v1 → v2` for a clean invalidation without migration.

## Error handling

- **Redis down** — cache functions return `null` and swallow the error via `logger.warn`. LLM path runs as normal.
- **`trackApiUsage` failure** — already fire-and-forget; preserved.
- **Column-missing on old DB** — migration uses `ADD COLUMN IF NOT EXISTS` semantics; existing code paths don't read `cache_hit`, so missing column doesn't break reads.
- **Hook blocks legitimate read** — user sees explicit message and can override with explicit approval in Claude's permission flow. Never silent.
- **`trackApiUsage` on previously-untracked endpoints** — wrap in try/catch with `logger.warn` to avoid regressing those routes if tracking misbehaves.

## Testing

### Automated

1. **`enhance-cache.test.ts`** — mock Upstash client: hit returns value, miss returns null, error returns null and logs warn.
2. **`enhance-cache.test.ts`** — key stability: same normalized inputs produce same key; different model/category/mode produce different keys.
3. **`route.test.ts` (enhance)** — extend existing tests to cover cache-hit path (trackApiUsage called with `cacheHit: true, input_tokens: 0`) and cache-miss path (real counts recorded, cache set on `onFinish`).
4. **Coverage tests** — each of the three newly-tracked routes has a test asserting `trackApiUsage` is called on success.
5. **`npm run test` + `npm run typecheck` + `npm run lint` must all pass.**

### Manual verification

1. Start dev server (`npm run dev`)
2. Hit `/api/enhance` twice with identical input. Second call should complete in <50ms and log `cache_hit: true` in `api_usage_logs`.
3. Query: `SELECT endpoint, COUNT(*), SUM(cache_hit::int) FROM api_usage_logs WHERE created_at > now() - interval '1 hour' GROUP BY endpoint;`
4. Open admin CostsTab → verify `CacheHitRateCard` renders and shows >0% after step 2.
5. Temporarily disconnect Redis → hit `/api/enhance` → verify request still succeeds and logs `cache_hit: false`.
6. Try to `Read repomix-output.xml` in a fresh Claude session → hook should block.

## Rollout

1. **Migration first** (zero risk, additive): `supabase db push` or via Supabase MCP.
2. **Dashboard updates + tracking gap closure** — ship behind normal PR; users/admin see more accurate numbers immediately.
3. **Cache layer behind env flag** — deploy with `ENHANCE_CACHE_ENABLED=false` in prod. Watch dashboard for 24h.
4. **Flip flag to true** — monitor hit rate and error rate. Rollback = flip flag back.
5. **Worktree cleanup + `.gitignore` + hook** — separate small PR, no production impact.

## Expected impact

| Change | Savings estimate | Confidence |
|---|---|---|
| Redis result cache on `/api/enhance` | 20–40% AI cost reduction on primary endpoint | Medium — depends on user iteration patterns; will be measurable after rollout |
| Close tracking gap on 3 routes | 0% direct savings; unlocks future decisions worth much more | High |
| Cache hit rate card in dashboard | 0% direct; enables monitoring | High |
| Worktree cleanup + hook | Reduces Claude session waste; small but compounds | Medium |

## Open questions (none blocking)

- **Future work:** The image/video engines are 807/633 lines — likely have massive static prompt content that would benefit hugely from provider-side prompt caching. That's the "deep engine audit" spec — recommended as the next step after this one lands and gives us baseline numbers.
- **Future work:** Per-task `maxOutputTokens` budgets — the gateway supports it but current callers may not set it. Worth a sweep after we have real data.

## References

- Audit source: https://github.com/Sagargupta16/claude-cost-optimizer
- Prior plan: `~/.claude/plans/tranquil-hugging-lagoon.md`
- Existing cost infra: `src/lib/admin/track-api-usage.ts`, `supabase/migrations/20260310_admin_cost_tracking.sql`, `src/components/admin/tabs/CostsTab.tsx`
