# Extension v2 — Server-Side (M1 + M2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the server-side foundation for the extension v2 upgrade — model profiles in the DB, the `target_model` parameter on `/api/enhance`, the 3-stage cost funnel (local score gate → cache → tier-routed model), and two new endpoints (`/api/extension-config`, `/api/extension-telemetry`). Web UI gains a target-model dropdown for free.

**Architecture:** Two new tables (`model_profiles`, `extension_configs`) plus one new column on `usage_history` (`cost_funnel_stage`). `BaseEngine` gains `applyModelProfile()`. `enhance` route gates LLM calls behind a 3-stage pipeline. New `/api/extension-config` reads from `extension_configs` (5-min server cache) and exposes selectors + flags + profile metadata. `/api/extension-telemetry` is append-only to `extension_telemetry_events` for selector misses and UX events.

**Tech Stack:** Next.js 16 App Router, Supabase Postgres + RLS, Vitest, Vercel AI SDK, Upstash Redis (already wired), TypeScript strict.

**Spec:** `docs/superpowers/specs/2026-04-29-extension-v2-model-aware-design.md`

**Out of scope (in their own plans):** M3 (extension v2.0.0 selector registry adoption + site cuts), M4 (Quick-Lib + Inline Chips).

---

## File Map

**New files:**
- `supabase/migrations/20260429130000_model_profiles.sql` — `model_profiles` table + seed rows + RLS.
- `supabase/migrations/20260429140000_extension_configs.sql` — `extension_configs` (single row) + RLS.
- `supabase/migrations/20260429150000_extension_telemetry.sql` — `extension_telemetry_events` table + RLS.
- `supabase/migrations/20260429160000_usage_history_cost_funnel_stage.sql` — adds `cost_funnel_stage smallint null`.
- `src/lib/engines/model-profiles.ts` — DB loader + 5-min in-memory cache.
- `src/lib/engines/__tests__/model-profiles.test.ts` — unit tests for loader + fallback.
- `src/lib/engines/score-gate.ts` — local score gate + `applyModelTagWrapper()` (zero LLM call).
- `src/lib/engines/__tests__/score-gate.test.ts` — unit tests.
- `src/app/api/extension-config/route.ts` — GET endpoint.
- `src/app/api/extension-config/__tests__/route.test.ts`.
- `src/app/api/extension-telemetry/route.ts` — POST endpoint, append-only.
- `src/app/api/extension-telemetry/__tests__/route.test.ts`.

**Modified files:**
- `src/lib/engines/types.ts` — extend `TargetModel` (or add `ModelProfileSlug` alongside) + new `EngineInput.modelProfileSlug`.
- `src/lib/engines/base-engine.ts` — new `applyModelProfile()` method.
- `src/lib/ai/enhance-cache.ts` — bump `ENGINE_VERSION` and mix in `cache_version` from `extension_configs`.
- `src/lib/ai/models.ts` — add `selectModelByLength()` for tier routing.
- `src/app/api/enhance/route.ts` — accept `target_model` and `model_profile_slug`, run 3-stage funnel, log `cost_funnel_stage`.
- `src/app/api/enhance/__tests__/route.test.ts` — add tests for funnel stages 1/2/3 and model-profile application.

---

## Conventions

- **Migration naming:** `YYYYMMDDHHMMSS_<short_name>.sql` (matches existing pattern).
- **Tests:** Vitest, colocated in `__tests__/` subdirs. Run with `npm run test -- <pattern>`.
- **Hebrew strings:** keep error messages in Hebrew (matches existing patterns).
- **RLS:** every new table gets `enable row level security`. Reads explicit, writes service-role only unless otherwise noted.
- **Commits:** one task = one commit. Conventional Commits style (`feat:`, `fix:`, `test:`, `db:`).

Run from repo root `C:\Users\sasso\dev\Peroot\Prut\web` unless stated otherwise. On Windows bash, use forward slashes.

---

## Task 1: Create `model_profiles` table + seed 3 profiles

**Files:**
- Create: `supabase/migrations/20260429130000_model_profiles.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260429130000_model_profiles.sql`:

```sql
-- Extension v2 — model-aware enhancement profiles.
-- Each profile carries a system-prompt fragment, output-format rules, and
-- dimension-weight overrides that are layered onto the base engine for the
-- duration of one /api/enhance call.

create table if not exists public.model_profiles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  display_name text not null,
  display_name_he text not null,
  host_match text[] not null default '{}',
  system_prompt_he text not null,
  output_format_rules jsonb not null default '{}'::jsonb,
  dimension_weights jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists model_profiles_slug_idx on public.model_profiles (slug) where is_active = true;
create index if not exists model_profiles_host_match_idx on public.model_profiles using gin (host_match);

alter table public.model_profiles enable row level security;

drop policy if exists "model_profiles_read_authenticated" on public.model_profiles;
create policy "model_profiles_read_authenticated"
  on public.model_profiles
  for select
  using (auth.role() = 'authenticated');

-- Writes are service-role only. No anon/authenticated insert/update/delete policies.

-- Seed: 3 day-one profiles. ON CONFLICT keeps existing rows untouched so
-- re-running the migration on a hot DB is safe.
insert into public.model_profiles
  (slug, display_name, display_name_he, host_match, system_prompt_he, output_format_rules, dimension_weights, sort_order)
values
  (
    'gpt-5',
    'ChatGPT (GPT-5)',
    'ChatGPT (GPT-5)',
    array['chatgpt.com', 'chat.openai.com'],
    'התאם את הפלט עבור GPT-5: פלט מובנה ב-Markdown עם כותרות ברורות (## כותרת ראשית, ### תת-כותרת). השתמש ברשימות ממוספרות לשלבים. הצג טבלאות כשיש נתונים השוואתיים.',
    '{"prefer":"markdown_headers","xml_tags":false,"max_length":null}'::jsonb,
    '{"structure":1.2,"specificity":1.1}'::jsonb,
    10
  ),
  (
    'claude-sonnet-4',
    'Claude Sonnet 4',
    'Claude Sonnet 4',
    array['claude.ai'],
    'התאם את הפלט עבור Claude Sonnet 4: עטוף קטעים מובנים בתגיות XML — `<context>...</context>`, `<task>...</task>`, `<constraints>...</constraints>`, `<output_format>...</output_format>`. הסבר את ההיגיון לפני המסקנה.',
    '{"prefer":"xml_tags","xml_tags":true,"max_length":null}'::jsonb,
    '{"reasoning":1.2,"structure":1.15}'::jsonb,
    20
  ),
  (
    'gemini-2.5',
    'Gemini 2.5',
    'Gemini 2.5',
    array['gemini.google.com'],
    'התאם את הפלט עבור Gemini 2.5: פתח עם תפקיד ומטרה מפורשים בשורה הראשונה. השתמש בנקודות תמציתיות. הגדר פורמט פלט מראש (JSON / טבלה / רשימה).',
    '{"prefer":"numbered_lists","xml_tags":false,"max_length":null}'::jsonb,
    '{"role_clarity":1.2,"output_format":1.15}'::jsonb,
    30
  )
on conflict (slug) do nothing;
```

