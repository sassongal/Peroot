# PromptEntity: Consistent Dates + Before/After Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a unified `PromptEntity` contract across every surface of Peroot that creates, displays, or persists a prompt — and ship two cross-product primitives (`DateBadge`, `BeforeAfterSplit` with `ScoreDelta`) that prove product value within 10 seconds and surface consistent created/updated/last-used timestamps everywhere.

**Architecture:**
- **Layer 1 — Data:** add `updated_at` + `last_used_at` to every prompt-bearing table that lacks them, install a global `set_updated_at()` trigger, and a `bump_prompt_last_used()` RPC with a whitelist (security boundary).
- **Layer 2 — Contract:** a single `PromptEntity` TypeScript interface plus per-table adapters (`fromHistoryRow`, `fromPersonalLibraryRow`, etc.). All UI surfaces consume `PromptEntity`, never raw rows.
- **Layer 3 — UI primitives:** `DateBadge` (tri-state created/updated/last_used in `he-IL`), `BeforeAfterSplit` (tabs/split modes with optional `ScoreDelta` pill). Reuses existing `Intl.DateTimeFormat('he-IL', ...)` pattern from `AdminAuditTab.tsx:79-87`.
- **Layer 4 — Wiring:** rewire 5 core surfaces (ResultSection, HistoryPanel, SharedPromptPage, PersonalLibraryPromptCard, SystemPromptsTab) to consume the contract + render the primitives. Defer remaining 11 surfaces to a follow-up plan.

**Visual hierarchy (mandatory across every comparison surface):**
The "after" / result is the visual hero. The "before" / original is present but **always subdued**. This rule applies to `BeforeAfterSplit`, `ScoreDelta`, and any future before/after UI in Peroot.
- Tabs mode: "אחרי" tab is brand-tinted and active by default; "לפני" tab is muted text-only, no background, smaller font weight.
- Split mode: the "after" pane gets a brand-tinted background, full opacity, prominent border. The "before" pane is opacity-60, no border accent, dimmed text.
- ScoreDelta pill: "after" number is `text-2xl font-bold`; "before" number is `text-xs opacity-50`; arrow `→` is opacity-40.
- The improvements list lives next to the "after", never centered between the two.

