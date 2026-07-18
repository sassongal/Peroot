# CONTEXT — Peroot domain & seam glossary

Single source for the domain language and the load-bearing **seams** of Peroot
(`Prut/web`). Names here are canonical: use them in code, reviews, and future
architecture work. Architecture vocabulary (module, interface, depth, seam,
adapter, leverage, locality) follows the `/codebase-design` skill.

> New file, seeded 2026-07-17 during the `withUser` design. Add terms lazily as
> deepened modules get named — don't pad it with concepts the code doesn't have.

---

## Domain terms

- **Enhancement / Improve** — the core act: turning a user's raw prompt into an
  improved one. Runs through an **Engine** selected by **Capability Mode**
  (`STANDARD | DEEP_RESEARCH | IMAGE_GENERATION | AGENT_BUILDER | VIDEO_GENERATION`).
- **Credit** — the unit a user spends to run an Enhancement. Free tier: rolling
  daily quota; Pro: monthly. Atomic spend via the `refresh_and_decrement_credits`
  RPC; refunds via `refund_credit`. Both are service-role, `SECURITY DEFINER`.
- **Tier** — a user's plan: `free | pro | admin` (plus `guest` for the
  unauthenticated). `admin` is sourced from the `user_roles` table (canonical),
  **not** `profiles.plan_tier`.
- **Personal Library** — a user's saved prompts, folders, favorites, history.
- **Context Attachment** — an external source (url / file / image) extracted and
  enriched into a context block fed into an Enhancement.

---

## Seams

### Extraction  ·  `extract()`  *(deepened 2026-07-18)*

The seam at which an untrusted source (url / file / image) becomes normalized
text (or image bytes) the pipeline can enrich. `src/lib/context/engine/extract`.

- **Interface:** one `extract(input: ExtractInput) → ExtractResult`. `ExtractInput`
  is discriminated by `kind` ("url" | "file" | "image"); `ExtractResult` is flat —
  `{ text; imageBase64?; imageMimeType?; metadata }`. One dispatch site; the five
  per-source adapters (url, pdf, text, office, image) all speak this one type.
- **Invariants owned here:** every adapter bounds its memory through
  `extract/limits.ts` (streaming `readCapped` for HTTP bodies; `assertArchiveWithinLimit`
  zip-bomb guard for docx/xlsx) — the contract, not per-adapter ad-hoc caps.
- **Adjacent tables it feeds:** `capability.ts` — one exhaustive
  `Record<DocumentType, {compression, enrichPrompt, role, priority}>` (replaces four
  scattered switches; drift is now a compile error). `stage.ts` — `blockStatus(stage)`,
  the single home of the "warning counts as ready" rule, client-safe so React shares it.
- **Deliberately outside:** `processAttachment` orchestration, `enrich`, `cache`,
  `inject` stay. The `context/extract-*` routes keep their own auth (not `withUser`)
  because they stream SSE with an extraction-quota system, not credits.

### Credit-gated endpoint  ·  `withUser`  *(designed 2026-07-17; not yet built)*

The seam at which an **authenticated (or guest-allowed) API request** becomes a
handler running its actual work. Everything a route must get right *before* its
own logic — auth, tier/admin resolution, rate-limit, credit spend + refund, the
RLS client choice, and error shaping — lives behind this one interface.

- **Interface:** `withUser(handler, { rateLimit, credits?, allowGuest? })`.
  The handler receives `(req, ctx, routeContext)` where
  `ctx = { user, db (RLS client), tier, isAdmin, refund() }`.
- **Sibling:** `withAdmin` / `withAdminWrite` in `src/lib/api-middleware.ts` —
  the already-deep module for admin routes. `withUser` is the missing half of
  the same idea and lives beside it.
- **Auth:** cookie session **or** Bearer session token (Chrome extension). The
  handler receives a resolved `user` either way.
- **Invariants owned here (encode once, not per route):**
  - **One correctly-scoped client, chosen centrally** — RLS cookie client for
    cookie auth, service-role for Bearer (where RLS has no `auth.uid()`).
    `withUser` makes this choice; a route never writes `bearer ? service : rls`
    again (that per-caller branch was the footgun — wrong pick silently bypasses
    RLS). Handlers always scope by `ctx.user.id`.
  - **Charged only on a 2xx** — credit auto-refunds on throw or ≥400; streaming
    handlers call `ctx.refund()` on mid-stream failure.
  - **Admins bypass** credits and rate-limit (logged), matching `enhance`/`chain`.
  - One canonical **error shape**: Hebrew message + snake_case `code`.
- **Deliberately outside the seam:** `enhance` keeps its bespoke preamble
  (`prk_` developer API keys, profile cache, in-flight lock). `withUser` handles
  cookie + Bearer session auth (the common case) but not those three — pulling
  them in would widen the interface and destroy its depth.
- **Deletion test:** removing `withUser` scatters the above back across ~30
  routes. It concentrates complexity, so it earns its keep.

### Admin endpoint  ·  `withAdmin` / `withAdminWrite`

Existing deep module (`src/lib/api-middleware.ts`, ~50 routes). Validates the
admin session, shapes 401/403/500, and (for `withAdminWrite`) enforces the
`adminWrite` rate-limit bucket. The proof that the wrapper pattern works here.

### Personal Library corpus  ·  `useAllPersonalPrompts()`  *(built 2026-07-18)*

The seam that hands the graph view and the Memory Palace the **full** personal
library — every prompt the user owns — as opposed to the paginated
`personalLibrary` page slice the rest of the library UI runs on. `src/hooks/useAllPersonalPrompts.ts`.

- **Why it exists:** neighborhood scoring (`computeNeighborhood`: Jaccard 0.6 +
  24h co-occurrence 0.4) is only meaningful across the whole library — a genuine
  neighbor sitting on another page is invisible if a 15-item slice is passed. The
  Palace surfaces used to receive `filteredPersonalLibrary` (one page); that was
  the live empty/wrong-neighborhood bug.
- **Interface:** `useAllPersonalPrompts({ enabled, userId, guestItems, totalCount }) →
  { prompts, loading, total, truncatedAt }`. Guests read their in-memory
  `allLocalItems`; authenticated users get a **lazy**, cached `.limit(2000)` fetch
  keyed on `totalCount` (refetches when the library changes). `enabled` gates the
  fetch on a consumer being on screen (graph mode · mobile drawer · desktop palace
  at ≥5 prompts) and folds in the `authLoaded` stale-JWT guard (the "1-node graph" fix).
- **Precondition it enforces:** `NeighborhoodOptions.corpus` (renamed from `prompts`)
  is documented as the full corpus, and `computeNeighborhood` dev-`warn`s when the
  `centerId` is absent from it — the tripwire that catches a slice being passed again.
- **Deliberately outside:** search/sort/pagination of the *visible* grid stays on
  `useLibrary` + `filteredPersonalLibrary`; this seam is corpus-only, unfiltered.