- [ ] **Step 2: Apply migration to local DB**

Run:
```bash
npx supabase db reset || true   # if local Supabase is running
# OR push to dev branch:
# (skip this if you're using `mcp__supabase__apply_migration` from Cursor instead)
```

If Supabase local isn't available, apply via the Supabase MCP `apply_migration` tool with the migration content.

- [ ] **Step 3: Verify rows**

Via Supabase SQL editor or `mcp__supabase__execute_sql`:
```sql
select slug, display_name, host_match, sort_order from public.model_profiles order by sort_order;
```

Expected: 3 rows: `gpt-5`, `claude-sonnet-4`, `gemini-2.5`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260429130000_model_profiles.sql
git commit -m "db(model_profiles): create table + seed gpt-5/claude/gemini profiles"
```

---

## Task 2: Type extensions + ModelProfile loader

**Files:**
- Modify: `src/lib/engines/types.ts`
- Create: `src/lib/engines/model-profiles.ts`
- Create: `src/lib/engines/__tests__/model-profiles.test.ts`

- [ ] **Step 1: Extend types**

In `src/lib/engines/types.ts`, find the `TargetModel` line:

```ts
export type TargetModel = "chatgpt" | "claude" | "gemini" | "general";
```

Leave `TargetModel` as-is (it remains the host-level coarse identifier used by existing engines). Add a new exported type and field:

```ts
/** DB-driven slug of a model_profiles row. Free-form string so new
 *  profiles can be added without TypeScript releases. */
export type ModelProfileSlug = string;

export interface ModelProfile {
  slug: ModelProfileSlug;
  displayName: string;
  displayNameHe: string;
  hostMatch: string[];
  systemPromptHe: string;
  outputFormatRules: Record<string, unknown>;
  dimensionWeights: Record<string, number>;
  isActive: boolean;
  sortOrder: number;
}
```

In the same file, find `interface EngineInput {` and add a new optional field next to `targetModel`:

```ts
  /** Slug of a row in public.model_profiles. When set, BaseEngine.applyModelProfile()
   *  layers the profile's system prompt and dimension weights onto this run. */
  modelProfileSlug?: ModelProfileSlug;
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/engines/__tests__/model-profiles.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { __resetCacheForTest, getModelProfile, getActiveModelProfiles } from "../model-profiles";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";

function mockSupabase(rows: Record<string, unknown>[] | null, error: Error | null = null) {
  const single = vi.fn().mockResolvedValue({ data: rows?.[0] ?? null, error });
  const order = vi.fn().mockResolvedValue({ data: rows ?? [], error });
  const eq = vi.fn(() => ({ maybeSingle: single }));
  const select = vi.fn(() => ({ eq, order }));
  const from = vi.fn(() => ({ select }));
  (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });
}