Out of scope (deferred): Export menu (#3), Admin Sync/Reconciliation/Audit (#4), public-library card wiring, ChainPreview, Teachers hub.

**Tech Stack:** Next.js 16 App Router · TypeScript 5 · Supabase PostgreSQL · React 19 · Tailwind CSS 4 · Vitest 4 · Playwright 1.58 · Framer Motion (already in deps).

---

## File Structure

**Created:**
- `src/lib/prompt-entity/types.ts` — `PromptEntity` interface, `PromptSource` enum, score shape.
- `src/lib/prompt-entity/adapters.ts` — Pure adapters: `fromHistoryRow`, `fromSharedPromptRow`, `fromPersonalLibraryRow`, `fromAiPromptRow`, `fromPublicLibraryRow`.
- `src/lib/prompt-entity/__tests__/adapters.test.ts` — Adapter unit tests.
- `src/lib/prompt-entity/index.ts` — Public re-exports.
- `src/lib/dates/format.ts` — Hoisted `Intl.DateTimeFormat` + `formatRelativeHe`, `formatAbsoluteHe`, `formatTriState`.
- `src/lib/dates/__tests__/format.test.ts` — Date utility unit tests.
- `src/components/ui/DateBadge.tsx` — Tri-state date chip.
- `src/components/ui/__tests__/DateBadge.test.tsx` — RTL render tests.
- `src/components/ui/BeforeAfterSplit.tsx` — Before/after viewer with mode prop (`tabs` | `split` | `diff`).
- `src/components/ui/__tests__/BeforeAfterSplit.test.tsx` — Render + interaction tests.
- `src/components/ui/ScoreDelta.tsx` — Animated score-delta pill (count-up via Framer Motion).
- `src/components/ui/__tests__/ScoreDelta.test.tsx` — Render test.
- `supabase/migrations/20260407_prompt_entity_timestamps.sql` — Schema migration: columns + global trigger + RPC.
- `tests/e2e/prompt-entity-flow.spec.ts` — Playwright e2e: enhance → see DateBadge "now" + BeforeAfterSplit + score → save → see updated_at bump.

**Modified:**
- `src/app/api/enhance/route.ts:258-272` — Insert with explicit `updated_at: new Date().toISOString()` (column will exist after migration).
- `src/app/api/share/route.ts:36-46` — Insert with explicit `updated_at`. Confirm the existing `increment_shared_prompt_views` RPC stub gets created in the migration.
- `src/hooks/useLibrary.ts:680-704` — On insert, set `updated_at` explicitly (the row already gets `last_used_at` later via `incrementUseCount` at line 797 — leave that path alone).
- `src/components/features/prompt-improver/ResultSection.tsx:168-260` — Replace inline before/after tabs with `<BeforeAfterSplit>`. Add `<DateBadge>` + `<ScoreDelta>` to header.
- `src/components/features/history/HistoryPanel.tsx:1-40` — Delete inline `formatTimeAgo`, import from `@/lib/dates/format`. Use `<DateBadge mode="compact">` for each item.
- `src/components/features/history/HistoryPanel.tsx` (row render) — Pass `PromptEntity` instead of raw `HistoryItem` props.
- `src/hooks/useHistory.ts:60-90` — Map row through `fromHistoryRow` adapter; expose `entity` field on each item.
- `src/app/p/[id]/page.tsx:99-140` — Replace inline before/after div pair with `<BeforeAfterSplit>`. Add `<DateBadge>` next to "צפיות" badge.
- `src/components/views/personal-library/PersonalLibraryPromptCard.tsx` — Add `<DateBadge mode="compact">` near title.
- `src/components/admin/tabs/SystemPromptsTab.tsx` — Add `<DateBadge>` per row using existing `created_at`/`updated_at`.
- `src/i18n/he.json` — New keys under `prompt.dates.*` and `prompt.beforeAfter.*`.
- `src/i18n/en.json` — English translations of above keys.

---

## Task 1: Schema Migration — Timestamps + Global Trigger + RPC

**Files:**
- Create: `supabase/migrations/20260407_prompt_entity_timestamps.sql`

This is the only DB-touching task. Everything downstream depends on it.

- [x] **Step 1: Write the migration**

Create `supabase/migrations/20260407_prompt_entity_timestamps.sql`:

```sql
-- 20260407_prompt_entity_timestamps.sql
-- PromptEntity rollout: ensure created_at/updated_at/last_used_at exist on every
-- prompt-bearing table, install a reusable updated_at trigger, and expose a
-- whitelisted bump_prompt_last_used() RPC. Also defines the missing
-- increment_shared_prompt_views() RPC that app/p/[id]/page.tsx already calls.

-- ── 1. Global helper: set_updated_at() ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- ── 2. history table ─────────────────────────────────────────────────────────
ALTER TABLE public.history
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

DROP TRIGGER IF EXISTS history_set_updated_at ON public.history;
CREATE TRIGGER history_set_updated_at
  BEFORE UPDATE ON public.history
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_history_user_last_used
  ON public.history (user_id, last_used_at DESC NULLS LAST);

-- ── 3. shared_prompts table ──────────────────────────────────────────────────
ALTER TABLE public.shared_prompts
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

DROP TRIGGER IF EXISTS shared_prompts_set_updated_at ON public.shared_prompts;
CREATE TRIGGER shared_prompts_set_updated_at
  BEFORE UPDATE ON public.shared_prompts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 4. public_library_prompts table ──────────────────────────────────────────
ALTER TABLE public.public_library_prompts
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

DROP TRIGGER IF EXISTS public_library_prompts_set_updated_at ON public.public_library_prompts;
CREATE TRIGGER public_library_prompts_set_updated_at
  BEFORE UPDATE ON public.public_library_prompts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 5. ai_prompts table ──────────────────────────────────────────────────────
ALTER TABLE public.ai_prompts
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- ── 6. personal_library: ensure trigger (columns already exist) ──────────────
DROP TRIGGER IF EXISTS personal_library_set_updated_at ON public.personal_library;
CREATE TRIGGER personal_library_set_updated_at
  BEFORE UPDATE ON public.personal_library
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 7. Extend existing increment_shared_prompt_views to also bump last_used_at
-- IMPORTANT: this function already exists in production as a SQL function.
-- We re-create it with the SAME signature and SAME body, plus one extra
-- assignment for last_used_at. We preserve LANGUAGE sql, SECURITY DEFINER,
-- search_path, and the COALESCE semantics to avoid surprising callers.
CREATE OR REPLACE FUNCTION public.increment_shared_prompt_views(prompt_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE shared_prompts
  SET views = COALESCE(views, 0) + 1,
      last_used_at = NOW()
  WHERE id = prompt_id;
$$;

-- Re-grant in case the existing definition lost grants on replacement.
GRANT EXECUTE ON FUNCTION public.increment_shared_prompt_views(UUID) TO anon, authenticated;

-- ── 8. RPC: bump_prompt_last_used with table whitelist ───────────────────────
CREATE OR REPLACE FUNCTION public.bump_prompt_last_used(
  p_table TEXT,
  p_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Whitelist: only these tables may be bumped via this RPC
  IF p_table NOT IN ('history', 'shared_prompts', 'public_library_prompts', 'personal_library', 'ai_prompts') THEN
    RAISE EXCEPTION 'bump_prompt_last_used: table % not allowed', p_table;
  END IF;

  EXECUTE format('UPDATE public.%I SET last_used_at = NOW() WHERE id = $1', p_table)
  USING p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bump_prompt_last_used(TEXT, UUID) TO authenticated;
```

- [x] **Step 2: Apply the migration locally (NON-DESTRUCTIVE)**

Run:
```bash
npx supabase migration up
```
Expected: only the new `20260407_prompt_entity_timestamps.sql` runs, against the existing local DB. **Do NOT run `supabase db reset`** — that would wipe local data. `migration up` is incremental and preserves all existing rows.

If `migration up` reports "no new migrations to apply", verify the file landed in `supabase/migrations/` and the filename starts with a timestamp lexicographically newer than the last applied one (check via `npx supabase migration list`).

- [x] **Step 3: Verify columns exist via psql**

Run:
```bash
npx supabase db execute "SELECT column_name FROM information_schema.columns WHERE table_name='history' AND column_name IN ('created_at','updated_at','last_used_at');"
```
Expected: 3 rows returned (`created_at`, `updated_at`, `last_used_at`).

Repeat for `shared_prompts`, `public_library_prompts`, `ai_prompts`, `personal_library`.

- [x] **Step 4: Verify RPCs exist**

Run:
```bash
npx supabase db execute "SELECT proname FROM pg_proc WHERE proname IN ('bump_prompt_last_used','increment_shared_prompt_views','set_updated_at');"
```
Expected: 3 rows returned.

- [x] **Step 5: Smoke-test bump_prompt_last_used whitelist**

Run:
```bash
npx supabase db execute "SELECT public.bump_prompt_last_used('users', '00000000-0000-0000-0000-000000000000'::uuid);"
```
Expected: ERROR `bump_prompt_last_used: table users not allowed`.

- [x] **Step 6: Commit**

```bash
git add supabase/migrations/20260407_prompt_entity_timestamps.sql
git commit -m "feat(db): add updated_at/last_used_at + bump_prompt_last_used RPC"
```

---

## Task 2: PromptEntity Type Contract

**Files:**
- Create: `src/lib/prompt-entity/types.ts`
- Create: `src/lib/prompt-entity/index.ts`
- Test: (none yet — pure types)

- [x] **Step 1: Create the types file**

Create `src/lib/prompt-entity/types.ts`:

```typescript
/**
 * PromptEntity — unified contract for any prompt-shaped record across Peroot.
 * Every UI surface that displays a prompt should consume this interface,
 * never raw Supabase rows. Adapters in ./adapters.ts convert table rows.
 */

export type PromptSource =
  | 'web'
  | 'extension'
  | 'api'
  | 'cron'
  | 'admin'
  | 'shared'
  | 'unknown';

export type PromptVisibility = 'private' | 'shared' | 'public';

/**
 * Optional score snapshot for a prompt. ScoreDelta uses `before`/`after`
 * to render the value-proof pill. `improvements` is an optional bullet list.
 */
export interface PromptScoreSnapshot {
  before: number | null;
  after: number;
  improvements?: string[];
}

export interface PromptEntity {
  /** Stable UUID across the source table. */
  id: string;
  /** Best human-readable label, e.g. "Marketing copy for X". May be empty. */
  title: string;
  /** Original user input before enhancement. May be empty for system prompts. */
  original: string;
  /** Enhanced/final prompt text. Required. */
  enhanced: string;
  /** Source table key — used by `bump_prompt_last_used` RPC whitelist. */
  table: 'history' | 'shared_prompts' | 'personal_library' | 'public_library_prompts' | 'ai_prompts';
  /** ISO timestamp when the row was created. Always present. */
  createdAt: string;
  /** ISO timestamp when the row was last mutated. May equal createdAt. */
  updatedAt: string;
  /** ISO timestamp when the row was last accessed/used. Null if never. */
  lastUsedAt: string | null;
  /** How the prompt entered the system. */
  source: PromptSource;
  /** Capability mode (STANDARD, DEEP_RESEARCH, IMAGE_GENERATION, ...). */
  mode: string;
  category: string;
  tone: string | null;
  /** Variable placeholders this prompt expects. */
  variables: string[];
  visibility: PromptVisibility;
  /** Optional score data for BeforeAfterSplit / ScoreDelta. */
  score?: PromptScoreSnapshot;
}
```

- [x] **Step 2: Create the barrel file**

Create `src/lib/prompt-entity/index.ts`:

```typescript
export type {
  PromptEntity,
  PromptScoreSnapshot,
  PromptSource,
  PromptVisibility,
} from './types';

export {
  fromHistoryRow,
  fromSharedPromptRow,
  fromPersonalLibraryRow,
  fromAiPromptRow,
  fromPublicLibraryRow,
} from './adapters';
```

- [x] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (no errors). The barrel file references `./adapters` which we'll create in Task 3 — typecheck will fail until then. **Skip this step until Task 3 is complete**, or temporarily comment out the `export { ... } from './adapters'` line and uncomment after Task 3.

- [x] **Step 4: Commit**

```bash
git add src/lib/prompt-entity/types.ts src/lib/prompt-entity/index.ts
git commit -m "feat: add PromptEntity contract types"
```

---

## Task 3: PromptEntity Adapters (TDD)

**Files:**
- Create: `src/lib/prompt-entity/adapters.ts`
- Test: `src/lib/prompt-entity/__tests__/adapters.test.ts`

- [x] **Step 1: Write the failing tests**

Create `src/lib/prompt-entity/__tests__/adapters.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  fromHistoryRow,
  fromSharedPromptRow,
  fromPersonalLibraryRow,
  fromAiPromptRow,
  fromPublicLibraryRow,
} from '../adapters';

describe('PromptEntity adapters', () => {
  it('fromHistoryRow maps every required field', () => {
    const row = {
      id: '11111111-1111-1111-1111-111111111111',
      user_id: 'user-1',
      prompt: 'original text',
      enhanced_prompt: 'enhanced text',
      tone: 'formal',
      category: 'Marketing',
      title: 'My prompt',
      source: 'web',
      capability_mode: 'STANDARD',
      created_at: '2026-04-07T10:00:00.000Z',
      updated_at: '2026-04-07T10:05:00.000Z',
      last_used_at: '2026-04-07T11:00:00.000Z',
    };
    const entity = fromHistoryRow(row);
    expect(entity.id).toBe(row.id);
    expect(entity.title).toBe('My prompt');
    expect(entity.original).toBe('original text');
    expect(entity.enhanced).toBe('enhanced text');
    expect(entity.table).toBe('history');
    expect(entity.createdAt).toBe(row.created_at);
    expect(entity.updatedAt).toBe(row.updated_at);
    expect(entity.lastUsedAt).toBe(row.last_used_at);
    expect(entity.source).toBe('web');
    expect(entity.mode).toBe('STANDARD');
    expect(entity.category).toBe('Marketing');
    expect(entity.tone).toBe('formal');
    expect(entity.visibility).toBe('private');
  });

  it('fromHistoryRow tolerates missing optional fields', () => {
    const row = {
      id: '11111111-1111-1111-1111-111111111111',
      prompt: 'x',
      enhanced_prompt: 'y',
      created_at: '2026-04-07T10:00:00.000Z',
      updated_at: '2026-04-07T10:00:00.000Z',
    };
    const entity = fromHistoryRow(row);
    expect(entity.title).toBe('');
    expect(entity.tone).toBeNull();
    expect(entity.lastUsedAt).toBeNull();
    expect(entity.source).toBe('unknown');
    expect(entity.mode).toBe('STANDARD');
  });

  it('fromSharedPromptRow marks visibility as shared', () => {
    const row = {
      id: '22222222-2222-2222-2222-222222222222',
      prompt: 'final',
      original_input: 'orig',
      category: 'Sales',
      capability_mode: 'STANDARD',
      created_at: '2026-04-07T10:00:00.000Z',
      updated_at: '2026-04-07T10:00:00.000Z',
      last_used_at: null,
    };
    const entity = fromSharedPromptRow(row);
    expect(entity.table).toBe('shared_prompts');
    expect(entity.visibility).toBe('shared');
    expect(entity.original).toBe('orig');
    expect(entity.enhanced).toBe('final');
  });

  it('fromPersonalLibraryRow uses prompt as enhanced and empty as original', () => {
    const row = {
      id: '33333333-3333-3333-3333-333333333333',
      title: 'Saved',
      prompt: 'p',
      category: 'General',
      capability_mode: 'STANDARD',
      created_at: '2026-04-07T10:00:00.000Z',
      updated_at: '2026-04-07T10:00:00.000Z',
      last_used_at: '2026-04-07T11:00:00.000Z',
    };
    const entity = fromPersonalLibraryRow(row);
    expect(entity.table).toBe('personal_library');
    expect(entity.enhanced).toBe('p');
    expect(entity.original).toBe('');
    expect(entity.lastUsedAt).toBe(row.last_used_at);
  });

  it('fromPublicLibraryRow returns visibility public', () => {
    const row = {
      id: '44444444-4444-4444-4444-444444444444',
      title: 'Pub',
      prompt: 'p',
      category_id: 'cat',
      capability_mode: 'STANDARD',
      variables: ['x', 'y'],
      created_at: '2026-04-07T10:00:00.000Z',
      updated_at: '2026-04-07T10:00:00.000Z',
      last_used_at: null,
    };
    const entity = fromPublicLibraryRow(row);
    expect(entity.table).toBe('public_library_prompts');
    expect(entity.visibility).toBe('public');
    expect(entity.variables).toEqual(['x', 'y']);
  });

  it('fromAiPromptRow sets source admin', () => {
    const row = {
      id: '55555555-5555-5555-5555-555555555555',
      prompt_key: 'enhance.system.he',
      prompt: 'You are...',
      created_at: '2026-04-07T10:00:00.000Z',
      updated_at: '2026-04-07T10:00:00.000Z',
      last_used_at: null,
    };
    const entity = fromAiPromptRow(row);
    expect(entity.table).toBe('ai_prompts');
    expect(entity.source).toBe('admin');
    expect(entity.title).toBe('enhance.system.he');
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/prompt-entity/__tests__/adapters.test.ts`
Expected: FAIL — `Cannot find module '../adapters'`.

- [x] **Step 3: Implement the adapters**

Create `src/lib/prompt-entity/adapters.ts`:

```typescript
import type { PromptEntity, PromptSource } from './types';

type Row = Record<string, unknown>;

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function strOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function asSource(v: unknown): PromptSource {
  const allowed: PromptSource[] = ['web', 'extension', 'api', 'cron', 'admin', 'shared', 'unknown'];
  return (allowed as readonly string[]).includes(v as string) ? (v as PromptSource) : 'unknown';
}

export function fromHistoryRow(row: Row): PromptEntity {
  return {
    id: str(row.id),
    title: str(row.title),
    original: str(row.prompt),
    enhanced: str(row.enhanced_prompt),
    table: 'history',
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at, str(row.created_at)),
    lastUsedAt: strOrNull(row.last_used_at),
    source: asSource(row.source),
    mode: str(row.capability_mode, 'STANDARD'),
    category: str(row.category),
    tone: strOrNull(row.tone),
    variables: arr(row.variables),
    visibility: 'private',
  };
}

export function fromSharedPromptRow(row: Row): PromptEntity {
  return {
    id: str(row.id),
    title: str(row.title),
    original: str(row.original_input),
    enhanced: str(row.prompt),
    table: 'shared_prompts',
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at, str(row.created_at)),
    lastUsedAt: strOrNull(row.last_used_at),
    source: 'shared',
    mode: str(row.capability_mode, 'STANDARD'),
    category: str(row.category),
    tone: null,
    variables: [],
    visibility: 'shared',
  };
}

export function fromPersonalLibraryRow(row: Row): PromptEntity {
  return {
    id: str(row.id),
    title: str(row.title),
    original: '',
    enhanced: str(row.prompt),
    table: 'personal_library',
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at, str(row.created_at)),
    lastUsedAt: strOrNull(row.last_used_at),
    source: asSource(row.source),
    mode: str(row.capability_mode, 'STANDARD'),
    category: str(row.category),
    tone: null,
    variables: arr(row.template_variables ?? row.variables),
    visibility: 'private',
  };
}

export function fromPublicLibraryRow(row: Row): PromptEntity {
  return {
    id: str(row.id),
    title: str(row.title),
    original: '',
    enhanced: str(row.prompt),
    table: 'public_library_prompts',
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at, str(row.created_at)),
    lastUsedAt: strOrNull(row.last_used_at),
    source: 'admin',
    mode: str(row.capability_mode, 'STANDARD'),
    category: str(row.category_id ?? row.category),
    tone: null,
    variables: arr(row.variables),
    visibility: 'public',
  };
}

export function fromAiPromptRow(row: Row): PromptEntity {
  return {
    id: str(row.id),
    title: str(row.prompt_key),
    original: '',
    enhanced: str(row.prompt),
    table: 'ai_prompts',
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at, str(row.created_at)),
    lastUsedAt: strOrNull(row.last_used_at),
    source: 'admin',
    mode: 'STANDARD',
    category: 'system',
    tone: null,
    variables: [],
    visibility: 'private',
  };
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/prompt-entity/__tests__/adapters.test.ts`
Expected: PASS — 6 tests.

- [x] **Step 5: Run full typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add src/lib/prompt-entity/adapters.ts src/lib/prompt-entity/__tests__/adapters.test.ts
git commit -m "feat: PromptEntity adapters for all prompt tables"
```

---

## Task 4: Date Formatting Utilities (TDD)

**Files:**
- Create: `src/lib/dates/format.ts`
- Test: `src/lib/dates/__tests__/format.test.ts`

This task extracts the existing `formatTimeAgo` from `HistoryPanel.tsx:9-31` and the hoisted `Intl.DateTimeFormat` pattern from `AdminAuditTab.tsx:79-87` into a shared module.

- [x] **Step 1: Write the failing tests**

Create `src/lib/dates/__tests__/format.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatRelativeHe, formatAbsoluteHe, formatTriState } from '../format';

