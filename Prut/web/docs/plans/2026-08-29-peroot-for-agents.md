# Peroot Connect — plan (v0.2, 2026-08-29)

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
- **Layer 2 — Remote MCP server**: an HTTP/SSE MCP endpoint (hosted as a Next
  route or a Worker) that exposes the same capability as MCP tools + ships the
  bundled instruction prompts. Auth: `prk_` (P1–2) then OAuth (P3).
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