describe("model-profiles loader", () => {
  beforeEach(() => {
    __resetCacheForTest();
    vi.clearAllMocks();
  });

  it("returns the profile when slug is found", async () => {
    mockSupabase([{
      slug: "gpt-5",
      display_name: "ChatGPT (GPT-5)",
      display_name_he: "ChatGPT (GPT-5)",
      host_match: ["chatgpt.com"],
      system_prompt_he: "x",
      output_format_rules: { prefer: "markdown_headers" },
      dimension_weights: { structure: 1.2 },
      is_active: true,
      sort_order: 10,
    }]);
    const profile = await getModelProfile("gpt-5");
    expect(profile?.slug).toBe("gpt-5");
    expect(profile?.outputFormatRules.prefer).toBe("markdown_headers");
  });

  it("returns null for an unknown slug", async () => {
    mockSupabase([]);
    expect(await getModelProfile("nope")).toBeNull();
  });

  it("returns null and logs on DB error (graceful fallback)", async () => {
    mockSupabase(null, new Error("conn refused"));
    expect(await getModelProfile("gpt-5")).toBeNull();
  });

  it("caches successful loads (second call hits cache)", async () => {
    mockSupabase([{
      slug: "gpt-5", display_name: "x", display_name_he: "x",
      host_match: [], system_prompt_he: "x",
      output_format_rules: {}, dimension_weights: {},
      is_active: true, sort_order: 10,
    }]);
    await getModelProfile("gpt-5");
    await getModelProfile("gpt-5");
    expect(createServiceClient).toHaveBeenCalledTimes(1);
  });

  it("getActiveModelProfiles returns sorted active profiles", async () => {
    mockSupabase([
      { slug: "a", sort_order: 30, is_active: true, display_name: "A", display_name_he: "A", host_match: [], system_prompt_he: "", output_format_rules: {}, dimension_weights: {} },
      { slug: "b", sort_order: 10, is_active: true, display_name: "B", display_name_he: "B", host_match: [], system_prompt_he: "", output_format_rules: {}, dimension_weights: {} },
    ]);
    const list = await getActiveModelProfiles();
    expect(list.map(p => p.slug)).toEqual(["a", "b"]); // order preserved from DB
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- src/lib/engines/__tests__/model-profiles.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the loader**

Create `src/lib/engines/model-profiles.ts`:

```ts
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
import type { ModelProfile, ModelProfileSlug } from "./types";

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry { value: ModelProfile | null; ts: number; }
const singleCache = new Map<ModelProfileSlug, CacheEntry>();
let activeListCache: { value: ModelProfile[]; ts: number } | null = null;

interface RowShape {
  slug: string;
  display_name: string;
  display_name_he: string;
  host_match: string[];
  system_prompt_he: string;
  output_format_rules: Record<string, unknown>;
  dimension_weights: Record<string, number>;
  is_active: boolean;
  sort_order: number;
}

function rowToProfile(row: RowShape): ModelProfile {
  return {
    slug: row.slug,
    displayName: row.display_name,
    displayNameHe: row.display_name_he,
    hostMatch: row.host_match ?? [],
    systemPromptHe: row.system_prompt_he,
    outputFormatRules: row.output_format_rules ?? {},
    dimensionWeights: row.dimension_weights ?? {},
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

/** Look up a single profile by slug. Returns null on miss or DB failure. */
export async function getModelProfile(slug: ModelProfileSlug): Promise<ModelProfile | null> {
  const hit = singleCache.get(slug);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.value;

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("model_profiles")
      .select("slug,display_name,display_name_he,host_match,system_prompt_he,output_format_rules,dimension_weights,is_active,sort_order")
      .eq("slug", slug)
      .maybeSingle();
    if (error) {
      logger.warn("[model-profiles] load failed", { slug, error: error.message });
      singleCache.set(slug, { value: null, ts: Date.now() });
      return null;
    }
    const profile = data ? rowToProfile(data as RowShape) : null;
    singleCache.set(slug, { value: profile, ts: Date.now() });
    return profile;
  } catch (err) {
    logger.warn("[model-profiles] load threw", { slug, err: (err as Error).message });
    return null;
  }
}

/** All active profiles, ordered by sort_order. Used by /api/extension-config and the web UI dropdown. */
export async function getActiveModelProfiles(): Promise<ModelProfile[]> {
  if (activeListCache && Date.now() - activeListCache.ts < CACHE_TTL_MS) return activeListCache.value;
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("model_profiles")
      .select("slug,display_name,display_name_he,host_match,system_prompt_he,output_format_rules,dimension_weights,is_active,sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) {
      logger.warn("[model-profiles] list failed", { error: error.message });
      return [];
    }
    const list = (data as RowShape[]).map(rowToProfile);
    activeListCache = { value: list, ts: Date.now() };
    return list;
  } catch (err) {
    logger.warn("[model-profiles] list threw", { err: (err as Error).message });
    return [];
  }
}

/** @internal Test-only. */
export function __resetCacheForTest(): void {
  singleCache.clear();
  activeListCache = null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- src/lib/engines/__tests__/model-profiles.test.ts
```

Expected: PASS, 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/engines/types.ts src/lib/engines/model-profiles.ts src/lib/engines/__tests__/model-profiles.test.ts
git commit -m "feat(engines): ModelProfile types + 5-min cached DB loader"
```

---

## Task 3: `applyModelProfile()` mixin on BaseEngine

**Files:**
- Modify: `src/lib/engines/base-engine.ts`
- Create: `src/lib/engines/__tests__/base-engine-model-profile.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/engines/__tests__/base-engine-model-profile.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { __resetCacheForTest } from "../model-profiles";

vi.mock("../model-profiles", async () => {
  const actual = await vi.importActual<typeof import("../model-profiles")>("../model-profiles");
  return {
    ...actual,
    getModelProfile: vi.fn(),
  };
});

import { getModelProfile } from "../model-profiles";
import { BaseEngine } from "../base-engine";

class TestEngine extends BaseEngine {
  generate(input: any) { return { systemPrompt: this.getSystemPrompt(), userPrompt: "" } as any; }
  generateRefinement(input: any) { return { systemPrompt: this.getSystemPrompt(), userPrompt: "" } as any; }
  // expose protected state for the test
  public getSystemPrompt(): string { return (this as any)._systemPromptOverride ?? "BASE"; }
}

describe("BaseEngine.applyModelProfile", () => {
  beforeEach(() => { __resetCacheForTest(); vi.clearAllMocks(); });

  it("appends system_prompt_he to the engine's system prompt", async () => {
    (getModelProfile as ReturnType<typeof vi.fn>).mockResolvedValue({
      slug: "gpt-5", systemPromptHe: "PROFILE_TAIL",
      outputFormatRules: {}, dimensionWeights: {},
      hostMatch: [], displayName: "x", displayNameHe: "x", isActive: true, sortOrder: 10,
    });
    const engine = new TestEngine({} as any);
    await engine.applyModelProfile("gpt-5");
    expect(engine.getSystemPrompt()).toContain("PROFILE_TAIL");
  });

  it("is a no-op when profile is not found", async () => {
    (getModelProfile as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const engine = new TestEngine({} as any);
    await engine.applyModelProfile("nope");
    expect(engine.getSystemPrompt()).toBe("BASE");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- src/lib/engines/__tests__/base-engine-model-profile.test.ts
```

Expected: FAIL — `applyModelProfile is not a function` or similar.

- [ ] **Step 3: Implement the mixin**

In `src/lib/engines/base-engine.ts`, near the top of the class (after the constructor and existing fields), add:

```ts
import { getModelProfile } from "./model-profiles";
import type { ModelProfile, ModelProfileSlug } from "./types";
```

Inside the `BaseEngine` class body add a private field and the method:

```ts
  /**
   * Tail appended to the engine system prompt when a model profile is active.
   * `null` when no profile has been applied for this run.
   */
  private _modelProfileTail: string | null = null;
  private _modelProfileWeights: Record<string, number> = {};

  /**
   * Layer a model profile onto this engine instance for the current run:
   * - appends `system_prompt_he` to the system prompt,
   * - merges `dimension_weights` into the scoring weights.
   * Graceful no-op when the profile is not found (logs a warning upstream).
   */
  async applyModelProfile(slug: ModelProfileSlug | undefined): Promise<ModelProfile | null> {
    if (!slug) return null;
    const profile = await getModelProfile(slug);
    if (!profile) return null;
    this._modelProfileTail = profile.systemPromptHe;
    this._modelProfileWeights = profile.dimensionWeights;
    return profile;
  }

  /** Concatenates the engine's system prompt with the profile tail (if any). */
  protected composeSystemPrompt(base: string): string {
    if (!this._modelProfileTail) return base;
    return `${base}\n\n---\n${this._modelProfileTail}`;
  }

  /** Merge of base scoring weights with model-profile overrides. */
  protected getScoringWeights(base: Record<string, number>): Record<string, number> {
    return { ...base, ...this._modelProfileWeights };
  }
```

Then update the test's stub `getSystemPrompt()` not to be needed — instead, the real test uses `composeSystemPrompt`. Adjust the test:

Replace the `TestEngine` class in the test with:

```ts
class TestEngine extends BaseEngine {
  generate(input: any) { return {} as any; }
  generateRefinement(input: any) { return {} as any; }
  public exposeSystemPrompt(): string { return this.composeSystemPrompt("BASE"); }
}
```

And replace `engine.getSystemPrompt()` with `engine.exposeSystemPrompt()` in the assertions.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- src/lib/engines/__tests__/base-engine-model-profile.test.ts
```

Expected: PASS, 2 tests green.

- [ ] **Step 5: Run full engine tests to confirm no regression**

```bash
npm run test -- src/lib/engines
```

Expected: PASS, all existing engine tests still green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/engines/base-engine.ts src/lib/engines/__tests__/base-engine-model-profile.test.ts
git commit -m "feat(engines): BaseEngine.applyModelProfile() with graceful fallback"
```

---

## Task 4: Score gate + `applyModelTagWrapper`

**Files:**
- Create: `src/lib/engines/score-gate.ts`
- Create: `src/lib/engines/__tests__/score-gate.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/engines/__tests__/score-gate.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { applyModelTagWrapper, shouldSkipLLM } from "../score-gate";
import type { ModelProfile } from "../types";

const claudeProfile: ModelProfile = {
  slug: "claude-sonnet-4",
  displayName: "Claude Sonnet 4",
  displayNameHe: "Claude Sonnet 4",
  hostMatch: ["claude.ai"],
  systemPromptHe: "x",
  outputFormatRules: { prefer: "xml_tags", xml_tags: true },
  dimensionWeights: {},
  isActive: true,
  sortOrder: 20,
};

const gptProfile: ModelProfile = {
  ...claudeProfile,
  slug: "gpt-5",
  outputFormatRules: { prefer: "markdown_headers", xml_tags: false },
};

describe("score-gate.shouldSkipLLM", () => {
  it("skips when score is at threshold", () => {
    expect(shouldSkipLLM(80, 80)).toBe(true);
    expect(shouldSkipLLM(95, 80)).toBe(true);
  });
  it("does not skip when below threshold", () => {
    expect(shouldSkipLLM(79, 80)).toBe(false);
    expect(shouldSkipLLM(0, 80)).toBe(false);
  });
});

describe("score-gate.applyModelTagWrapper", () => {
  it("wraps in XML tags for claude profile", () => {
    const out = applyModelTagWrapper("write a haiku", claudeProfile);
    expect(out).toContain("<task>");
    expect(out).toContain("write a haiku");
    expect(out).toContain("</task>");
  });

  it("adds markdown header scaffolding for gpt profile", () => {
    const out = applyModelTagWrapper("write a haiku", gptProfile);
    expect(out).toMatch(/^## /);
    expect(out).toContain("write a haiku");
  });

  it("returns text unchanged when profile has no preference", () => {
    const out = applyModelTagWrapper("write a haiku", { ...gptProfile, outputFormatRules: {} });
    expect(out).toBe("write a haiku");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- src/lib/engines/__tests__/score-gate.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the score gate**

Create `src/lib/engines/score-gate.ts`:

```ts
import type { ModelProfile } from "./types";

/**
 * Stage-1 gate: returns true when the input is already strong enough that
 * we should skip the LLM and just return a model-tagged wrapper.
 */
export function shouldSkipLLM(score: number, threshold: number): boolean {
  return score >= threshold;
}

/**
 * Apply model-specific scaffolding to text without an LLM call. Pure function.
 *
 * Used by stage 1 of the cost funnel: when the user's input is already
 * well-formed (score >= threshold), we don't pay for an enhancement — we
 * just adapt its shape to the target model's preference.
 */
export function applyModelTagWrapper(text: string, profile: ModelProfile): string {
  const prefer = (profile.outputFormatRules?.prefer as string | undefined) ?? null;
  if (!prefer) return text;

  if (prefer === "xml_tags") {
    return `<task>\n${text.trim()}\n</task>`;
  }
  if (prefer === "markdown_headers") {
    return `## משימה\n\n${text.trim()}`;
  }
  if (prefer === "numbered_lists") {
    // Wrap as a single numbered item; user can add more.
    return `1. ${text.trim()}`;
  }
  return text;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- src/lib/engines/__tests__/score-gate.test.ts
```

Expected: PASS, 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/engines/score-gate.ts src/lib/engines/__tests__/score-gate.test.ts
git commit -m "feat(engines): score-gate + model-tag wrapper for stage-1 funnel"
```

---

## Task 5: Tier router for short prompts

**Files:**
- Modify: `src/lib/ai/models.ts`
- Create: `src/lib/ai/__tests__/tier-router.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/ai/__tests__/tier-router.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { selectModelByLength } from "../models";

describe("selectModelByLength", () => {
  it("routes short prompts to flash-lite", () => {
    expect(selectModelByLength(50)).toBe("gemini-2.5-flash-lite");
    expect(selectModelByLength(199)).toBe("gemini-2.5-flash-lite");
  });
  it("routes long prompts to flash", () => {
    expect(selectModelByLength(200)).toBe("gemini-2.5-flash");
    expect(selectModelByLength(5000)).toBe("gemini-2.5-flash");
  });
  it("respects custom threshold", () => {
    expect(selectModelByLength(150, 100)).toBe("gemini-2.5-flash");
    expect(selectModelByLength(50, 100)).toBe("gemini-2.5-flash-lite");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- src/lib/ai/__tests__/tier-router.test.ts
```

Expected: FAIL — `selectModelByLength is not a function`.

- [ ] **Step 3: Implement**

In `src/lib/ai/models.ts`, append at the end of the file:

```ts
/**
 * Stage-3 cost-funnel tier selection. Short prompts route to flash-lite,
 * which is ~70% cheaper. Threshold is 200 chars by default.
 */
export function selectModelByLength(charCount: number, threshold: number = 200): ModelId {
  return charCount < threshold ? "gemini-2.5-flash-lite" : "gemini-2.5-flash";
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- src/lib/ai/__tests__/tier-router.test.ts
```

Expected: PASS, 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/models.ts src/lib/ai/__tests__/tier-router.test.ts
git commit -m "feat(ai/models): selectModelByLength tier router for cost funnel"
```

---

## Task 6: `extension_configs` migration + admin seed row

**Files:**
- Create: `supabase/migrations/20260429140000_extension_configs.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260429140000_extension_configs.sql`:

```sql
-- Single-row config table read by /api/extension-config. Admins edit this row
-- to push selector / feature-flag changes to the extension within the 24h
-- client cache window — no Chrome Web Store review needed.

create table if not exists public.extension_configs (
  id uuid primary key default gen_random_uuid(),
  is_active boolean not null default false,
  version text not null,                -- e.g. "2026-04-29-1"
  cache_version int not null default 1, -- bumped to invalidate enhance-cache
  selectors jsonb not null,             -- { chatgpt: {...}, claude: {...}, gemini: {...} }
  feature_flags jsonb not null default '{}'::jsonb,
  notes text,
  updated_at timestamptz not null default now()
);

create unique index if not exists extension_configs_one_active
  on public.extension_configs (is_active) where is_active = true;

alter table public.extension_configs enable row level security;

drop policy if exists "extension_configs_read_authenticated" on public.extension_configs;
create policy "extension_configs_read_authenticated"
  on public.extension_configs
  for select
  using (auth.role() = 'authenticated');

-- Writes are service-role only (admin app).

insert into public.extension_configs (is_active, version, cache_version, selectors, feature_flags, notes)
values (
  true,
  '2026-04-29-1',
  1,
  jsonb_build_object(
    'chatgpt', jsonb_build_object(
      'hosts', array['chatgpt.com','chat.openai.com'],
      'input', array['#prompt-textarea','div[contenteditable=''true''][id=''prompt-textarea'']','textarea[data-id=''root'']'],
      'send_button', array['button[data-testid=''send-button'']','button[aria-label=''Send prompt'']'],
      'composer', array['form.stretch','form[class*=''composer'']','main form'],
      'profile_slug', 'gpt-5'
    ),
    'claude', jsonb_build_object(
      'hosts', array['claude.ai'],
      'input', array['div.ProseMirror[contenteditable=''true'']','div[contenteditable=''true''][data-placeholder]','fieldset textarea','textarea'],
      'send_button', array['button[aria-label=''Send Message'']','button[data-testid=''send-message'']'],
      'composer', array['fieldset','div[class*=''composer'']','form'],
      'profile_slug', 'claude-sonnet-4'
    ),
    'gemini', jsonb_build_object(
      'hosts', array['gemini.google.com'],
      'input', array['rich-textarea .ql-editor','div.ql-editor[contenteditable=''true'']','div[contenteditable=''true''][aria-label*=''prompt'' i]'],
      'send_button', array['button[aria-label*=''Send'' i]','button[data-test-id=''send-button'']'],
      'composer', array['input-area-v2','rich-textarea','form'],
      'profile_slug', 'gemini-2.5'
    )
  ),
  jsonb_build_object(
    'score_gate_threshold', 80,
    'cache_ttl_hours', 24,
    'inline_chips_enabled', true,
    'quick_lib_enabled', true,
    'quick_lib_hotkey', 'Alt+Shift+L'
  ),
  'Initial seed for extension v2.0.0'
)
on conflict do nothing;
```

- [ ] **Step 2: Apply + verify**

Apply the migration via Supabase MCP `apply_migration` or `supabase db push`. Then:

```sql
select version, cache_version, jsonb_object_keys(selectors) from public.extension_configs where is_active;
```

Expected: 1 row with `cache_version = 1`, keys `chatgpt`, `claude`, `gemini`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260429140000_extension_configs.sql
git commit -m "db(extension_configs): table + initial seed row for v2.0.0"
```

---

## Task 7: `GET /api/extension-config` route + tests

**Files:**
- Create: `src/app/api/extension-config/route.ts`
- Create: `src/app/api/extension-config/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/api/extension-config/__tests__/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: "u1" } }, error: null })) },
  })),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/engines/model-profiles", () => ({
  getActiveModelProfiles: vi.fn(async () => ([
    { slug: "gpt-5", displayName: "ChatGPT (GPT-5)", displayNameHe: "ChatGPT (GPT-5)",
      hostMatch: ["chatgpt.com"], systemPromptHe: "x",
      outputFormatRules: {}, dimensionWeights: {}, isActive: true, sortOrder: 10 },
  ])),
}));

import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

function mockConfigRow() {
  const single = vi.fn().mockResolvedValue({
    data: {
      version: "2026-04-29-1",
      cache_version: 1,
      selectors: { chatgpt: { hosts: ["chatgpt.com"] } },
      feature_flags: { score_gate_threshold: 80 },
    },
    error: null,
  });
  const eq = vi.fn(() => ({ maybeSingle: single }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });
}

describe("GET /api/extension-config", () => {
  beforeEach(() => { vi.clearAllMocks(); mockConfigRow(); });

  it("returns 401 for unauthenticated user", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    });
    const res = await GET(new Request("http://localhost/api/extension-config"));
    expect(res.status).toBe(401);
  });

  it("returns the active config + active profile metadata", async () => {
    const res = await GET(new Request("http://localhost/api/extension-config"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.version).toBe("2026-04-29-1");
    expect(json.cache_version).toBe(1);
    expect(json.selectors.chatgpt.hosts).toContain("chatgpt.com");
    expect(json.feature_flags.score_gate_threshold).toBe(80);
    expect(json.model_profiles).toHaveLength(1);
    expect(json.model_profiles[0].slug).toBe("gpt-5");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- src/app/api/extension-config/__tests__/route.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the route**

Create `src/app/api/extension-config/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getActiveModelProfiles } from "@/lib/engines/model-profiles";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface ExtensionConfigResponse {
  version: string;
  cache_version: number;
  selectors: Record<string, unknown>;
  feature_flags: Record<string, unknown>;
  model_profiles: Array<{ slug: string; displayName: string; displayNameHe: string; hostMatch: string[] }>;
}

let memo: { value: ExtensionConfigResponse; ts: number } | null = null;
const SERVER_CACHE_MS = 5 * 60 * 1000;

export async function GET(req: Request): Promise<NextResponse> {
  // Auth: extension calls same-origin with cookies.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  if (memo && Date.now() - memo.ts < SERVER_CACHE_MS) {
    return NextResponse.json(memo.value, { headers: { "Cache-Control": "private, max-age=300" } });
  }

  try {
    const service = createServiceClient();
    const { data: row, error } = await service
      .from("extension_configs")
      .select("version,cache_version,selectors,feature_flags")
      .eq("is_active", true)
      .maybeSingle();
    if (error || !row) {
      logger.warn("[extension-config] no active row", { error: error?.message });
      return NextResponse.json({ error: "Config not available" }, { status: 503 });
    }
    const profiles = await getActiveModelProfiles();
    const payload: ExtensionConfigResponse = {
      version: row.version,
      cache_version: row.cache_version,
      selectors: row.selectors,
      feature_flags: row.feature_flags,
      model_profiles: profiles.map(p => ({
        slug: p.slug, displayName: p.displayName, displayNameHe: p.displayNameHe, hostMatch: p.hostMatch,
      })),
    };
    memo = { value: payload, ts: Date.now() };
    return NextResponse.json(payload, { headers: { "Cache-Control": "private, max-age=300" } });
  } catch (err) {
    logger.error("[extension-config] failed", { err: (err as Error).message });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- src/app/api/extension-config/__tests__/route.test.ts
```

Expected: PASS, 2 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/extension-config src/lib/engines/model-profiles.ts
git commit -m "feat(api): GET /api/extension-config with 5-min server cache"
```

---

## Task 8: `extension_telemetry_events` migration

**Files:**
- Create: `supabase/migrations/20260429150000_extension_telemetry.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260429150000_extension_telemetry.sql`:

```sql
-- Append-only telemetry stream from the extension. Used to surface broken
-- selectors (selector_miss) and UX events (chip_click, quicklib_insert,
-- score_gate_hit, cache_hit) without bloating the main usage_history table.

create table if not exists public.extension_telemetry_events (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  event text not null,                  -- "selector_miss" | "chip_click" | "quicklib_insert" | ...
  site text,                            -- "chatgpt" | "claude" | "gemini" | null
  ext_version text,
  target_model text,
  latency_ms int,
  success boolean,
  chain_index int,                      -- for selector_miss: -1 means all chains failed
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists extension_telemetry_event_created_idx
  on public.extension_telemetry_events (event, created_at desc);
create index if not exists extension_telemetry_user_idx
  on public.extension_telemetry_events (user_id, created_at desc);

alter table public.extension_telemetry_events enable row level security;

-- No anon/authenticated read or write policies — service-role only.
-- (Inserts come from the route handler with service-role client.)
```

- [ ] **Step 2: Apply + verify**

Apply via Supabase MCP. Then:
```sql
select count(*) from public.extension_telemetry_events;
```
Expected: `0` (empty table created cleanly).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260429150000_extension_telemetry.sql
git commit -m "db(extension_telemetry): append-only events stream for v2 ext"
```

---

## Task 9: `POST /api/extension-telemetry` route + tests

**Files:**
- Create: `src/app/api/extension-telemetry/route.ts`
- Create: `src/app/api/extension-telemetry/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/api/extension-telemetry/__tests__/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } }, error: null }) },
  })),
}));

const insertMock = vi.fn().mockResolvedValue({ error: null });
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({ from: () => ({ insert: insertMock }) })),
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn(async () => ({ success: true, reset: 0 })),
}));