describe('formatRelativeHe', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-07T12:00:00.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('returns "לפני כמה שניות" for <60s', () => {
    expect(formatRelativeHe('2026-04-07T11:59:30.000Z')).toBe('לפני כמה שניות');
  });
  it('returns "לפני דקה" for ~1 minute', () => {
    expect(formatRelativeHe('2026-04-07T11:59:00.000Z')).toBe('לפני דקה');
  });
  it('returns "לפני N דקות" for 2-59 minutes', () => {
    expect(formatRelativeHe('2026-04-07T11:55:00.000Z')).toBe('לפני 5 דקות');
  });
  it('returns "לפני שעה" for 1 hour', () => {
    expect(formatRelativeHe('2026-04-07T11:00:00.000Z')).toBe('לפני שעה');
  });
  it('returns "לפני N ימים" for >1 day', () => {
    expect(formatRelativeHe('2026-04-04T12:00:00.000Z')).toBe('לפני 3 ימים');
  });
  it('handles null gracefully', () => {
    expect(formatRelativeHe(null)).toBe('');
  });
});

describe('formatAbsoluteHe', () => {
  it('formats ISO to Hebrew DD/MM/YY HH:MM', () => {
    const out = formatAbsoluteHe('2026-04-07T10:30:00.000Z');
    // Just assert it contains digits + a delimiter; locale formatters
    // vary slightly across Node versions
    expect(out).toMatch(/\d{2}/);
    expect(out.length).toBeGreaterThan(0);
  });
  it('handles null gracefully', () => {
    expect(formatAbsoluteHe(null)).toBe('');
  });
});

