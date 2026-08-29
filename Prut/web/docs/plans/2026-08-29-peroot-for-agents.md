# Peroot Connect — plan (v0.4 · build-ready, 2026-08-29)

Turn Peroot into the **"prompt brain" any AI agent connects to**: a PRO user
adds Peroot to Claude / ChatGPT / Cursor / their own code, and from inside that
agent can turn any request into a perfected, expanded prompt across all five
modes — and, on request, save & tag it into their Memory Palace.

The moat is NOT "enhance a prompt" (any LLM does that). It is Peroot's
**accumulated intelligence** — per-platform engine skills, per-user memory
facts, writing-style profile, the Memory Palace graph, and the curated public
library. Peroot Connect's job is to carry ALL of that into the agent, and to
feed every channel's usage back into the same brain (see §15, Harmony).

> Status: PLANNING. Nothing here is built yet. Decisions were locked with the
> product owner over 2026-08-29; v0.2 folds in the harmony/synergy pass.

---

## 1. Locked decisions
| # | Decision |
|---|---|
| Tier | **PRO feature**, with a **free lifetime taste for non-PRO** (default 3 API enhances, read from `site_settings`) to drive the upsell. |
| Auth | **`prk_` API key first**, **OAuth 2.1 later**. |
| Credits | Agent/API enhancements draw from the **same Pro monthly allowance** as the web. |
| Auto-save | **Explicit only** — nothing is saved unless the user asks the agent (`save_prompt`). |
| Tagging | AI auto-tagging runs **on save, when requested**. |
| Mode | **Explicit** `mode` param per call (no auto-detect in v1). |
| "Skills" | The connector ships with **built-in instructions (MCP prompts)** that teach the agent when/how to use Peroot. |
| Clients | Claude (Desktop + web), ChatGPT, Cursor/IDE, generic REST. |
| Section | New platform section **visible to all** (upsell), PRO-gated activation. |
| DOCS | Dedicated user DOCS, **Hebrew + English**. |
| Name | **Peroot Connect** (he: *חיבור Peroot*). |
| Keys | **Multiple named keys** per user (one per client), individually revocable. |
| Rate-limit | **20 req/min per key** (separate from the credit quota). |

### Hard constraint that shapes phasing
Remote connectors on **claude.ai (web) and ChatGPT require OAuth** — they cannot
take a pasted key. **Claude Desktop, Cursor, and REST/custom accept a `prk_`
key.** Therefore:
- **Phase 1–2 (key auth):** Claude Desktop, Cursor, REST/custom go live.
- **Phase 3 (OAuth):** claude.ai web + ChatGPT connectors go live.

---

## 2. Architecture

Reuse everything that already works; add two thin layers on top.

```
        Claude Desktop / Cursor / custom code        claude.ai web / ChatGPT
                    │  (prk_ key)                          │  (OAuth 2.1)
                    ▼                                       ▼
        ┌───────────────────────── Auth resolver ─────────────────────────┐
        │   prk_ key → validateApiKey()      OAuth token → user session    │
        └──────────────────────────────┬───────────────────────────────────┘
                                        ▼
   Layer 2  Remote MCP server (HTTP/SSE)        Layer 1  Developer REST API
     tools: enhance / save / search …             POST /api/v1/enhance  …
                                        │  (both resolve to a Peroot user)
                                        ▼
     ┌───────────── EXISTING, REUSED ─────────────┐
     │  /api/enhance pipeline (5 modes, streaming) │
     │  credits (refresh_and_decrement_credits)    │
     │  personal_library + tags + Memory Palace    │
     │  RLS — every call scoped to the user        │
     └─────────────────────────────────────────────┘
```

- **Layer 1 — Developer REST API** (`/api/v1/*`): stable, versioned, `prk_`-auth.
  Serves custom/code agents directly, and is the auth backbone the MCP reuses.
- **Layer 2 — Remote MCP server**: a **Streamable HTTP** MCP endpoint **hosted as
  a Next.js route in the same app** (decided — reuses auth, the enhance pipeline,
  env, and deploy; avoids a second service to keep drift out). Exposes the tools
  + ships the bundled instruction prompts. Auth: `prk_` header (P1–2) then OAuth (P3).
- The existing **`peroot-mcp-server/` is NOT this** — it is an internal,
  local (stdio), service-role **admin** tool (deduct credits, set tier). It must
  never be exposed to users. The user-facing MCP is a new, separate, per-user,
  safe-tools-only server.

---

## 3. Tool / endpoint surface