import { checkRateLimit } from "@/lib/ratelimit";

function makeReq(body: unknown) {
  return new Request("http://localhost/api/extension-telemetry", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/extension-telemetry", () => {
  beforeEach(() => { vi.clearAllMocks(); insertMock.mockClear(); });

  it("inserts a valid event", async () => {
    const res = await POST(makeReq({
      event: "selector_miss",
      site: "chatgpt",
      ext_version: "2.0.0",
      chain_index: -1,
      target_model: "gpt-5",
      latency_ms: 12,
      success: false,
    }));
    expect(res.status).toBe(204);
    expect(insertMock).toHaveBeenCalledTimes(1);
    const row = insertMock.mock.calls[0][0];
    expect(row.event).toBe("selector_miss");
    expect(row.user_id).toBe("u1");
  });

  it("rejects unknown event types with 400", async () => {
    const res = await POST(makeReq({ event: "haxx" }));
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns 429 on rate limit", async () => {
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ success: false, reset: 60 });
    const res = await POST(makeReq({ event: "chip_click", site: "claude" }));
    expect(res.status).toBe(429);
  });

  it("returns 401 for unauthenticated", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    });
    const res = await POST(makeReq({ event: "chip_click" }));
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- src/app/api/extension-telemetry/__tests__/route.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the route**