describe('formatTriState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-07T12:00:00.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('returns 3 segments when all timestamps differ', () => {
    const out = formatTriState({
      createdAt: '2026-04-01T10:00:00.000Z',
      updatedAt: '2026-04-05T10:00:00.000Z',
      lastUsedAt: '2026-04-07T11:00:00.000Z',
    });
    expect(out.created).toContain('לפני');
    expect(out.updated).toContain('לפני');
    expect(out.lastUsed).toContain('לפני');
  });

  it('omits updated segment when equal to created', () => {
    const out = formatTriState({
      createdAt: '2026-04-07T10:00:00.000Z',
      updatedAt: '2026-04-07T10:00:00.000Z',
      lastUsedAt: null,
    });
    expect(out.updated).toBeNull();
    expect(out.lastUsed).toBeNull();
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/dates/__tests__/format.test.ts`
Expected: FAIL — module not found.

- [x] **Step 3: Implement the formatter module**

Create `src/lib/dates/format.ts`:

```typescript
/**
 * Hebrew-first date formatting utilities for prompt surfaces.
 * Hoists Intl.DateTimeFormat instances at module load (one allocation),
 * exposes a relative formatter, an absolute formatter, and a tri-state
 * helper used by DateBadge.
 */

const ABSOLUTE_FORMATTER = new Intl.DateTimeFormat('he-IL', {
  year: '2-digit',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatAbsoluteHe(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return ABSOLUTE_FORMATTER.format(d);
}

export function formatRelativeHe(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const seconds = Math.round((Date.now() - d.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  const weeks = Math.round(days / 7);
  const months = Math.round(days / 30);
  const years = Math.round(days / 365);

  if (seconds < 60) return 'לפני כמה שניות';
  if (minutes === 1) return 'לפני דקה';
  if (minutes < 60) return `לפני ${minutes} דקות`;
  if (hours === 1) return 'לפני שעה';
  if (hours < 24) return `לפני ${hours} שעות`;
  if (days === 1) return 'לפני יום';
  if (days < 7) return `לפני ${days} ימים`;
  if (weeks === 1) return 'לפני שבוע';
  if (weeks < 4) return `לפני ${weeks} שבועות`;
  if (months === 1) return 'לפני חודש';
  if (months < 12) return `לפני ${months} חודשים`;
  if (years === 1) return 'לפני שנה';
  return `לפני ${years} שנים`;
}

export interface TriStateInput {
  createdAt: string | null | undefined;
  updatedAt: string | null | undefined;
  lastUsedAt: string | null | undefined;
}

export interface TriStateOutput {
  created: string;
  updated: string | null;
  lastUsed: string | null;
}

/**
 * Returns relative-formatted strings for the three timestamps. `updated` is
 * suppressed when it equals `created` (no real edit ever happened); `lastUsed`
 * is suppressed when null.
 */
export function formatTriState(input: TriStateInput): TriStateOutput {
  const created = formatRelativeHe(input.createdAt);
  const updatedRaw = formatRelativeHe(input.updatedAt);
  const lastUsedRaw = formatRelativeHe(input.lastUsedAt);
  const updated = input.updatedAt && input.updatedAt !== input.createdAt ? updatedRaw : null;
  const lastUsed = input.lastUsedAt ? lastUsedRaw : null;
  return { created, updated, lastUsed };
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/dates/__tests__/format.test.ts`
Expected: PASS — all tests.

- [x] **Step 5: Commit**

```bash
git add src/lib/dates/format.ts src/lib/dates/__tests__/format.test.ts
git commit -m "feat: shared he-IL date formatting utilities"
```

---

## Task 5: DateBadge Component (TDD)

**Files:**
- Create: `src/components/ui/DateBadge.tsx`
- Test: `src/components/ui/__tests__/DateBadge.test.tsx`

- [x] **Step 1: Write the failing tests**

Create `src/components/ui/__tests__/DateBadge.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DateBadge } from '../DateBadge';
import type { PromptEntity } from '@/lib/prompt-entity';

const baseEntity: PromptEntity = {
  id: 'a',
  title: 't',
  original: '',
  enhanced: 'e',
  table: 'history',
  createdAt: '2026-04-07T10:00:00.000Z',
  updatedAt: '2026-04-07T10:00:00.000Z',
  lastUsedAt: null,
  source: 'web',
  mode: 'STANDARD',
  category: '',
  tone: null,
  variables: [],
  visibility: 'private',
};

describe('DateBadge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-07T12:00:00.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('renders the created relative time in default mode', () => {
    render(<DateBadge entity={baseEntity} />);
    expect(screen.getByText(/לפני/)).toBeInTheDocument();
  });

  it('inline mode renders three chips when timestamps differ', () => {
    render(
      <DateBadge
        mode="inline"
        entity={{
          ...baseEntity,
          updatedAt: '2026-04-07T11:00:00.000Z',
          lastUsedAt: '2026-04-07T11:30:00.000Z',
        }}
      />
    );
    expect(screen.getByTestId('date-badge-created')).toBeInTheDocument();
    expect(screen.getByTestId('date-badge-updated')).toBeInTheDocument();
    expect(screen.getByTestId('date-badge-last-used')).toBeInTheDocument();
  });

  it('inline mode hides updated chip when equal to created', () => {
    render(
      <DateBadge
        mode="inline"
        entity={{ ...baseEntity, lastUsedAt: '2026-04-07T11:30:00.000Z' }}
      />
    );
    expect(screen.getByTestId('date-badge-created')).toBeInTheDocument();
    expect(screen.queryByTestId('date-badge-updated')).not.toBeInTheDocument();
    expect(screen.getByTestId('date-badge-last-used')).toBeInTheDocument();
  });

  it('compact mode renders a single chip with title attribute', () => {
    render(<DateBadge mode="compact" entity={baseEntity} />);
    const chip = screen.getByTestId('date-badge-compact');
    expect(chip).toBeInTheDocument();
    expect(chip.getAttribute('title')).toMatch(/\d/);
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/ui/__tests__/DateBadge.test.tsx`
Expected: FAIL — module not found.

- [x] **Step 3: Implement the component**

Create `src/components/ui/DateBadge.tsx`:

```tsx
"use client";

import { Clock, Plus, Pencil } from 'lucide-react';
import type { PromptEntity } from '@/lib/prompt-entity';
import { formatTriState, formatAbsoluteHe } from '@/lib/dates/format';
import { cn } from '@/lib/utils';

type DateBadgeMode = 'compact' | 'inline' | 'verbose';

interface DateBadgeProps {
  entity: Pick<PromptEntity, 'createdAt' | 'updatedAt' | 'lastUsedAt'>;
  mode?: DateBadgeMode;
  className?: string;
}

const CHIP_BASE =
  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] text-[var(--text-muted)] bg-[var(--glass-bg)] border border-[var(--glass-border)]';

export function DateBadge({ entity, mode = 'inline', className }: DateBadgeProps) {
  const tri = formatTriState(entity);

  if (mode === 'compact') {
    const tooltipParts = [
      `נוצר: ${formatAbsoluteHe(entity.createdAt)}`,
      tri.updated ? `עודכן: ${formatAbsoluteHe(entity.updatedAt)}` : null,
      tri.lastUsed ? `בשימוש: ${formatAbsoluteHe(entity.lastUsedAt)}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    return (
      <span
        data-testid="date-badge-compact"
        title={tooltipParts}
        className={cn(CHIP_BASE, className)}
      >
        <Clock className="w-3 h-3" aria-hidden="true" />
        {tri.lastUsed ?? tri.updated ?? tri.created}
      </span>
    );
  }

  return (
    <div className={cn('flex items-center gap-1.5 flex-wrap', className)} dir="rtl">
      <span
        data-testid="date-badge-created"
        title={`נוצר: ${formatAbsoluteHe(entity.createdAt)}`}
        className={CHIP_BASE}
      >
        <Plus className="w-3 h-3" aria-hidden="true" />
        נוצר {tri.created}
      </span>
      {tri.updated && (
        <span
          data-testid="date-badge-updated"
          title={`עודכן: ${formatAbsoluteHe(entity.updatedAt)}`}
          className={CHIP_BASE}
        >
          <Pencil className="w-3 h-3" aria-hidden="true" />
          עודכן {tri.updated}
        </span>
      )}
      {tri.lastUsed && (
        <span
          data-testid="date-badge-last-used"
          title={`בשימוש: ${formatAbsoluteHe(entity.lastUsedAt)}`}
          className={CHIP_BASE}
        >
          <Clock className="w-3 h-3" aria-hidden="true" />
          בשימוש {tri.lastUsed}
        </span>
      )}
    </div>
  );
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/ui/__tests__/DateBadge.test.tsx`
Expected: PASS — 4 tests.

- [x] **Step 5: Commit**

```bash
git add src/components/ui/DateBadge.tsx src/components/ui/__tests__/DateBadge.test.tsx
git commit -m "feat: DateBadge component with compact/inline modes"
```

---

## Task 6: ScoreDelta Component (TDD)

**Files:**
- Create: `src/components/ui/ScoreDelta.tsx`
- Test: `src/components/ui/__tests__/ScoreDelta.test.tsx`

- [x] **Step 1: Write the failing tests**

Create `src/components/ui/__tests__/ScoreDelta.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoreDelta } from '../ScoreDelta';

describe('ScoreDelta', () => {
  it('renders before → after with delta when before is provided', () => {
    render(<ScoreDelta before={42} after={87} />);
    expect(screen.getByTestId('score-delta')).toHaveTextContent('42');
    expect(screen.getByTestId('score-delta')).toHaveTextContent('87');
    expect(screen.getByTestId('score-delta')).toHaveTextContent('+45');
  });

  it('renders only the after score when before is null', () => {
    render(<ScoreDelta before={null} after={75} />);
    expect(screen.getByTestId('score-delta')).toHaveTextContent('75');
    expect(screen.getByTestId('score-delta')).not.toHaveTextContent('+');
  });

  it('uses red styling when delta is negative', () => {
    render(<ScoreDelta before={80} after={60} />);
    const el = screen.getByTestId('score-delta');
    expect(el.className).toMatch(/red|rose/);
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/ui/__tests__/ScoreDelta.test.tsx`
Expected: FAIL — module not found.

- [x] **Step 3: Implement the component**

Create `src/components/ui/ScoreDelta.tsx`:

```tsx
"use client";

import { TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScoreDeltaProps {
  before: number | null;
  after: number;
  className?: string;
}

export function ScoreDelta({ before, after, className }: ScoreDeltaProps) {
  const delta = before === null ? null : after - before;
  const isPositive = delta !== null && delta > 0;
  const isNegative = delta !== null && delta < 0;

  // Visual hierarchy: the "after" number is the hero. "before" stays small + dimmed.
  const palette = isNegative
    ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
    : isPositive
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';

  return (
    <div
      data-testid="score-delta"
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-full border',
        palette,
        className
      )}
    >
      {isNegative ? (
        <TrendingDown className="w-5 h-5" aria-hidden="true" />
      ) : isPositive ? (
        <TrendingUp className="w-5 h-5" aria-hidden="true" />
      ) : (
        <Sparkles className="w-5 h-5" aria-hidden="true" />
      )}
      {before !== null && (
        <>
          <span className="text-xs opacity-50 font-normal">{before}</span>
          <span className="opacity-40 text-sm" aria-hidden="true">→</span>
        </>
      )}
      <span className="text-2xl font-bold leading-none">{after}</span>
      {delta !== null && delta !== 0 && (
        <span className="text-sm font-semibold opacity-90">
          ({delta > 0 ? '+' : ''}{delta})
        </span>
      )}
    </div>
  );
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/ui/__tests__/ScoreDelta.test.tsx`
Expected: PASS — 3 tests.

- [x] **Step 5: Commit**

```bash
git add src/components/ui/ScoreDelta.tsx src/components/ui/__tests__/ScoreDelta.test.tsx
git commit -m "feat: ScoreDelta pill component"
```

---

## Task 7: BeforeAfterSplit Component (TDD)

**Files:**
- Create: `src/components/ui/BeforeAfterSplit.tsx`
- Test: `src/components/ui/__tests__/BeforeAfterSplit.test.tsx`

- [x] **Step 1: Write the failing tests**

Create `src/components/ui/__tests__/BeforeAfterSplit.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BeforeAfterSplit } from '../BeforeAfterSplit';

describe('BeforeAfterSplit', () => {
  it('tabs mode shows after content by default and "after" tab is the active hero', () => {
    render(<BeforeAfterSplit original="orig text" enhanced="new text" />);
    expect(screen.getByText('new text')).toBeInTheDocument();
    expect(screen.queryByText('orig text')).not.toBeInTheDocument();
    const afterBtn = screen.getByRole('button', { name: 'אחרי' });
    expect(afterBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('split mode renders "before" pane with reduced opacity (subdued)', () => {
    render(<BeforeAfterSplit mode="split" original="orig" enhanced="new" />);
    const beforeText = screen.getByText('orig');
    // Walk up to find the wrapper that has the opacity class
    const wrapper = beforeText.closest('[class*="opacity"]');
    expect(wrapper).not.toBeNull();
  });

  it('tabs mode switches to before when before tab clicked', () => {
    render(<BeforeAfterSplit original="orig text" enhanced="new text" />);
    fireEvent.click(screen.getByRole('button', { name: 'לפני' }));
    expect(screen.getByText('orig text')).toBeInTheDocument();
  });

  it('split mode shows both panes simultaneously', () => {
    render(<BeforeAfterSplit mode="split" original="orig text" enhanced="new text" />);
    expect(screen.getByText('orig text')).toBeInTheDocument();
    expect(screen.getByText('new text')).toBeInTheDocument();
  });

  it('renders ScoreDelta when score is provided', () => {
    render(
      <BeforeAfterSplit
        original="o"
        enhanced="e"
        score={{ before: 30, after: 80 }}
      />
    );
    expect(screen.getByTestId('score-delta')).toHaveTextContent('30');
    expect(screen.getByTestId('score-delta')).toHaveTextContent('80');
  });

  it('renders improvements list when provided', () => {
    render(
      <BeforeAfterSplit
        original="o"
        enhanced="e"
        score={{ before: 30, after: 80, improvements: ['ברור יותר', 'ספציפי יותר'] }}
      />
    );
    expect(screen.getByText('ברור יותר')).toBeInTheDocument();
    expect(screen.getByText('ספציפי יותר')).toBeInTheDocument();
  });

  it('hides before tab entirely when original is empty', () => {
    render(<BeforeAfterSplit original="" enhanced="only after" />);
    expect(screen.queryByRole('button', { name: 'לפני' })).not.toBeInTheDocument();
    expect(screen.getByText('only after')).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/ui/__tests__/BeforeAfterSplit.test.tsx`
Expected: FAIL — module not found.

- [x] **Step 3: Implement the component**

Create `src/components/ui/BeforeAfterSplit.tsx`:

```tsx
"use client";

import { useState } from 'react';
import { Check } from 'lucide-react';
import { ScoreDelta } from './ScoreDelta';
import { cn } from '@/lib/utils';

type Mode = 'tabs' | 'split';

interface BeforeAfterSplitProps {
  original: string;
  enhanced: string;
  mode?: Mode;
  score?: { before: number | null; after: number; improvements?: string[] };
  className?: string;
}

const PANE_BASE =
  'p-6 text-sm leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto';

export function BeforeAfterSplit({
  original,
  enhanced,
  mode = 'tabs',
  score,
  className,
}: BeforeAfterSplitProps) {
  const hasOriginal = original.trim().length > 0;
  const [activeTab, setActiveTab] = useState<'before' | 'after'>('after');

  return (
    <div className={cn('flex flex-col gap-3', className)} dir="rtl">
      {score && (
        <div className="flex items-center gap-3 flex-wrap">
          <ScoreDelta before={score.before} after={score.after} />
          {score.improvements && score.improvements.length > 0 && (
            <ul className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
              {score.improvements.slice(0, 3).map((line, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-500" aria-hidden="true" />
                  {line}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/*
        Visual hierarchy: "אחרי" is the hero (active by default, brand-tinted),
        "לפני" is muted text-only with no background — present but never competing.
        See feedback memory: feedback_before_after_emphasis.md
      */}
      {mode === 'tabs' && hasOriginal && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('after')}
            aria-pressed={activeTab === 'after'}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors',
              activeTab === 'after'
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'
            )}
          >
            אחרי
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('before')}
            aria-pressed={activeTab === 'before'}
            className={cn(
              'px-2 py-1 rounded-full text-[11px] font-normal border transition-colors',
              activeTab === 'before'
                ? 'text-[var(--text-secondary)] border-[var(--glass-border)]'
                : 'text-[var(--text-muted)] border-transparent opacity-70 hover:opacity-100'
            )}
          >
            לפני
          </button>
        </div>
      )}

      {mode === 'split' ? (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-3 items-start">
          {hasOriginal && (
            <div className="rounded-lg bg-[var(--glass-bg)]/40 opacity-60">
              <div className="px-3 pt-2 text-[9px] font-normal uppercase tracking-wider text-[var(--text-muted)]">
                לפני
              </div>
              <div className={cn(PANE_BASE, 'text-xs text-[var(--text-muted)]')}>
                {original}
              </div>
            </div>
          )}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04] shadow-sm">
            <div className="px-4 pt-3 text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              אחרי
            </div>
            <div className={cn(PANE_BASE, 'text-base text-[var(--text-primary)]')}>
              {enhanced}
            </div>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            'rounded-xl transition-all',
            activeTab === 'after'
              ? 'border border-amber-500/30 bg-amber-500/[0.04] shadow-sm'
              : 'border border-[var(--glass-border)] bg-[var(--glass-bg)]/40 opacity-70'
          )}
        >
          <div
            className={cn(
              PANE_BASE,
              activeTab === 'after'
                ? 'text-base text-[var(--text-primary)]'
                : 'text-sm text-[var(--text-muted)]'
            )}
          >
            {hasOriginal && activeTab === 'before' ? original : enhanced}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/ui/__tests__/BeforeAfterSplit.test.tsx`
Expected: PASS — 6 tests.

- [x] **Step 5: Commit**

```bash
git add src/components/ui/BeforeAfterSplit.tsx src/components/ui/__tests__/BeforeAfterSplit.test.tsx
git commit -m "feat: BeforeAfterSplit component with score + improvements"
```

---

## Task 8: Wire updated_at Writes in API Routes

**Files:**
- Modify: `src/app/api/enhance/route.ts:258-272`
- Modify: `src/app/api/share/route.ts:36-46`
- Modify: `src/hooks/useLibrary.ts:680-704`

This task makes the new DB columns observable in fresh writes. No new files.

- [x] **Step 1: Update enhance route to write updated_at**

In `src/app/api/enhance/route.ts`, locate the `history` insert (around line 259) and add an explicit `updated_at`:

```typescript
// Save to history table so admin can see actual prompts
await queryClient.from('history').insert({
    user_id: userId,
    prompt,
    enhanced_prompt: completion.text,
    tone,
    category,
    capability_mode: capability_mode || 'STANDARD',
    title: prompt.slice(0, 60),
    source: bearerToken?.startsWith('prk_') ? 'api' : bearerToken ? 'extension' : 'web',
    updated_at: new Date().toISOString(),
}).then(({ error: histErr }) => {
    if (histErr) logger.warn('[Enhance] History insert failed:', histErr.message);
});
```

- [x] **Step 2: Update share route to write updated_at**

In `src/app/api/share/route.ts`, locate the `shared_prompts` insert (around line 36):

```typescript
const { data, error } = await supabase
  .from('shared_prompts')
  .insert({
    prompt: prompt.trim(),
    original_input: original_input?.trim() || null,
    category: category || 'General',
    capability_mode: capability_mode || 'STANDARD',
    user_id: user.id,
    updated_at: new Date().toISOString(),
  })
  .select('id')
  .single();
```

- [x] **Step 3: Update useLibrary insert to set updated_at explicitly**

In `src/hooks/useLibrary.ts` around line 680, extend the `insertData` object:

```typescript
const insertData = {
  user_id: user.id,
  title: prompt.title,
  prompt: prompt.prompt,
  prompt_style: prompt.prompt_style ?? null,
  category: prompt.category,
  personal_category: prompt.personal_category,
  use_case: prompt.use_case,
  source: prompt.source,
  sort_index: nextSortIndex,
  capability_mode: prompt.capability_mode ?? CapabilityMode.STANDARD,
  tags: prompt.tags || [],
  updated_at: new Date().toISOString(),
};
```

(Note: `last_used_at` is intentionally NOT set on insert — `incrementUseCount` at line 797 already writes it on first use.)

- [x] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [x] **Step 5: Run existing tests for enhance route**

Run: `npx vitest run src/app/api/enhance/__tests__/route.test.ts`
Expected: PASS (existing tests should not break — we only added a field to an insert).

- [x] **Step 6: Commit**

```bash
git add src/app/api/enhance/route.ts src/app/api/share/route.ts src/hooks/useLibrary.ts
git commit -m "feat: write updated_at on prompt inserts"
```

---

## Task 9: Wire useHistory to Expose PromptEntity

**Files:**
- Modify: `src/hooks/useHistory.ts:60-90`

- [x] **Step 1: Update the row mapper**

In `src/hooks/useHistory.ts`, replace the `data.map` block in the `queryFn`:

```typescript
import { fromHistoryRow } from '@/lib/prompt-entity';
// ... existing imports ...

export interface HistoryItem {
  id: string;
  original: string;
  enhanced: string;
  tone: string;
  category: string;
  title?: string;
  source?: string;
  timestamp: number;
  /** Full PromptEntity for use by DateBadge / BeforeAfterSplit. */
  entity: import('@/lib/prompt-entity').PromptEntity;
}
```

Then replace the `return data.map(...)` block with:

```typescript
return data.map((row) => {
  const entity = fromHistoryRow(row);
  return {
    id: entity.id,
    original: entity.original,
    enhanced: entity.enhanced,
    tone: entity.tone ?? '',
    category: entity.category,
    title: entity.title || undefined,
    source: entity.source,
    timestamp: new Date(entity.createdAt).getTime(),
    entity,
  } satisfies HistoryItem;
});
```

- [x] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [x] **Step 3: Run existing useHistory tests if any**

Run: `npx vitest run src/hooks/__tests__/useStreamingCompletion.test.ts`
Expected: PASS (smoke check that hooks still compile/run).

- [x] **Step 4: Commit**

```bash
git add src/hooks/useHistory.ts
git commit -m "feat: useHistory exposes PromptEntity per item"
```

---

## Task 10: Wire HistoryPanel to DateBadge

**Files:**
- Modify: `src/components/features/history/HistoryPanel.tsx`

- [x] **Step 1: Delete inline formatTimeAgo and import from shared module**

In `src/components/features/history/HistoryPanel.tsx`, remove lines 6-31 (the inline `formatTimeAgo` function and its docblock) and replace with:

```typescript
import { formatRelativeHe } from '@/lib/dates/format';
import { DateBadge } from '@/components/ui/DateBadge';
```

Replace any call site that does `formatTimeAgo(new Date(item.timestamp))` with `formatRelativeHe(item.entity.createdAt)`.

- [x] **Step 2: Replace per-item timestamp display with DateBadge**

Locate the JSX block in `HistoryPanel.tsx` where each history item's date is rendered (search for `formatTimeAgo` in the file). Replace that span with:

```tsx
<DateBadge mode="compact" entity={item.entity} />
```

- [x] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [x] **Step 4: Visual smoke test**

Run: `npm run dev`
Open the app, log in, perform an enhance, and inspect the history panel. Expected: each entry shows a clock chip with relative time. Hover shows absolute date in tooltip.

Stop the dev server (`Ctrl+C`).

- [x] **Step 5: Commit**

```bash
git add src/components/features/history/HistoryPanel.tsx
git commit -m "feat: HistoryPanel uses shared DateBadge"
```

---

## Task 11: Wire ResultSection to BeforeAfterSplit + ScoreDelta + DateBadge

**Files:**
- Modify: `src/components/features/prompt-improver/ResultSection.tsx:168-260`

- [x] **Step 1: Replace inline before/after tabs with BeforeAfterSplit**

In `src/components/features/prompt-improver/ResultSection.tsx`, locate the block that renders the tab strip + before/after content (currently lines ~196-260). Replace the entire `{showTabs && ...}` block AND the `{isBeforeTab ? ... : ...}` content block with a single `<BeforeAfterSplit>`:

```tsx
import { BeforeAfterSplit } from '@/components/ui/BeforeAfterSplit';
import { ScoreDelta } from '@/components/ui/ScoreDelta';
// ... existing imports ...

// Inside the component, replace the tab strip + content area with:
<BeforeAfterSplit
  original={originalPrompt}
  enhanced={displayCompletion}
  mode="tabs"
  score={
    completionScore
      ? {
          before: improvementDelta > 0 ? Math.max(0, completionScore.score - improvementDelta) : null,
          after: completionScore.score,
        }
      : undefined
  }
/>
```

(Note: keep the floating copy button — that's separate from the before/after view. The `BeforeAfterSplit` only owns the toggle + the text panes.)

- [x] **Step 2: Replace the header score chip with ScoreDelta**

In the same file, locate the `Header Card` block (around line 168). Replace the inline `improvementDelta` span and `completionScore` chip with:

```tsx
{completionScore && (
  <ScoreDelta
    before={improvementDelta > 0 ? Math.max(0, completionScore.score - improvementDelta) : null}
    after={completionScore.score}
  />
)}
```

- [x] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [x] **Step 4: Visual smoke test**

Run: `npm run dev`. Enhance a prompt. Expected: top of result card shows a green pill `42 → 87 (+45)` with a TrendingUp icon. Below the header, the new BeforeAfterSplit renders with תגי "לפני"/"אחרי" tabs, and switching tabs swaps the content.

Stop the dev server.

- [x] **Step 5: Commit**

```bash
git add src/components/features/prompt-improver/ResultSection.tsx
git commit -m "feat: ResultSection uses BeforeAfterSplit + ScoreDelta"
```

---

## Task 12: Wire SharedPromptPage to BeforeAfterSplit + DateBadge

**Files:**
- Modify: `src/app/p/[id]/page.tsx:99-140`

- [x] **Step 1: Replace inline before/after divs with BeforeAfterSplit**

In `src/app/p/[id]/page.tsx`, replace the two blocks that render `original_input` and the enhanced prompt (lines ~123-138) with:

```tsx
import { BeforeAfterSplit } from '@/components/ui/BeforeAfterSplit';
import { DateBadge } from '@/components/ui/DateBadge';
import { fromSharedPromptRow } from '@/lib/prompt-entity';
// ... existing imports ...

// Inside the JSX, after the metadata bar:
const entity = fromSharedPromptRow(prompt);

// Replace the `prompt.original_input && ...` and the `<div className="p-6">` blocks with:
<div className="p-6 flex flex-col gap-4">
  <DateBadge mode="inline" entity={entity} />
  <BeforeAfterSplit
    original={prompt.original_input || ''}
    enhanced={prompt.prompt}
    mode="tabs"
  />
</div>
```

- [x] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [x] **Step 3: Visual smoke test**

Run: `npm run dev`. Visit any existing shared prompt URL (e.g., grab one from Supabase `shared_prompts` table). Expected: see DateBadge chips + BeforeAfterSplit. The `views` counter still increments via `increment_shared_prompt_views()` (now defined by our migration).

Stop the dev server.

- [x] **Step 4: Commit**

```bash
git add src/app/p/[id]/page.tsx
git commit -m "feat: shared prompt page uses BeforeAfterSplit + DateBadge"
```

---

## Task 13: Wire PersonalLibraryPromptCard to DateBadge

**Files:**
- Modify: `src/components/views/personal-library/PersonalLibraryPromptCard.tsx`

- [x] **Step 1: Read the file to find the title region**

Run:
```bash
```
(Use the Read tool on the file to find the title block — exact line numbers depend on current state.)

- [x] **Step 2: Add DateBadge near the title**

In `PersonalLibraryPromptCard.tsx`, locate the JSX where the prompt title is rendered. Add the import:

```typescript
import { DateBadge } from '@/components/ui/DateBadge';
import { fromPersonalLibraryRow } from '@/lib/prompt-entity';
```

Inside the card body, near the title, add:

```tsx
<DateBadge
  mode="compact"
  entity={fromPersonalLibraryRow({
    id: prompt.id,
    title: prompt.title,
    prompt: prompt.prompt,
    category: prompt.category,
    capability_mode: prompt.capability_mode,
    created_at: typeof prompt.created_at === 'number'
      ? new Date(prompt.created_at).toISOString()
      : prompt.created_at,
    updated_at: typeof prompt.updated_at === 'number'
      ? new Date(prompt.updated_at).toISOString()
      : prompt.updated_at,
    last_used_at:
      prompt.last_used_at == null
        ? null
        : typeof prompt.last_used_at === 'number'
          ? new Date(prompt.last_used_at).toISOString()
          : prompt.last_used_at,
  })}
/>
```

- [x] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [x] **Step 4: Visual smoke test**

Run: `npm run dev`. Open personal library. Expected: each card shows a small clock chip with the most-recent timestamp.

Stop the dev server.

- [x] **Step 5: Commit**

```bash
git add src/components/views/personal-library/PersonalLibraryPromptCard.tsx
git commit -m "feat: PersonalLibraryPromptCard shows DateBadge"
```

---

## Task 14: Wire SystemPromptsTab to DateBadge

**Files:**
- Modify: `src/components/admin/tabs/SystemPromptsTab.tsx`

- [x] **Step 1: Add DateBadge to each system-prompt row**

In `src/components/admin/tabs/SystemPromptsTab.tsx`, locate the row rendering for each ai_prompt entry. Add:

```typescript
import { DateBadge } from '@/components/ui/DateBadge';
import { fromAiPromptRow } from '@/lib/prompt-entity';
```

In the row JSX (next to the prompt key/version metadata), add:

```tsx
<DateBadge mode="inline" entity={fromAiPromptRow(promptRow)} />
```

(Replace `promptRow` with the actual variable name in the loop — open the file and inspect the map callback.)

- [x] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [x] **Step 3: Visual smoke test**

Run: `npm run dev`. Open `/admin/system-prompts` (or wherever the tab is mounted). Expected: each row shows created/updated chips.

Stop the dev server.

- [x] **Step 4: Commit**

```bash
git add src/components/admin/tabs/SystemPromptsTab.tsx
git commit -m "feat: SystemPromptsTab shows DateBadge per prompt"
```

---

## Task 15: i18n Strings

**Files:**
- Modify: `src/i18n/he.json`
- Modify: `src/i18n/en.json`

- [x] **Step 1: Add Hebrew strings**

Open `src/i18n/he.json` and add (under an appropriate top-level key — find an existing namespace like `result_section` and add a peer):

```json
"prompt_entity": {
  "dates": {
    "created": "נוצר",
    "updated": "עודכן",
    "last_used": "בשימוש"
  },
  "before_after": {
    "before": "לפני",
    "after": "אחרי",
    "improvements_title": "מה השתפר"
  }
}
```

- [x] **Step 2: Add English strings**

Open `src/i18n/en.json` and add the parallel block:

```json
"prompt_entity": {
  "dates": {
    "created": "Created",
    "updated": "Updated",
    "last_used": "Last used"
  },
  "before_after": {
    "before": "Before",
    "after": "After",
    "improvements_title": "What improved"
  }
}
```

- [x] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (i18n JSON parsed without schema errors).

- [x] **Step 4: Commit**

```bash
git add src/i18n/he.json src/i18n/en.json
git commit -m "feat: i18n strings for prompt-entity primitives"
```

---

## Task 16: End-to-end Playwright Test

**Files:**
- Create: `tests/e2e/prompt-entity-flow.spec.ts`

- [x] **Step 1: Write the e2e spec**

Create `tests/e2e/prompt-entity-flow.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('PromptEntity flow', () => {
  test('enhance shows DateBadge "now" + ScoreDelta + BeforeAfterSplit', async ({ page }) => {
    // Assumes test user is already authenticated via storage state.
    await page.goto('/');

    const input = page.getByPlaceholder(/כתוב|Write|prompt/i).first();
    await input.fill('write a marketing email about a new shoe');
    await page.getByRole('button', { name: /שדרג|Enhance/i }).first().click();

    // ScoreDelta should appear
    await expect(page.getByTestId('score-delta')).toBeVisible({ timeout: 30_000 });

    // BeforeAfterSplit "אחרי" tab is active by default; switch to "לפני"
    await page.getByRole('button', { name: 'לפני' }).click();
    await expect(page.getByText('write a marketing email about a new shoe')).toBeVisible();
    await page.getByRole('button', { name: 'אחרי' }).click();

    // History panel should now contain a DateBadge with "כמה שניות" or "דקה"
    await expect(page.getByTestId('date-badge-compact').first()).toBeVisible();
  });
});
```

- [x] **Step 2: Run the e2e test**

Run: `npm run test:e2e -- prompt-entity-flow.spec.ts`
Expected: PASS. If auth-state isn't configured, the test will skip — note that as a follow-up but do not block the plan.

- [x] **Step 3: Commit**

```bash
git add tests/e2e/prompt-entity-flow.spec.ts
git commit -m "test(e2e): PromptEntity end-to-end flow"
```

---

## Task 17: Final Verification

- [x] **Step 1: Run full unit suite**

Run: `npm run test`
Expected: ALL PASS. New tests: adapters (6), format (10), DateBadge (4), ScoreDelta (3), BeforeAfterSplit (6) = 29 new tests.

- [x] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [x] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS or only pre-existing warnings (no new errors).

- [x] **Step 4: Run build**

Run: `npm run build`
Expected: build succeeds.

- [x] **Step 5: Manual visual checklist**

Run `npm run dev` and verify each surface:

1. **Enhance flow** (`/`) — perform an enhance. ScoreDelta pill visible top-right. BeforeAfterSplit tabs functional.
2. **History panel** — DateBadge compact chip on each item. Hover shows absolute date.
3. **Personal library** — DateBadge compact chip on each card.
4. **Shared prompt** (`/p/<id>`) — DateBadge inline + BeforeAfterSplit visible. Views increment on refresh (verify in DB or admin panel).
5. **Admin system prompts** — DateBadge inline on each row.

- [x] **Step 6: Final commit (if any uncommitted polish)**

```bash
git status
# If clean, you're done. If anything dangling:
git add -A
git commit -m "chore: final polish for PromptEntity rollout"
```

---

## Self-Review Checklist (filled out by plan author)

**Spec coverage:**
- ✅ Requirement #1 (consistent timestamps) — covered by Tasks 1, 8, 9, 10, 12, 13, 14
- ✅ Requirement #2 (Before/After 10s value proof) — covered by Tasks 6, 7, 11, 12
- ✅ PromptEntity contract — Tasks 2, 3
- ✅ Shared primitives DateBadge / BeforeAfterSplit — Tasks 5, 6, 7
- ✅ 5 core surfaces wired — Tasks 10, 11, 12, 13, 14
- ✅ Existing `increment_shared_prompt_views` bug fix — Task 1 step 1 section 7
- ⏸ Requirement #3 (Export) — explicitly deferred per user instruction
- ⏸ Requirement #4 (Admin Sync/Reconciliation/Audit) — explicitly deferred

**Type consistency:**
- `PromptEntity.table` is the same union string across `types.ts`, `adapters.ts`, and the SQL whitelist in Task 1 step 1.
- `formatTriState` input field names (`createdAt`, `updatedAt`, `lastUsedAt`) match `DateBadge` props.
- `ScoreDelta` props (`before: number | null`, `after: number`) match what `BeforeAfterSplit` passes through.

**Placeholder scan:** No TBDs, no "implement later", no "similar to Task N". All code blocks are complete.

**Known soft-spots flagged for the executor:**
- Task 13 step 1 says to use the Read tool to find exact line numbers in `PersonalLibraryPromptCard.tsx` — this is intentional; the file's structure should be inspected fresh.
- Task 14 says the same for `SystemPromptsTab.tsx`. The variable name in the row map callback must be verified.
- The Playwright test in Task 16 assumes pre-configured auth storage state. If unavailable, document and defer — not a blocker for shipping the primitives.