All tools resolve to one authenticated Peroot user (RLS-scoped, their credits).
Every `enhance_prompt` call automatically benefits from the user's **memory
facts**, **style profile**, and the right **per-platform engine skill** — because
the tool wraps the existing `/api/enhance` pipeline (see §15). The agent doesn't
opt in to the intelligence; it gets it for free.

| Phase | Tool (MCP) | REST | Purpose |
|---|---|---|---|
| P1 | `enhance_prompt` | `POST /api/v1/enhance` | Perfect+expand. params: `prompt`, `mode`, `target_platform?` (Midjourney/Sora/ChatGPT…→ picks the engine skill), `target_model?`, `mode_options`, `output_language?`. Spends 1 credit; non-stream JSON. |
| P1 | `save_prompt` | `POST /api/v1/prompts` | Save to library + Memory Palace. params: `prompt`, `tags?`, `auto_tag?`. Explicit-only. Auto-versions on refine. |
| P1 | `search_my_prompts` | `GET /api/v1/prompts/search` | Fuzzy search the user's library (`search_personal_library_fuzzy`). |
| P1 | `list_my_prompts` / `get_prompt` | `GET /api/v1/prompts[/:id]` | List/paginate / fetch one. |
| P2 | `search_public_library` | `GET /api/v1/library/search` | Search the 724 curated public prompts/templates — "start from something proven". |
| P2 | `fill_template` | `POST /api/v1/templates/fill` | Fill a parametric template with the user's variables/presets. |
| P2 | `remember_fact` / `list_facts` | `…/user/memory` | Let the user grow their "brain" via the agent; feeds future enhancements. |
| P2 | `rate_prompt` | `POST /api/v1/feedback` | Close the quality loop → scoring + Memory Palace. |
| P4 | `related_prompts` | `GET /api/v1/prompts/:id/related` | Memory Palace neighbors (Jaccard + co-occurrence). |
| P4 | `run_chain` | `POST /api/v1/chains/:id/run` | Execute a saved multi-step prompt chain. |

Deliberately **out of scope for now**: context file/URL ingestion, `suggest_mode`
auto-detect, and **all** admin actions.

### Bundled connector "skills" (MCP prompts)
Instruction prompts shipped with the connector so the agent uses Peroot well:
- `peroot/enhance-before-you-generate` — "Before producing an image/video/agent
  prompt, call `enhance_prompt` with the matching mode."
- `peroot/save-this` — how/when to call `save_prompt` with good tags.
- `peroot/recall` — search the user's library before writing from scratch.
- A short **system-instruction snippet** users can paste into their agent's
  custom instructions for always-on behavior.

---

## 4. Data & credits
- **`developer_api_keys`** (table already exists, backfilled 2026-08-29): store
  `key_hash` (never the raw key) + `key_prefix` for display; `scopes`,
  `rate_limit`, `is_active`, `expires_at`, `last_used_at`, `usage_count`.
- Raw key shown **once** at creation (`prk_` + random); afterwards only the
  prefix. `validateApiKey()` = hash lookup + active/expiry + user resolution.
- **Credits:** PRO → each `enhance` spends 1 from the Pro monthly allowance via
  the existing atomic RPC; refund on failure. **Non-PRO → a free lifetime taste**
  (default **3** API enhances, value in `site_settings` per the "quotas are data"
  rule); after that, `402 trial_exhausted` with an upgrade CTA. **Rate-limit per
  key** (Upstash, 20/min), independent of quota.
- **`api_usage_logs`**: per-key call log (endpoint, mode, status, latency) for
  the usage view + abuse detection.

---

## 5. Platform section — "Peroot for Agents" (working name)
Visible to everyone (upsell); full activation PRO-gated.
- **Hero / what it is** — connect your agent, perfect prompts anywhere.
- **Connect wizard** — create key → copy ready-made config snippets per client
  (Claude Desktop JSON, Cursor, ChatGPT/claude.ai "coming via OAuth", curl).
- **Key management** — create / name / revoke; show prefix + last-used.
- **Usage & quota** — calls this month, remaining Pro allowance, per-key stats.
- **Link to DOCS.**
- Non-PRO: same page, activation buttons replaced by an upgrade CTA.