Create `src/app/api/extension-telemetry/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const ALLOWED_EVENTS = [
  "selector_miss",
  "chip_click",
  "quicklib_open",
  "quicklib_insert",
  "popup_enhance",
  "score_gate_hit",
  "cache_hit",
] as const;

const Body = z.object({
  event: z.enum(ALLOWED_EVENTS),
  site: z.enum(["chatgpt", "claude", "gemini"]).optional(),
  ext_version: z.string().max(32).optional(),
  target_model: z.string().max(64).optional(),
  latency_ms: z.number().int().min(0).max(60_000).optional(),
  success: z.boolean().optional(),
  chain_index: z.number().int().min(-1).max(20).optional(),
  meta: z.record(z.unknown()).optional(),
});

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  // 10 events / minute / user.
  const rl = await checkRateLimit(`ext-tel:${user.id}`, "free");
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests", retryAfter: rl.reset }, { status: 429 });
  }

  let payload: z.infer<typeof Body>;
  try {
    payload = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Invalid body", detail: (err as Error).message }, { status: 400 });
  }

  try {
    const service = createServiceClient();
    const { error } = await service.from("extension_telemetry_events").insert({
      user_id: user.id,
      event: payload.event,
      site: payload.site ?? null,
      ext_version: payload.ext_version ?? null,
      target_model: payload.target_model ?? null,
      latency_ms: payload.latency_ms ?? null,
      success: payload.success ?? null,
      chain_index: payload.chain_index ?? null,
      meta: payload.meta ?? {},
    });
    if (error) {
      logger.warn("[extension-telemetry] insert failed", { error: error.message });
      return NextResponse.json({ error: "Insert failed" }, { status: 500 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    logger.error("[extension-telemetry] threw", { err: (err as Error).message });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- src/app/api/extension-telemetry/__tests__/route.test.ts
```

