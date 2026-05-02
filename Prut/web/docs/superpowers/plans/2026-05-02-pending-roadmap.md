# Peroot — Pending Roadmap (audit 2026-05-02)

> Audit performed by walking every plan in `docs/superpowers/plans/` and verifying against current code. Each plan now carries a `STATUS:` header on its first line.

---

## ✅ Already shipped (verified in code)

| Plan | Verification |
|---|---|
| `2026-03-10-peroot-master-plan` | Archived — superseded |
| `2026-03-12-production-readiness` | Archived — live in prod |
| `2026-04-07-prompt-entity-dates-beforeafter` | Archived — shipped |
| `2026-04-09-context-engine` | Superseded by v2 |
| `2026-04-12-connect-unfinished-features` | Feature A done; Feature B intentionally deleted |
| `2026-04-27-prompt-scoring-improvements` | `input-scorer.ts` has Hebrew keyword expansion + density tiers |
| `2026-04-28-admin-dashboard-sync-and-credits-row` | `usage_last_7_days` + sparkline + `last_spend_at` integrated |
| `2026-04-28-admin-tier-change-and-credits` | Tier dropdown UI references confirmed in admin pages |
| `2026-04-28-context-engine-v2` | A (relevance), B (compression strategies), C (image passthrough) all live |
| `2026-04-28-context-injection-improvements` | `rawText` + `tokenBudget` in `inject.ts` (21 refs) |
| `2026-04-28-engine-accuracy-update` | `wan.ts`, `sora.ts`, audio scoring shipped |
| `2026-04-28-library-mobile` | `LibraryBottomNav` + `overflow-x-hidden` integrated |
| `2026-04-28-original-prompt-in-library` | DB col + types + 3 HomeClient sites + card UI |
| `2026-04-28-prompt-graph-diagnostic` | Score-based node sizing (17 refs in `PromptGraphView.tsx`) |
| `2026-04-29-extension-v2-server-side-m1-m2` | `/api/extension-config` + `/api/extension-telemetry` + `target_model` parameter |
| `2026-04-29-extension-v2-m3-selector-registry` | `chrome-extension-v2.1/lib/config-store.js` shipped |
| `2026-05-01-decouple-questions` | `/api/enhance/questions` route exists; rate limiter has `questions` |
| `2026-05-02-graph-daily-tool` | `computeInsights` + `GraphInsightOverlay.tsx` shipped |

---

## 🟡 Genuinely pending

_None._ P1 (HistoryPanel toggle) is already shipped — `HistoryPanel.tsx:341-363` renders the "הצג פלט משודרג" collapsible (default = original, expand = enhanced). Test coverage in `HistoryPanel.test.tsx`. The earlier audit missed it because it searched for the column name `original_prompt` instead of the rendered field `item.original`.

---

## 🆕 Backlog (not yet planned)

These came out of the 2026-05-02 codebase review. None are critical (the original critical findings turned out to already be fixed). Listed in priority order:

### B1. Squash same-day migrations
Several `20260413_*` and `20260428_*` migrations could be collapsed for readability. Pure hygiene — no behavior change.

### B2. Hebrew/RTL spot-check on server error toasts
Server-side errors in API routes return English `{ error: "..." }` strings. Spot-check that user-visible toasts in `useToast`/`Toaster` consumers Hebrew-localize the common ones.

### B3. `.env.example` parity check
Verify every key validated in `src/lib/env.ts` is mirrored in `.env.example` (Upstash, Resend, LemonSqueezy, Sentry DSN, GA4, Clarity).

### B4. Replace `@react-pdf/renderer` with `pdf-lib`
Currently working but documented as a Windows gotcha in `CLAUDE.md`. Migration would remove the dynamic-import requirement.

### B5. `web-legacy/` directory at repo parent
Confirm intentional or move out of active tree (`C:\Users\sasso\dev\Peroot\web-legacy`).

### B6. Husky on Windows
Document `npm run preflight` as the manual fallback in `CONTRIBUTING.md` since husky doesn't run.

### B7. Bundle analyzer Linux/CI fix
`@next/bundle-analyzer` no-op on Windows; gate already in place but should work cross-platform when `ANALYZE=true`.

---

## Recently shipped this session

- `7695d61` — `fix(credits): bump last_prompt_at for all tiers on every spend`
- `ada3ec9` — `fix(enhance): surface history insert failures to Sentry`

These closed the only two real open bugs from the May-2 review.