## 6. User DOCS section (Hebrew + English)
Table of contents:
1. What is Peroot for Agents (concept + the 5 modes)
2. Quickstart per client (Claude Desktop, Cursor, REST/curl; web/ChatGPT via OAuth)
3. Authentication (creating/rotating/revoking a key; OAuth later)
4. Tools reference (each tool: params, returns, example)
5. Modes guide (when to use each; target-model hints)
6. Saving & tagging into your library / Memory Palace
7. Credits & rate limits (PRO)
8. Recipes (image-before-generate, research brief, agent spec, recall-then-write)
9. FAQ & troubleshooting (401/402/429 meanings)

---

## 7. Security
- Keys stored hashed; raw shown once. Prefix-only display.
- Per-key scopes + rate-limit; revoke is immediate (active flag checked per call).
- RLS on every call; the user-facing MCP exposes **zero** admin/service tools.
- OAuth (P3): 2.1 + PKCE + dynamic client registration; short-lived tokens.

---

## 8. Roadmap (harmony-integrated)
- **Phase 1 — Developer API foundation + moat exposed.**
  `validateApiKey`; `/api/v1/enhance` (wrapping the existing pipeline so memory
  facts + style + engine skill apply for free) with `target_platform`;
  `/api/v1/prompts*` (save w/ auto-tag + auto-version, search, list, get);
  key create/revoke route; Settings key management; per-key 20/min rate-limit;
  `api_usage_logs`; PRO gate + non-PRO free taste. → Cursor / REST / custom live.
- **Phase 2 — Remote MCP + bundled skills + section + DOCS + library synergies.**
  Remote MCP wrapping the v1 API; ship instruction prompts; `search_public_library`,
  `fill_template`, `remember_fact`/`list_facts`, `rate_prompt`; build the Peroot
  Connect section + DOCS (he/en). → Claude Desktop live.
- **Phase 2.5 — Revive style-analysis.** `user_style_personality` has **0 rows**
  — the style loop isn't producing. Fix it and apply the user's voice to every
  enhancement (web + extension + agent). Pure personalization win, no new surface.
- **Phase 3 — One-click OAuth.** OAuth 2.1 + PKCE + dynamic client registration
  → claude.ai web + ChatGPT connectors live.
- **Phase 4 — Smart recall & workflows.** `related_prompts` (Memory Palace graph)
  + feed agent usage back into co-occurrence; `run_chain`; optional `suggest_mode`.

---

## 9. How it looks in practice (user journeys)

**A. Connect (one-time).** PRO user → *Peroot Connect* section → "Create key" →
names it "Claude Desktop" → copies the shown config snippet into their client →
done. (Web/ChatGPT: "Connect" via OAuth, Phase 3.)

**B. Everyday use — the agent already knows what to do.** The bundled
instructions make the agent reach for Peroot automatically:
- User in Claude: *"תבנה לי פרומפט לוידאו של חתול רוקד בטוקיו בגשם"* → agent calls
  `enhance_prompt(mode=VIDEO_GENERATION, prompt=…)` → returns a perfected,
  expanded video prompt → agent shows it (and can hand it to a video tool).
- User: *"שמור את זה עם תיוג"* → agent calls `save_prompt(prompt, auto_tag=true)`
  → saved to their library + Memory Palace, AI-tagged.
- User: *"מה היה הפרומפט ההוא שכתבתי על קמפיין פייסבוק?"* → agent calls
  `search_my_prompts("קמפיין פייסבוק")` → returns matches from their library.

**C. Explicit mode.** Mode is always explicit (STANDARD / DEEP_RESEARCH /
IMAGE_GENERATION / VIDEO_GENERATION / AGENT_BUILDER); the bundled instructions
teach the agent to map the user's intent ("image", "video", "agent"…) to it.

## 10. `enhance_prompt` contract (per mode)
Request: `{ prompt: string, mode: CapabilityMode, target_model?, output_language?, mode_options? }`
- IMAGE_GENERATION `mode_options`: `aspect_ratio?`, `style?`
- VIDEO_GENERATION `mode_options`: `camera_movement`, `duration`, `style?`, `mood?`
- AGENT_BUILDER `mode_options`: `system_instructions`
- STANDARD / DEEP_RESEARCH: `target_model?` hint

Response (non-streaming JSON for agents):
`{ enhanced_prompt: string, mode, credits_remaining: number, request_id }`
(+ `saved_id` only if a save was chained). `credits_remaining` lets the agent
tell the user how much Pro quota is left.

## 11. Error model (what the agent surfaces)
Consistent shape `{ error, code }` with Hebrew + English message:
- `401 invalid_key` — bad/revoked key → "re-create a key in Peroot Connect".
- `402 trial_exhausted` — non-PRO used the free taste → upgrade CTA.
- `402 no_credits` — PRO monthly quota exhausted → "resets on <date>".
- `429 rate_limited` — >20/min on this key → retry-after.
- `400 invalid_mode` / `invalid_request`.

