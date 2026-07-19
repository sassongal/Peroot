# Graphify Integration + Memory Palace Graph Upgrade — Design

**Date:** 2026-07-19
**Author:** Gal Sasson (with Claude)
**Status:** Approved for planning
**Branch:** `feat/graphify-integration-and-graph-upgrade`

---

## 1. Summary

Two related but independent tracks:

- **Track A — Dev-time.** Register the whole `Prut/web` app inside [graphify](https://github.com/Graphify-Labs/graphify) so coding agents (Claude Code, Cursor, the `.agent/` Antigravity kit) can query the codebase as a knowledge graph instead of grepping. Keep it fresh automatically.
- **Track B — Product.** Upgrade Peroot's own runtime graph (the Memory Palace / personal-library graph in `graph-utils.ts`) using the algorithmic methods graphify demonstrates: modularity-based clustering, centrality ("hub") insight, graphify-style visual encoding + search, semantic embeddings, and a GraphRAG retrieval seam.

**Non-negotiable constraint:** the app must behave **exactly as it does today** after every phase. Each upgrade ships behind a graceful fallback (feature flag or capability probe) so the current lexical/union-find/color-by-capability behavior remains the default until the replacement is proven at parity or better. No phase is "done" until existing tests pass and the relevant surface is verified in the browser.

---

## 2. Goals & Non-Goals

### Goals
- Agents can answer "how does X work / what connects to Y" from a live codebase graph, auto-refreshed on commit.
- Peroot's prompt graph produces genuinely topical clusters (not one giant blob) as libraries grow.
- Users get a new "hub prompts" insight and a graphify-style visual (size-by-importance, color-by-cluster) rendered inside Peroot's obsidian+gold design system.
- Prompt similarity understands *meaning* (semantic embeddings), including across Hebrew/English.
- A clean, documented retrieval API exists for future GraphRAG features.

### Non-Goals (YAGNI / explicitly deferred)
- **No** wiring GraphRAG into the improve pipeline, engines, or credit system in this build (retrieval API only — decided).
- **No** rainbow/community palette that violates the One-Gold / Cool-Neutral rules — we adopt graphify's *method*, not its literal colors.
- **No** rewrite of `PromptGraphView.tsx`; new logic lives in `graph-utils.ts` and small hooks.
- **No** graph-traversal-query or command-palette search in this build (in-graph node search only — decided).

---

## 3. Track A — Agent-queryable codebase graph (Phase 0)

### 3.1 Scope of the graph
- **Included:** all code under `Prut/web/src` + curated docs (`docs/`, `.agent/` rules, `CONTEXT.md`, `docs/adr/`).
- **Excluded:** `public/` static images (160 marketing PNGs — no graph value), `node_modules`, build output, `.next`.
- **Extraction mode:** AST (tree-sitter) as the always-fresh base — deterministic, zero LLM cost, so it can rebuild on every commit. An **optional** one-time semantic pass over docs can be run manually via `/graphify <path> --mode deep`; not part of the automated loop.

### 3.2 Components
1. **`graphify claude install`** (run in `Prut/web`) → writes a `## graphify` section to `Prut/web/CLAUDE.md` instructing agents to consult the graph before answering architecture questions and rebuild after code changes.
2. **Awareness note** — a short line in `CLAUDE.md` recording that graphify is installed (CLI `graphifyy`, interpreter at the uv tool venv) and how to invoke it.
3. **Git post-commit hook** (`graphify hook install`) → on each commit, diff changed code files, re-run AST extraction, rebuild `graphify-out/graph.json` + `GRAPH_REPORT.md`. No LLM, no network.
4. **MCP server registration** — add the `graphify` MCP stdio server (`python -m graphify.serve <abs>/graphify-out/graph.json`) to the project MCP config so agents get `query_graph`, `get_node`, `get_neighbors`, `get_community`, `god_nodes`, `graph_stats`, `shortest_path`.
5. **`.gitignore`** — ignore `graphify-out/` (the 4 MB `graph.json` + `graph.html`), optionally keep `GRAPH_REPORT.md` tracked if desired.

### 3.3 Interfaces / how you use it
- Agent asks a question → uses the graphify MCP tools OR `/graphify query "<q>"`.
- Developer commits code → hook rebuilds the graph silently.
- No product-surface impact; this track never runs in production.

### 3.4 Dependencies
- graphify CLI (installed: `graphifyy==0.9.20`), uv tool venv Python.
- The project's MCP config file (Cursor `.cursor/mcp.json` and/or repo `.mcp.json`).

### 3.5 Risk / regression
- Zero product risk (dev-tooling only). Hook must be non-blocking and fail-open: if graphify errors, the commit still succeeds (hook exits 0 with a warning).

---

## 4. Track B — Memory Palace graph upgrades

All Track B work centers on `src/components/features/library/graph-utils.ts` (pure functions) and small additions to `PromptGraphView.tsx` / the Memory Palace surfaces. Every function stays pure and unit-tested.

### 4.1 Phase 1 — Louvain (modularity) clustering

**Problem.** `computeClusters` (`graph-utils.ts:505`) uses union-find → it returns *connected components*. Once a library has ~150 loosely keyword-linked prompts, transitive linking collapses everything into one giant "cluster," making the Obsidian-style hull overlay meaningless.

**Change.** Replace the union-find grouping with modularity-based community detection.
- Library: `graphology` + `graphology-communities-louvain` (client-safe, no native deps) — build a `graphology` graph from the existing "strong" edges, run Louvain with a **fixed random seed** for deterministic, stable cluster IDs (so colors don't reshuffle between renders).
- Keep the existing `GraphCluster` shape (`clusterId`, `nodeIds`, `label`, `color`, `capability`) and the existing keyword-tally labeling + dominant-capability color — only the grouping algorithm changes.
- **Fallback / parity:** a `clusteringMethod: "louvain" | "components"` option, defaulting to `"louvain"`, with `"components"` preserving today's exact behavior. If Louvain produces a degenerate single community (tiny libraries), fall back to components automatically.
- Minimum community size stays ≥3 (unchanged).

**Testing.** New Vitest cases in `graph-utils.test.ts`: a known synthetic graph where union-find yields 1 blob but Louvain yields ≥2 communities; determinism across runs; fallback path.

**No infra. No DB. No UI contract change.**

### 4.2 Phase 2 — Hub lens + graphify visual method + search focus

**2a. Centrality / hub prompts.**
- New pure function `computeHubs(nodes, links)` → degree centrality (always) + a **bounded** betweenness approximation (Brandes on the prompt-only subgraph, capped at N nodes for O(V·E) safety; skip when node count exceeds a threshold and fall back to degree-only). Returns ranked hub IDs + scores.
- New `InsightFilter` value `"hubs"` and corresponding fields on `GraphInsights` (`hubCount`, `hubIds`, `topHubId`). Surfaces "your most connected / bridging prompts" as a 5th insight lens beside `underused | clusters | low_score | recent`.

**2b. Visual encoding (graphify method, Peroot palette).**
- **Size-by-importance:** node radius scales with centrality (hubs render larger), replacing/augmenting the current `use_count`-based size. Bounded to the existing 6–16px range.
- **Color modes:** a `colorMode: "capability" | "cluster"` toggle in the graph UI.
  - `"capability"` = today's behavior (default, unchanged) using `CAPABILITY_COLORS`.
  - `"cluster"` = graphify-style color-by-community, but hues drawn from a **constrained palette compatible with obsidian `#080808` + Signal Gold**, honoring the **One-Gold** rule (gold reserved for the focus/center node; cluster hues are muted, cool-leaning, ≤ the gold budget). Palette to be validated against `DESIGN.md` and the impeccable hook.
- Applies to `PromptGraphView` and both Memory Palace surfaces (`MemoryPalaceSidebar`, `MemoryPalaceDrawer`) via shared helpers.

**2c. Search style (in-graph focus).**
- Extend the existing `searchQuery`/filter state in `PromptGraphView.tsx` (already present, lines ~119–311): on a match, **pan + zoom-to-fit the matched node(s)** and **dim non-matches** (graphify's HTML-graph search feel). Reuse the existing fit/`centerAt` machinery. Escape clears (already wired).

**Testing.** Unit tests for `computeHubs` (known betweenness on a small graph, cap fallback). UI: impeccable design check on the cluster palette; browser verification that search focuses/dims and both color modes render.

**No infra. No DB.**

### 4.3 Phase 3 — Semantic embeddings (pgvector)

**Goal.** Replace lexical-only similarity with meaning-aware similarity, feeding better `similarity` edges (and Phase 4 retrieval). Catches same-intent + cross-language (Hebrew/English) neighbors that token-Jaccard misses.

**Schema.**
- Enable the Supabase `vector` extension.
- New table `prompt_embeddings` (side table, not a column on `personal_library`, to keep the hot path lean): `prompt_id uuid PK/FK → personal_library`, `embedding vector(768)`, `model text`, `content_hash text`, `updated_at timestamptz`. RLS mirrors `personal_library` ownership. HNSW index on `embedding` (cosine).
- `content_hash` = hash of the title+body used, so we only re-embed when content actually changes.

**Generation.**
- Add an `embed(text): Promise<number[]>` / `embedMany` path to `src/lib/ai` using the Vercel AI SDK embeddings API with Gemini `text-embedding-004` (768 dims), routed through the existing gateway/provider config.
- **Write path:** on prompt create/update, enqueue a non-blocking embedding refresh (fire-and-forget; never blocks the save, never touches credits). Guarded by a feature flag `EMBEDDINGS_ENABLED`.
- **Backfill:** a cron/admin route that embeds existing rows in batches (idempotent via `content_hash`), rate-limited, resumable.

**Similarity upgrade.**
- `graph-utils` gains a semantic similarity source: when embeddings exist for both prompts, the `similarity` edge uses cosine distance (via a server-provided neighbor map); when either embedding is missing, it **falls back to the existing lexical Jaccard**. This guarantees the graph keeps working during/after backfill and if embeddings are disabled.
- Because `buildGraphData`/`computeNeighborhood` run client-side, the semantic neighbor scores are fetched from the server (pgvector KNN) and passed in as an optional input; absent that input, behavior is identical to today.

**Testing.** Migration test (extension + RLS + index). Embedding pipeline unit tests (hashing, skip-unchanged, batch). Parity test: with embeddings disabled, graph output byte-identical to current. Integration: cosine neighbors returned + RLS enforced.

**Infra:** pgvector, one gateway addition, one cron. Cost: embedding calls are cheap and off the credit path.

### 4.4 Phase 4 — GraphRAG retrieval API (no UI wiring)

**Goal.** A clean seam that, given a prompt or free-text query, returns the semantically related neighborhood — reusable by a future improve-pipeline integration, but not wired into engines/UI/credits now.

**Interface.**
- `POST /api/library/retrieve` (auth'd, RLS-scoped to the caller): input `{ promptId?: string, query?: string, k?: number }` → output ranked `{ prompt, score, why }[]` plus optional neighborhood edges.
- Implementation: embed the query (or load the prompt's embedding) → pgvector KNN (`<=>`) over the user's `prompt_embeddings` → optionally expand one hop using the existing edge logic.
- Pure retrieval; no LLM generation, no credit decrement. Documented as the GraphRAG substrate.

**Testing.** Endpoint integration tests (auth, RLS isolation between users, k bounds, empty-library). Contract test on the response shape.

---

## 5. Data flow (Track B, end state)

```
prompt create/update ──▶ embed() [flagged, async] ──▶ prompt_embeddings (pgvector)
                                                            │
personal library (useAllPersonalPrompts) ──▶ /api/library/retrieve (KNN) ──▶ semantic neighbor map
                                                            │
graph-utils.buildGraphData / computeNeighborhood ──(semantic map ?? lexical Jaccard)──▶ GraphData
                                                            │
computeClusters (Louvain) + computeHubs ──▶ clusters + hub lens
                                                            │
PromptGraphView / MemoryPalace{Sidebar,Drawer} ──▶ size-by-centrality, colorMode, search-focus
```

Every arrow degrades gracefully: no embeddings → lexical; no Louvain result → components; no centrality → degree-only; retrieve endpoint absent → today's behavior.

---

## 6. Regression / "works exactly as now" strategy

1. **Defaults preserve current behavior** at every layer (`clusteringMethod: "louvain"` is the only default that changes an algorithm — gated by an automatic degenerate-case fallback and covered by a parity test; everything else defaults to today's path).
2. **Feature flags:** `EMBEDDINGS_ENABLED` (Phase 3) and a client `graphColorMode`/`clusteringMethod` default constant, so any phase can be dark-launched.
3. **Parity tests** assert unchanged output when new inputs are absent.
4. **Existing suites green:** `npm run test`, `npm run typecheck`, `npm run lint` must pass after each phase; Memory Palace E2E unaffected.
5. **Browser verification** per UI phase (search focus, both color modes, hull overlays) before marking done.
6. **PostHog guard:** the Memory Palace success metric (`palace_navigated_to_prompt`) must not regress.

---

## 7. Phasing & sequencing

| Phase | Deliverable | Infra | Risk |
|-------|-------------|-------|------|
| A | Agent-queryable codebase graph (MCP + hook + CLAUDE.md) | none (dev tool) | none (product) |
| 1 | Louvain clustering (fallback to components) | none | low |
| 2 | Hub lens + size/cluster color + search focus | none | low |
| 3 | Semantic embeddings (pgvector + gateway + backfill) | pgvector, cron | medium |
| 4 | GraphRAG retrieval API (`/api/library/retrieve`) | builds on 3 | low |

Order: **A → 1 → 2 → 3 → 4** (approved). Phases 1–2 deliver product value with zero infra; 3 introduces infra; 4 builds on 3.

---

## 8. Testing summary

- **Pure logic** (`graph-utils`): Vitest — Louvain determinism/fallback, `computeHubs` betweenness + cap, lexical/semantic parity.
- **DB:** migration test for `vector` extension, RLS, HNSW index.
- **Pipeline:** embedding hashing/skip/batch/backfill idempotency.
- **API:** `/api/library/retrieve` auth, RLS isolation, k bounds.
- **UI:** impeccable design pass on cluster palette; browser verification of search-focus + color modes + hull overlays.
- **Regression:** full existing suite green per phase; parity tests.

---

## 9. Open items to resolve during planning
- Exact constrained cluster palette (validate against `DESIGN.md` + impeccable).
- Betweenness node-count cap threshold (perf profiling on a large synthetic library).
- Backfill trigger (cron vs admin-invoked route) and batch size.
- Whether `GRAPH_REPORT.md` is git-tracked or ignored with the rest of `graphify-out/`.

---

## 10. Why this is a good upgrade (Hebrew) — למה זה שדרוג משתלם עבורנו

> נוסח סופי ומלא יימסר בסיום הבנייה; זהו התמצות שמנחה את הבנייה.

**טרק A — הקוד כגרף לסוכנים.** במקום שהסוכנים (Claude Code, Cursor, ערכת ה‑`.agent/`) יחפשו קבצים אחד‑אחד, הם שואלים גרף חי של כל האפליקציה — "מה מתחבר למה", "מאיפה קוראים לפונקציה הזו". זה חוסך טוקנים (בנצ'מרק הראה פי ~34 פחות טוקנים לשאלה), מקצר זמן הבנה אחרי המעבר ל‑Windows, ומתעדכן לבד בכל commit בלי עלות מודל.

**טרק B — שדרוג גרף הספרייה (Memory Palace).**
1. **קלאסטרינג אמיתי (Louvain):** היום `computeClusters` מזהה רק "רכיבים מחוברים" — וברגע שיש הרבה פרומפטים, הכול מתמזג לגוש אחד ענק וההדגשה הוויזואלית מאבדת משמעות. Louvain מוצא קבוצות נושאיות אמיתיות, כך שה‑Memory Palace נשאר קריא ושימושי גם למשתמשים כבדים.
2. **פרומפטים‑על (Hubs):** לראשונה נזהה את הפרומפטים המחברים/המרכזיים של המשתמש — תובנה חדשה וייחודית למוצר ניהול פרומפטים, שמשתמשת בגרף שכבר קיים.
3. **סגנון ויזואלי וחיפוש בסגנון graphify:** גודל לפי חשיבות וצביעה לפי קלאסטר — אבל בתוך שפת העיצוב שלנו (אובסידיאן+זהב, כלל ה‑One‑Gold), וחיפוש שממקד ומדגיש את הצומת הרלוונטי.
4. **דמיון סמנטי (embeddings):** היום הדמיון מבוסס מילים משותפות בלבד — פספוס של פרומפטים באותה כוונה בניסוח שונה, ובמיוחד בין עברית לאנגלית. embeddings תופסים משמעות, לא רק מילים.
5. **תשתית GraphRAG:** API נקי לשליפת ההקשר הרלוונטי מהספרייה — הבסיס לשדרוג עתידי של מנוע השיפור, בלי לגעת בקרדיטים עכשיו.

**והכי חשוב:** כל שלב נבנה כך שהאפליקציה עובדת בדיוק כמו היום עד שהשדרוג מוכח — ברירות מחדל שמרניות, fallback חינני, ובדיקות parity. שדרוג בלי סיכון רגרסיה.