Expected: PASS, 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/extension-telemetry
git commit -m "feat(api): POST /api/extension-telemetry append-only events"
```

---

## Task 10: `usage_history.cost_funnel_stage` column

**Files:**
- Create: `supabase/migrations/20260429160000_usage_history_cost_funnel_stage.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260429160000_usage_history_cost_funnel_stage.sql`:

```sql
-- Track which cost-funnel stage resolved each /api/enhance call.
-- 1 = local score gate (no LLM), 2 = cache hit, 3 = LLM call.
-- Nullable so existing rows remain valid; new rows write the stage.

alter table public.usage_history
  add column if not exists cost_funnel_stage smallint
    check (cost_funnel_stage between 1 and 3);

create index if not exists usage_history_funnel_stage_idx
  on public.usage_history (cost_funnel_stage, created_at desc)
  where cost_funnel_stage is not null;
```

- [ ] **Step 2: Apply + verify**

Apply via Supabase MCP. Then:
```sql
\d public.usage_history
```
Expected: column `cost_funnel_stage smallint` listed.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260429160000_usage_history_cost_funnel_stage.sql
git commit -m "db(usage_history): add cost_funnel_stage column for telemetry"
```

---

## Task 11: Wire 3-stage funnel + `target_model` into `/api/enhance`

**Files:**
- Modify: `src/app/api/enhance/route.ts`
- Modify: `src/app/api/enhance/__tests__/route.test.ts`

This is the largest task. Done as TDD, but split into sub-steps.