## 12. Scopes (per key)
`enhance`, `read` (list/search/get), `write` (save). Default key = all three;
advanced users can mint read-only or enhance-only keys.

## 13. Resolved (this planning session)
- Return: **final prompt + `credits_remaining`** by default; verbose (score /
  before-after / reasoning) behind an opt-in flag.
- OAuth: **after P1–P2** ship fully (key-based) first.
- Non-PRO: **free lifetime taste** (default 3), then upsell.

## 14. Open (later / marketing)
- List Peroot in the Anthropic/OpenAI connector directories once OAuth ships.
- Exact free-taste number + whether it ever resets (default: 3, lifetime).
- Verbose-mode payload shape (when we add it in P4).

## 15. Harmony — one brain, many mouths
The organizing principle for the whole system: **web, Chrome extension, and
agents are three mouths on one brain.** Each channel must (1) READ from the same
intelligence and (2) WRITE back into it, so every use anywhere makes the brain
smarter and every channel benefits. Peroot Connect is not a bolt-on API — it is
the third mouth, wired to the same brain.

### The brain's assets — status & how Connect keeps them in harmony
| Asset | Live data | Status | Harmony action |
|---|---|---|---|
| Engine skills (per-platform) | 1,042 selections | 🟢 live, web/ext only | `enhance` `target_platform` picks the right skill — the moat, exposed |
| Memory facts | 435 | 🟢 live, enhance-only | auto-applied to agent enhances; `remember_fact`/`list_facts` let the agent grow it |
| Style profile | **0** | 🔴 dormant (loop not producing) | **Phase 2.5**: fix the loop, apply the user's voice everywhere |
| Public library | 724 (574 templates) | 🟡 web search only | `search_public_library` + `fill_template` |
| Variables / presets | 56 / **0** | 🟡 partial, presets dormant | `fill_template` uses them; revive presets |
| Memory Palace graph | 717 events | 🟢 live, web only | `related_prompts` + agent usage feeds co-occurrence (P4) |
| Prompt chains | 4 | 🟡 nascent | `run_chain` (P4) |
| Prompt versions | **0** | 🔴 unused | auto-version on save/refine (P1) |
| Feedback | 2 | 🔴 near-dead | `rate_prompt` closes the loop → scoring + palace |

### Structural rules that keep it harmonious
1. **One pipeline, wrapped not forked.** The API/MCP call `/api/enhance` — never a
   parallel copy — so skills/facts/style/scoring/credits can't drift between channels.
2. **One capability-mode vocabulary everywhere** (the VIDEO_GENERATION enum drift
   fixed on 2026-08-29 was exactly this class of disharmony).
3. **Every channel closes its loops** — writes history, palace events, facts, and
   feedback back to the brain.
4. **One identity & credit ledger** across web/ext/agent (already true via `withUser`).

### Net effect for the user
A PRO user's agent doesn't just "improve text" — it improves it **with the user's
own facts, voice, saved work, and Peroot's per-platform expertise**, and everything
they do through the agent enriches what they see on the web (and vice-versa). That
compounding, cross-channel personalization is the thing no generic agent can copy.

---

## 16. Architecture review — gaps found & resolutions (build-readiness)
Verified against the live code/DB on 2026-08-29. Each item is a decision, not an
open question.

**16.1 Streaming → single-shot.** `/api/enhance` is SSE-streaming and can trigger
a **clarifying-questions** step (`/api/enhance/questions`). Agents need one JSON
answer. → The v1 endpoint runs the pipeline in **collect mode** (aggregate the
stream server-side, return final text) and **skips the interactive questions
step** (single-shot; the enhancement proceeds with best-effort assumptions). Do
NOT fork the pipeline — add a `stream:false` path in the shared enhance code.

**16.2 Auth is already wired.** `resolveAuth()` already routes `prk_*` →
`validateApiKey()` → service-client scoped to the resolved `user_id`. Phase 1 auth
work = implement `validateApiKey` only: SHA-256 of the key, **look up by indexed
`key_prefix`** then constant-time compare `key_hash`, check `is_active` + `expires_at`,
resolve `user_id`, and update `last_used_at`/`usage_count` **async (fire-and-forget)**.
No RLS footgun — the existing service-client path is reused.

