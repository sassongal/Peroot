# Peroot Extension v2 — Model-Aware Productivity Upgrade

**Date:** 2026-04-29
**Status:** Design approved (brainstorming complete) — ready for implementation plan
**Author:** Gal Sasson + Claude
**Supersedes:** `docs/plans/2026-03-11-chrome-extension-design.md` (v1.x)

---

## 1. Goals

Upgrade the existing Chrome extension (`chrome-extension-v2.1/`, currently v1.3.0) into a **ready-to-ship v2** that is:

- **Model-aware** — auto-detects the AI host site and tailors enhancements per target model (GPT-5, Claude Sonnet 4, Gemini 2.5), with manual override.
- **Smart and cheap** — a 3-stage cost funnel (local score gate → cache → tier-routed model) cuts API spend without quality loss.
- **Less broken** — drops the long-tail sites (Mistral, Minimaxi, Poe, Grok, Copilot, DeepSeek, Perplexity), keeps top 3, and moves all DOM selectors to a server-driven registry that can hot-fix without a Chrome Web Store review.
- **More productive for clients** — adds a Quick-Library picker (`Alt+Shift+L`) and inline rewrite chips above the AI site's composer.

Non-goals are listed in §9.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Extension (chrome-extension-v2.1/, repurposed → v2.x)  │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Popup   │  │ Content      │  │ Service Worker   │   │
│  │  (lib +  │  │  - injector  │  │ (auth, config    │   │
│  │  enhance)│  │  - chips     │  │  cache, alarms)  │   │
│  └──────────┘  │  - quick-lib │  └──────────────────┘   │
│                └──────────────┘                          │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTPS (cookie auth, same-origin)
                   ▼
┌─────────────────────────────────────────────────────────┐
│  peroot.space (Next.js)                                 │
│  /api/enhance            ← extended (target_model)      │
│  /api/extension-config   ← NEW (selectors + flags)      │
│  /api/extension-telemetry ← NEW (selector misses, ux)   │
│  /api/extension-token    ← exists (unchanged)           │
│  /api/personal-library   ← exists (used by Quick-Lib)   │
└──────────────────┬──────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────┐
│  Engine layer (lib/engines/)                            │
│  BaseEngine + new applyModelProfile() mixin             │
│  Profiles: gpt-5, claude-sonnet-4, gemini-2.5           │
│           (image/video profiles deferred to v2.2)       │
└─────────────────────────────────────────────────────────┘
```

**Sites supported in v2:** ChatGPT (`chatgpt.com`, `chat.openai.com`), Claude (`claude.ai`), Gemini (`gemini.google.com`). Plus `peroot.space` for auth sync.

---

## 3. Model Profiles

### 3.1 Schema

New table `public.model_profiles` (migration `20260429120000_model_profiles.sql`):

```sql
create table public.model_profiles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,            -- 'gpt-5', 'claude-sonnet-4', 'gemini-2.5'
  display_name text not null,
  display_name_he text not null,
  host_match text[] not null,           -- ['chatgpt.com','chat.openai.com']
  system_prompt_he text not null,
  output_format_rules jsonb not null,   -- { prefer, max_length, xml_tags, ... }
  dimension_weights jsonb not null,     -- override BaseEngine 10-dim weights
  is_active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.model_profiles enable row level security;

create policy "model_profiles_read_authenticated"
  on public.model_profiles for select
  using (auth.role() = 'authenticated');