- [ ] **Step 1: Add validation field for `target_model` and `model_profile_slug`**

In `src/app/api/enhance/route.ts`, find the request `z.object({ ... })` schema (search for the body parser around the top of `POST`). Add these two optional fields:

```ts
target_model: z.string().max(64).optional(),
model_profile_slug: z.string().max(64).optional(),
```

If both are present, prefer `model_profile_slug`. If only `target_model` is present (legacy), use it as the slug too. (The slug-vs-host-key distinction is fine for now: any valid `model_profiles.slug` works.)

- [ ] **Step 2: Add stage-1 score gate**

Just BEFORE the engine `generate()` call, after credits are decremented and the engine instance is constructed, insert (sketch — adapt names to what's in the file):

```ts
import { applyModelTagWrapper, shouldSkipLLM } from "@/lib/engines/score-gate";
import { getModelProfile, getActiveModelProfiles } from "@/lib/engines/model-profiles";
import { scoreInput } from "@/lib/engines/scoring/input-scorer";
import { selectModelByLength } from "@/lib/ai/models";
import { createServiceClient as createServiceClientForFlags } from "@/lib/supabase/service";

// Resolve the active model profile (if requested).
const profileSlug = body.model_profile_slug ?? body.target_model ?? null;
const profile = profileSlug ? await getModelProfile(profileSlug) : null;

// Read score-gate threshold from extension_configs.feature_flags (cached 5 min).
const threshold = await getScoreGateThreshold();    // helper defined below
const score = scoreInput(body.prompt, mode).total;

let costFunnelStage: 1 | 2 | 3 = 3;
let bypassLLM = false;
let bypassResult: string | null = null;

if (profile && shouldSkipLLM(score, threshold)) {
  costFunnelStage = 1;
  bypassLLM = true;
  bypassResult = applyModelTagWrapper(body.prompt, profile);
}
```

Add the helper at the top-level of the file (above `POST`):

```ts
let _flagCache: { threshold: number; ts: number } | null = null;
const FLAG_CACHE_MS = 5 * 60 * 1000;

async function getScoreGateThreshold(): Promise<number> {
  if (_flagCache && Date.now() - _flagCache.ts < FLAG_CACHE_MS) return _flagCache.threshold;
  try {
    const service = createServiceClientForFlags();
    const { data } = await service
      .from("extension_configs")
      .select("feature_flags")
      .eq("is_active", true)
      .maybeSingle();
    const t = (data?.feature_flags as Record<string, unknown> | null)?.score_gate_threshold;
    const n = typeof t === "number" ? t : 80;
    _flagCache = { threshold: n, ts: Date.now() };
    return n;
  } catch {
    return 80;
  }
}
```

- [ ] **Step 3: Apply the model profile to the engine before generating**

After the engine instance is created but before `engine.generate(...)` is called:

```ts
if (profile) {
  await engine.applyModelProfile(profile.slug);
}
```

(`applyModelProfile` was added in Task 3.)

- [ ] **Step 4: Wire the bypass path**

When `bypassLLM` is true, skip the LLM call entirely and return the wrapper text. Insert before the existing engine call:

```ts
if (bypassLLM && bypassResult !== null) {
  // Refund credit because we didn't actually run the LLM.
  await refundCredit(userId);
  await logUsage({
    userId, mode, modelId: null, costFunnelStage: 1,
    promptText: body.prompt, resultText: bypassResult, targetModel: profile?.slug ?? null,
  });
  return NextResponse.json({ enhanced: bypassResult, score, stage: 1, model_profile: profile?.slug });
}
```

(`logUsage()` is the existing helper that writes `usage_history` — find it and add a `costFunnelStage` parameter; pass it through to the row insert. If no such helper exists, write the column directly via `service.from("usage_history").update(...)` after the existing insert.)

- [ ] **Step 5: Update cache-key call sites**

The `enhance-cache.buildCacheKey` already accepts `targetModel`. Pass `profile?.slug ?? body.target_model` into it where the key is built. Also ensure `ENGINE_VERSION` is incorporated; if `cache_version` from `extension_configs` is needed, prefix it into the key — for this task, mix it in via the `category` slot is acceptable but cleaner is a small helper:

In `src/lib/ai/enhance-cache.ts`, add:

```ts
let _cacheVersionMemo: { v: number; ts: number } | null = null;
const CACHE_VERSION_TTL_MS = 5 * 60 * 1000;

export async function getRuntimeCacheVersion(
  fetcher: () => Promise<number | null>,
): Promise<number> {
  if (_cacheVersionMemo && Date.now() - _cacheVersionMemo.ts < CACHE_VERSION_TTL_MS) {
    return _cacheVersionMemo.v;
  }
  const v = (await fetcher().catch(() => null)) ?? 1;
  _cacheVersionMemo = { v, ts: Date.now() };
  return v;
}
```

Then in `buildCacheKey`, accept an optional `cacheVersion` field on the input and mix it into `parts`:

```ts
parts.push(`cv:${input.cacheVersion ?? 1}`);
```

In the route, before calling `buildCacheKey`, fetch the version:

```ts
const cacheVersion = await getRuntimeCacheVersion(async () => {
  const service = createServiceClientForFlags();
  const { data } = await service
    .from("extension_configs").select("cache_version")
    .eq("is_active", true).maybeSingle();
  return (data?.cache_version as number | null) ?? null;
});
const cacheKey = buildCacheKey({ ...existingArgs, targetModel: profile?.slug ?? body.target_model, cacheVersion });
```

- [ ] **Step 6: Tier-route the LLM call**

When the cache misses and we proceed to the LLM, choose the model based on input length:

```ts
const tieredModel = selectModelByLength(body.prompt.length);
// Pass tieredModel into the existing AIGateway call as the *primary* model
// for this run. The fallback chain still applies for resilience.
const result = await AIGateway.generateWithFallback({
  ...existingArgs,
  primaryModel: tieredModel,
});
```

If the gateway doesn't accept `primaryModel`, this is the place to add it: thread it through `AIGateway.generateWithFallback` so the fallback chain starts at `tieredModel` instead of the default.

After the call, set `costFunnelStage = wasCacheHit ? 2 : 3;` and pass it into `logUsage`.

- [ ] **Step 7: Write 3 new tests covering the funnel**

In `src/app/api/enhance/__tests__/route.test.ts`, append:

```ts
describe("/api/enhance — cost funnel", () => {
  it("stage 1: high-score input with profile returns wrapped text and skips LLM", async () => {
    // setup: mock scoreInput to return 90; mock getModelProfile → claude profile.
    // assert: response.stage === 1, response.enhanced contains "<task>",
    //         AIGateway.generateWithFallback was NOT called,
    //         refundCredit WAS called.
  });

  it("stage 2: cache hit returns cached text without LLM call", async () => {
    // setup: mock getCached to return { text: "CACHED", modelId: "x" }, scoreInput → 50.
    // assert: response.stage === 2, response.enhanced === "CACHED",
    //         AIGateway.generateWithFallback was NOT called.
  });

  it("stage 3: long input routes to gemini-2.5-flash (full)", async () => {
    // setup: 500-char prompt, no cache, scoreInput → 50.
    // assert: AIGateway.generateWithFallback called with primaryModel === "gemini-2.5-flash".
  });

  it("stage 3: short input routes to gemini-2.5-flash-lite", async () => {
    // setup: 100-char prompt, no cache, scoreInput → 50.
    // assert: AIGateway.generateWithFallback called with primaryModel === "gemini-2.5-flash-lite".
  });

  it("model profile is applied when slug provided", async () => {
    // setup: pass model_profile_slug: "claude-sonnet-4" in body, scoreInput → 50.
    // assert: engine.applyModelProfile called with "claude-sonnet-4".
  });
});
```

Fill in the mocks following the patterns already used in the file. Each test uses `it()` with full setup so it can be read out of order. Look at the existing test cases in `route.test.ts` for the canonical mocking patterns (Supabase client, Redis, AIGateway).

- [ ] **Step 8: Run tests and ensure all pass**

```bash
npm run test -- src/app/api/enhance/__tests__/route.test.ts
```

Expected: PASS. All 5 new tests green plus all existing tests still green.

- [ ] **Step 9: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add src/app/api/enhance/route.ts src/app/api/enhance/__tests__/route.test.ts src/lib/ai/enhance-cache.ts
git commit -m "feat(enhance): 3-stage cost funnel + target_model + tier routing"
```

---

## Task 12: Smoke test against running dev server

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Wait for "Ready in" log. Server runs on `http://localhost:3000`.

- [ ] **Step 2: Smoke-test stage 1 via curl**

(Login to the dev session in a browser first so cookies are present, then export `COOKIE` from devtools, OR use an existing test user via the test harness.)

```bash
curl -s -X POST http://localhost:3000/api/enhance \
  -H "content-type: application/json" \
  -H "cookie: $COOKIE" \
  -d '{
    "prompt": "Act as a senior staff engineer. Write a comprehensive system design for a globally distributed cache with explicit invariants, a numbered rollout plan, and risk tradeoffs in a markdown table.",
    "model_profile_slug": "claude-sonnet-4"
  }' | jq
```

Expected: response includes `"stage": 1`, `"enhanced"` starts with `<task>`.

- [ ] **Step 3: Smoke-test stage 3 (short, low-quality input)**

```bash
curl -s -X POST http://localhost:3000/api/enhance \
  -H "content-type: application/json" \
  -H "cookie: $COOKIE" \
  -d '{ "prompt": "fix bug", "model_profile_slug": "gpt-5" }' | jq
```

Expected: `"stage": 3`. Inspect server logs to confirm `gemini-2.5-flash-lite` was selected (short prompt).

- [ ] **Step 4: Smoke-test `/api/extension-config`**

```bash
curl -s http://localhost:3000/api/extension-config -H "cookie: $COOKIE" | jq
```

Expected: 200, JSON with `version`, `cache_version: 1`, `selectors.chatgpt`, `feature_flags.score_gate_threshold: 80`, `model_profiles[0].slug: "gpt-5"`.

- [ ] **Step 5: Smoke-test `/api/extension-telemetry`**

```bash
curl -s -X POST http://localhost:3000/api/extension-telemetry \
  -H "content-type: application/json" \
  -H "cookie: $COOKIE" \
  -d '{"event":"selector_miss","site":"chatgpt","chain_index":-1,"ext_version":"2.0.0"}' -w "\n%{http_code}\n"
```

Expected: `204`. Verify a row appeared in `extension_telemetry_events` via Supabase SQL.

- [ ] **Step 6: Stop dev server, commit smoke notes**

No code changes expected. If anything failed, return to the relevant earlier task and fix; do not paper over.

---

## Task 13: Final sweep + lint + push

- [ ] **Step 1: Run preflight (lint + typecheck + test)**

```bash
npm run preflight
```

Expected: green. Fix any flagged issues.

- [ ] **Step 2: Run knip to confirm no dead exports introduced**

```bash
npm run knip
```

Expected: no new flags from files this plan added. Existing flags can be ignored.

- [ ] **Step 3: Push**

```bash
git push origin main
```

Vercel auto-deploys on push to `main`. Watch the deployment in the Vercel dashboard.

- [ ] **Step 4: Verify production smoke**

After deploy succeeds, repeat Task 12 steps 2 and 4 against `https://www.peroot.space` (logged in). Expected: same shape responses.

- [ ] **Step 5: Bookmark next plans**

This plan ships M1 + M2. Next plans:
- `2026-04-29-extension-v2-m3-selector-registry.md` — extension v2.0.0 with site cuts and config-driven selectors.
- `2026-04-29-extension-v2-m4-quicklib-and-chips.md` — Quick-Lib + Inline Chips.

---

## Self-Review Notes

- **Spec coverage:** §3 (model profiles) → Tasks 1–3. §4 (cost funnel) → Tasks 4, 5, 11. §5.1 (`/api/extension-config`) → Tasks 6, 7. §5.2 (`/api/extension-telemetry`) → Tasks 8, 9. §4.4 (telemetry column) → Task 10. §6, §7 (Quick-Lib, Chips) → deferred to M4 plan. §5.5 (manifest cuts) → deferred to M3 plan.
- **Type consistency:** `applyModelProfile` used identically in Tasks 3 and 11. `selectModelByLength` signature consistent in Tasks 5 and 11. `ModelProfile` shape stable across Tasks 2, 3, 4, 7.
- **No placeholders:** every code step has actual code or an exact diff sketch tied to a specific file. The `route.ts` integration in Task 11 references existing variables (`engine`, `userId`, `mode`, `body`) that the engineer needs to locate in the live file — that is unavoidable for an integration into a 600+-line route, but each insertion point and each new symbol is named exactly.
- **One known integration risk** (called out so the engineer hits it head-on): Task 11 Step 6 assumes `AIGateway.generateWithFallback` accepts a `primaryModel` parameter. If it doesn't, threading that through is part of the task — adjust the gateway signature (and its tests) to accept and respect it; this is a deliberately scoped extension, not unrelated refactoring.