**16.3 Rate limits — two ceilings.** Per-key 20/min **and** a per-user ceiling
(default 40/min across all their keys) so N keys can't multiply throughput.
Upstash sliding window keyed by both `key_id` and `user_id`.

**16.4 Credits, idempotency, trial counter.**
- Accept an optional **`Idempotency-Key`** header; cache `request_id → result` in
  Redis (short TTL) so an agent retry returns the same result **without
  double-charging**.
- PRO: spend 1 on success via the existing atomic RPC; **refund on failure**
  (reuse the streaming refund pattern). `save_prompt` + `auto_tag` are **free**
  (no credit; auto-tag is a cheap classify call).
- Non-PRO free taste needs its own counter (monthly credits are PRO-only). →
  add **`profiles.api_trial_used int NOT NULL DEFAULT 0`**, incremented atomically;
  gate at the `site_settings` value (default 3).

**16.5 Input/output limits & timeouts.** Reject `prompt` > 8,000 chars
(`400 invalid_request`); cap enhanced output; set `maxDuration` on v1 routes
(≥60s) so a slow upstream can't hang. Validate `mode` + `mode_options` with zod.

**16.6 Privacy.** `api_usage_logs` stores **no prompt/enhanced text** today — keep
it that way (metadata only), consistent with `sendDefaultPii:false`. Add
`api_key_id` for per-key attribution; never log key material or prompt bodies.

**16.7 MCP transport & key injection.** Use **Streamable HTTP** (current MCP
spec), not legacy SSE — required by claude.ai / ChatGPT / Cursor. For key-based
clients the `prk_` goes in the `Authorization: Bearer` header:
- **Claude Desktop:** via the `mcp-remote` bridge (`--header "Authorization: …"`).
- **Cursor / IDE:** native remote-MCP `headers` config.
- **REST/custom:** header directly.
- **claude.ai web / ChatGPT:** header auth not accepted → **OAuth (Phase 3)**.
Bundled instruction prompts ship via the MCP **`prompts`** capability.

## 17. Required DB changes (Phase 1)
- `api_usage_logs`: **add `api_key_id uuid NULL` + index** (per-key usage view;
  keep RLS). `status`/`http_status` optional — token/duration already present.
- `profiles`: **add `api_trial_used int NOT NULL DEFAULT 0`** (non-PRO taste).
- `developer_api_keys`: **no change** — already has name/scopes/rate_limit/is_active/expires_at.
- All as idempotent migrations under `supabase/migrations/`, validated in a
  rolled-back transaction before commit (as done for the backfill).

## 18. Test plan (build-ready)
- **Unit:** `validateApiKey` (valid / bad / revoked / expired / wrong-prefix /
  constant-time); rate-limit (per-key + per-user); credit spend/refund;
  trial-counter increment & exhaustion; zod validation; idempotency cache.
- **Integration:** each v1 endpoint — auth (cookie N/A here; key + service-client),
  RLS isolation (user A cannot read user B), every error code (401/402/429/400),
  collect-mode enhance returns final text, save→auto-tag→appears in library.
- **MCP contract:** tool discovery, each tool schema, key-header auth, prompts
  capability serves the bundled instructions.
- **Security:** revoked key rejected immediately; cross-user isolation; a leaked
  key is bounded by rate-limit + credits + per-key spend cap (16.9).

## 19. Rollout & safety
- **Feature flag** `peroot_connect_enabled` in `site_settings` (quotas-are-data);
  **kill switch** disables all `/api/v1` + MCP without a deploy.
- Staged: internal key → small PRO beta → GA. OAuth (P3) gated separately.
- **Observability:** Sentry tags `{surface:"api"|"mcp", endpoint, key_id}`;
  per-key metrics from `api_usage_logs`; alert on error-rate / cost spikes.
- **Versioning:** `/api/v1` frozen contract; additive-only changes; breaking →
  `/api/v2` with a deprecation window. MCP tool schemas versioned in the server.

## 20. Risks & mitigations
| Risk | Mitigation |
|---|---|
| Leaked `prk_` key drains credits / cost | per-key rate-limit + credit ceiling + **per-key monthly spend cap** (16.9); one-click revoke; alerting |
| Agent retry double-charges | `Idempotency-Key` + Redis result cache |
| API load starves web users | shared concurrency queue + circuit breaker (already exist); per-user ceiling |
| Pipeline logic drifts between channels | one wrapped pipeline, contract tests |
| Prompt PII in logs | metadata-only logging, enforced by review |
| MCP spec/client churn | Streamable HTTP standard; `mcp-remote` bridge for header auth |