-- writes: admin only via service-role client (no anon write policy).
```

### 3.2 Seeded Profiles (Day 1)

| slug | system prompt theme (HE) | `output_format_rules` |
|---|---|---|
| `gpt-5` | "צור פלט מובנה ב-Markdown עם כותרות ברורות. השתמש ברשימות ממוספרות לשלבים." | `{ prefer: 'markdown_headers', xml_tags: false }` |
| `claude-sonnet-4` | "עטוף קטעים מובנים בתגיות `<context>`, `<task>`, `<constraints>`. הסבר את ההיגיון." | `{ prefer: 'xml_tags', xml_tags: true }` |
| `gemini-2.5` | "פתח עם תפקיד ומטרה מפורשים. השתמש בנקודות תמציתיות. הגדר פורמט פלט מראש." | `{ prefer: 'numbered_lists', xml_tags: false }` |

### 3.3 Engine Integration

`src/lib/engines/base-engine.ts` gains:

- New optional engine input field: `targetModel?: string`.
- New method `applyModelProfile(slug: string): Promise<void>` — loads profile from `PromptManager` (5-min cache), merges `system_prompt_he` as the final layer of the engine's system prompt, replaces the run's scoring weights with `dimension_weights`.
- **Graceful fallback:** profile not found → log warning, run unchanged. No error surfaced to user.

### 3.4 Auto-Detect & Override

- Content script reads `extension-config.selectors.<site>.profile_slug` to set the default.
- Popup/panel always shows: `🎯 משדרג עבור: ChatGPT (GPT-5) [שנה ▼]`.
- Override dropdown lists all `is_active` profiles. Last manual override is stored per-site in `chrome.storage.local` under `peroot.target_model_override.<host>`.

---

## 4. Cost Funnel

`/api/enhance` runs three stages before the AI gateway:

```
Stage 1: Local Score Gate
   score = computePromptScore(input)            // existing prompt-dimensions.ts
   if score >= flag.score_gate_threshold (80):
     return applyModelTagWrapper(input, profile)  // $0
Stage 2: Cache Lookup
   key = sha256(input + target_model + tone + lang + score_bucket + cache_version)
   if cache_hit: return cached                    // $0
Stage 3: Tier-Routed LLM Call
   if len(input) < 200: route → gemini-2.5-flash-lite
   else:                route → gemini-2.5-flash
   write result to cache (TTL 24h)
```

### 4.1 Stage 1 — Local Score Gate

- Reuses `src/lib/engines/scoring/prompt-dimensions.ts` (already exists, <5ms).
- New helper `applyModelTagWrapper(text: string, profile: ModelProfile): string` — applies model-appropriate scaffolding (e.g., wraps in `<context>...<task>...` for Claude). Pure function, zero LLM call.
- Threshold (`80` default) is config-driven: `extension_configs.feature_flags.score_gate_threshold`.

### 4.2 Stage 2 — Cache

- Extends `src/lib/ai/enhance-cache.ts`.
- Key: `enhance:v2:${sha256(input + target_model + tone + lang + score_bucket + cache_version)}`.
- TTL: 24h (configurable). Bypass with `?nocache=1`.
- `cache_version` lives on `extension_configs` so an admin can globally invalidate after profile changes.

### 4.3 Stage 3 — Tier-Routed Call

- New task in `src/lib/ai/models.ts`: `enhance_short` → primary `gemini-2.5-flash-lite`, fallback `gemini-2.5-flash`. Long inputs unchanged.

### 4.4 Telemetry

- Add nullable column `cost_funnel_stage smallint` to existing `usage_history` table.
- Each request logs `{ stage_resolved, target_model, tokens_saved_estimate, latency_ms }`.
- Admin tile: "Funnel hit rate this week: x% stage-1, y% stage-2, z% stage-3 → est. saved $N."

---

## 5. Resilience & Selector Registry

### 5.1 New Endpoint — `GET /api/extension-config`

Response:

```ts
{
  version: "2026-04-29-1",
  cached_until: "2026-04-30T12:00Z",
  cache_version: 1,
  selectors: {
    chatgpt: {
      hosts: ["chatgpt.com", "chat.openai.com"],
      input: ["#prompt-textarea", "div[contenteditable='true'][id='prompt-textarea']", "textarea[data-id='root']"],
      send_button: ["button[data-testid='send-button']", "button[aria-label='Send prompt']"],
      composer: ["form.stretch", "form[class*='composer']", "main form"],
      profile_slug: "gpt-5"
    },
    claude:  { /* same shape */ profile_slug: "claude-sonnet-4" },
    gemini:  { /* same shape */ profile_slug: "gemini-2.5"  }
  },
  feature_flags: {
    score_gate_threshold: 80,
    cache_ttl_hours: 24,
    inline_chips_enabled: true,
    quick_lib_enabled: true,
    quick_lib_hotkey: "Alt+Shift+L"
  },
  model_profiles: [ /* slug, display_name_he, host_match — for the override dropdown */ ]
}
```

Backed by a new single-row admin-editable `extension_configs` table; endpoint reads with 5-min server cache.

### 5.2 New Endpoint — `POST /api/extension-telemetry`

Append-only, rate-limited (10/min/user). Logs:

```ts
{ event: "selector_miss" | "chip_click" | "quicklib_insert" | "score_gate_hit",
  site, ext_version, target_model, latency_ms, success, chain_index? }