## 16.9 Per-key spend cap (referenced above)
Optional monthly credit ceiling **per key** (in addition to the user's quota) so
one automation/leak can't consume the whole PRO allowance. Default: off (whole
quota); configurable per key in the UI.

## 21. What we hadn't thought of (architect's extra catches)
1. **Clarifying-questions step** — must be bypassed for agents (16.1).
2. **Retry double-charge** — needs idempotency (16.4).
3. **Rate multiplication across multiple keys** — needs a per-user ceiling (16.3).
4. **Non-PRO taste has no counter** — monthly credits are PRO-only; new column (16.4).
5. **MCP transport must be Streamable HTTP** and key-header injection differs per
   client — a wizard-content requirement, not an afterthought (16.7).
6. **Leaked-key blast radius** — per-key spend cap + alerting (16.9, 20).
7. **Legal/ToS** — an API/agent ToS clause (acceptable use, rate/fair-use, prompt
   ownership) before GA; link from the Connect section.
8. **`api_usage_logs` lacks per-key attribution** — add `api_key_id` (17).
9. **Kill switch** — disable Connect without a deploy (19).

## 22. Second review — additional gaps (each a decision)
Found on a deeper pass against the existing edge/middleware and product rules.

**22.1 proxy.ts will BLOCK browser-origin key calls (bug-in-waiting).**
`isCsrfExempt()` exempts a Bearer request only when there is no session cookie
**and** (no Origin OR a chrome-extension origin). A browser-based agent calling
`/api/v1/*` with a `prk_` key **and an http(s) Origin** is currently **not
exempt → 403 CSRF**. Server-side callers (no Origin) are fine. → **Add
`/api/v1/` to the CSRF-exempt prefixes** (it is key-authenticated, not
cookie-authenticated) and **do NOT** add it to `AUTH_REQUIRED_PREFIXES` (auth is
the key, resolved in-route, not the middleware session). Add proper **CORS**
headers for cross-origin REST.

**22.2 Cache-hit credit policy.** The enhance pipeline has a cache (prompt+mode+
lang). → A **cache hit is FREE** on the API (no LLM spend, better UX); only a
real generation spends a credit. Response includes `cache_hit: boolean`.

**22.3 Output language default.** Product is Hebrew-first, but agent users are
often English. → `enhance_prompt` **auto-detects output language from the prompt**
(fallback Hebrew) with an explicit `output_language` override. Image/Video stay
English (platform rule in CLAUDE.md) — documented.

**22.4 `mode_options` validation from the single source.** Validate required
fields per mode by reusing **`CAPABILITY_CONFIGS[mode].requiredFields`** (e.g.
VIDEO needs `camera_movement`+`duration`) — never a second hard-coded list.
Missing → `400 invalid_request` naming the field.

**22.5 Contract source of truth = OpenAPI.** Publish an **OpenAPI 3.1 spec** for
`/api/v1`; generate the DOCS reference, the MCP tool JSON-schemas, and any future
SDK snippets from it — so the three never drift.

**22.6 Acceptable use + light guardrail.** Add an API/agent **acceptable-use**
clause; since Peroot outputs prompts (not final media) risk is lower, but add a
minimal deny/log hook for egregious abuse and per-key anomaly alerting.

**22.7 Analytics for the funnel.** PostHog events: `connect_key_created`,
`connect_first_enhance`, `connect_trial_exhausted`, `connect_upgrade_clicked`
— measure activation + upsell conversion (the free-taste ROI).

**22.8 GDPR / account deletion.** Ensure `developer_api_keys` (FK cascade ✓) and
`api_usage_logs` are removed on account deletion; add to the delete-account flow
and verify cascade.

**22.9 Plan downgrade & key rotation.** Plan tier is checked **live per call**, so
a PRO→free downgrade makes keys fall to the non-PRO taste/`402` automatically.
Key rotation = create new + revoke old (no forced grace; both can be active
briefly). Document.

**22.10 Concurrency cap.** Beyond req/min, cap **simultaneous in-flight** API
enhances per user (e.g. 3) so one agent can't monopolize the gateway queue.

**22.11 MCP `resources` (future / non-goal v1).** Later, expose the user's
library as browsable MCP **resources**; explicitly out of v1 to keep scope tight.

### Non-goals (v1) — stated so scope stays honest
Team/multi-seat keys · context file/URL ingestion via API · webhooks/events ·
`suggest_mode` auto-detect · MCP resources · SDK packages (snippets only).