```

Stored in `extension_telemetry_events`. Admin dashboard surfaces top broken sites within hours.

### 5.3 Client Behavior

- Service worker on install + every `chrome.alarms` 24h tick: `fetch /api/extension-config` → store in `chrome.storage.local`.
- Content scripts read from storage on every page load — zero network on hot path.
- Options page has a "Refresh config now" button that posts a message to the service worker.

### 5.4 Selector Chains with Graceful Degradation

```js
function resolveSelector(chain) {
  for (const sel of chain) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}
// All-null → POST /api/extension-telemetry { event: "selector_miss", chain_index: -1 }
// → fall back: skip injection. Popup (Alt+P) still works.
```

### 5.5 Manifest Cuts (v2.0.0)

Remove `host_permissions` and `content_scripts` matches for: `chat.deepseek.com`, `www.perplexity.ai`, `chat.mistral.ai`, `www.minimaxi.com`, `grok.com`, `x.com/i/grok*`, `copilot.microsoft.com`, `poe.com`. Keep: `chatgpt.com`, `chat.openai.com`, `claude.ai`, `gemini.google.com`, `peroot.space` (+ Supabase host for auth).

---

## 6. Quick-Library Picker (M4)

**Trigger:** `Alt+Shift+L` on any of the 3 supported AI sites (hotkey configurable).

**UX:**
- Centered modal overlay (380×480), dark theme, RTL Hebrew, blurs background.
- Top: search input with autofocus; fuzzy match across `name + tags + content snippet`.
- List: top 20 results, scored by `recency × match_quality`. Each row: title (Alef bold), 2-line preview, tag chips, last-used timestamp.
- Keyboard: `↑/↓` navigate, `Enter` insert into focused field, `Esc` close.
- Click row → fill the AI site's input via the existing `setInputText()` helpers in `ai-chat-injector.js`.

**Data flow:**
- On open: `GET /api/personal-library?limit=200&fields=id,name,content,tags,updated_at`.
- Cache results in `chrome.storage.session` for 5 min so re-opens are instant.
- Local fuzzy search (Fuse.js or hand-rolled, decided in implementation).

**New files:** `chrome-extension-v2.1/content/quick-lib.js` + `quick-lib.css`.

---

## 7. Inline Rewrite Chips (M4)

**Trigger:** User types ≥30 chars into the AI site's composer and pauses 600ms (debounced) → 3 chips fade in above the composer:

```
┌─────────────────────────────────────┐
│ [✨ שדרג]  [🎯 ממוקד יותר]  [🌐 EN] │
├─────────────────────────────────────┤
│ < user is typing here >             │
└─────────────────────────────────────┘
```

**Behavior:**

| Chip | Action |
|---|---|
| `✨ שדרג` | `POST /api/enhance` with `target_model` from auto-detect → stream → replace text in-place (200ms fade). |
| `🎯 ממוקד יותר` | Same, plus `tone: "concise"` and an extra system prompt: "Make this 40% shorter while keeping all key info." |
| `🌐 EN` | Same, plus `output_language: "english"`. |

- During call: chip shows spinner; others disabled.
- On error: chip turns red 2s with native tooltip; original text untouched.
- Undo: `Ctrl+Z` after replace restores original (cached pre-enhance text in `window.__perootLastInput`).

**Config-gated:** `feature_flags.inline_chips_enabled` — kill switch from server.

**New files:** `chrome-extension-v2.1/content/inline-chips.js` + `inline-chips.css`.

---

## 8. Cross-Cutting

### 8.1 Auth & Errors

- All API calls are same-origin to `peroot.space` with `credentials: "include"` (cookie auth, unchanged from v1.x).
- `401` → message "התחבר ל-Peroot" + deep-link to `peroot.space/login?from=ext`.
- `429` → "השדרוג זמין שוב בעוד {n}s" with countdown.
- `5xx` → "השרת לא זמין כרגע, נסה שוב" + retry button.

### 8.2 Telemetry Events

All UX events log to `/api/extension-telemetry`: `chip_click`, `quicklib_open`, `quicklib_insert`, `popup_enhance`, `selector_miss`, `score_gate_hit`, `cache_hit`.

### 8.3 Testing

- **Unit (Vitest):** model-profile loader, `applyModelTagWrapper`, score gate threshold logic, cache key generation, selector resolver fallback chain.
- **Integration:** `/api/enhance` with `target_model` (extends `route.test.ts`); `/api/extension-config` shape; `/api/extension-telemetry` rate limit.
- **Manual smoke checklist** (per site: ChatGPT, Claude, Gemini): page load → auto-detect → popup enhance → inline chip → quick-lib insert → 401 path → simulated broken-selector path.

---

## 9. Out of Scope

- Firefox / Safari / Edge ports.
- Per-conversation context capture (re-evaluate in v2.2 once selectors prove stable).
- Image / Video model profiles (Midjourney, Sora, DALL·E) — schema supports them; seed in v2.2.
- Voice input.
- Team / org-shared library views.
- New auth flow — keeps cookie-based same-origin auth as today.

---

## 10. Rollout

| # | Scope | Independently shippable? |
|---|---|---|
| **M1** | DB: `model_profiles` table + 3 seeded profiles. `extension_configs` table + initial row. RLS + admin write path. | Yes — invisible. |
| **M2** | API: `/api/enhance` accepts `target_model` + cost funnel. New `/api/extension-config` and `/api/extension-telemetry`. | Yes — web UI gains target-model dropdown. |
| **M3** | Extension v2.0.0: drop long-tail sites, config-driven selector registry, auto-detect + override, telemetry beacon, score-gate UI hint. | Yes — Web Store update. |
| **M4** | Extension v2.1.0: Quick-Lib + Inline Chips. | Yes — separate Web Store update so M3 can stabilize first. |

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| Chrome Web Store review (3–7 days) blocks hot-fixes | Selectors live in `/api/extension-config` — fixable without a Store update. |
| Score-gate threshold (80) wrong for user base | Server-side feature flag; tune from telemetry within hours. |
| Profiles diverge from reality as models change | Admin-editable; add "last tested with model version" note. |
| Cache returns stale answers if profile changes | Cache key includes `target_model` slug + `cache_version`. Admin "Bump cache version" button bumps `extension_configs.cache_version`. |
| Inline chips clash with site's native autocomplete | Debounce 600ms + `pointer-events: none` on autocomplete area when chip menu hovered. Kill-switch flag. |
| v1.3.0 users on long-tail sites lose support | Release notes: "Now focusing on top 3 platforms — popup still works on any site." Quick-Lib still works everywhere via popup. |

---

## 12. Success Criteria

- Cost funnel resolves ≥ 50% of requests at stage 1 or 2 within 2 weeks of M2 ship.
- Selector-miss telemetry < 1% of injections within 1 week of M3 ship.
- ≥ 30% of authenticated extension users use Quick-Lib weekly within 2 weeks of M4.
- Zero regressions in `/api/enhance` for non-extension callers (existing tests stay green).
