# Peroot Chrome extension (v3)

Manifest V3. No build step: the folder is the extension. `npm run extension:build`
packages it into `dist/peroot-extension-<version>.zip` for the Web Store after
checking that every file the manifest names exists and every script parses.
`npm run extension:test` runs the unit tests in `lib/__tests__`.

## Load it for development

1. `chrome://extensions`, Developer mode on, "Load unpacked", pick this folder.
2. Sign in from the toolbar popup (Google, or email and password).
3. Open ChatGPT, Claude or Gemini: the gold button sits beside the composer.

## Layout

| Path | Job |
|---|---|
| `manifest.json` | permissions, the three chat hosts, the popup and options pages |
| `background/service-worker.js` | context menu, keyboard command, token and config refresh alarms, API proxy for content scripts (one-shot `API_FETCH` and the streaming `peroot-stream` port), on-demand injection of the selection panel, credits badge on the icon |
| `lib/auth.js` | Google sign-in via `chrome.identity`, email sign-in, refresh, bearer headers |
| `lib/api.js` | API client for extension pages: `streamEnhance`, `me`, `library`, `history`, `announcements`, telemetry |
| `lib/prefs.js` | every preference (mode, tone, output language, theme, inline toolbar), synced across the person's Chrome profiles; `adoptProfileLanguage` follows the choice made in the web profile |
| `lib/language.js` | the four output languages and script detection, mirrors `src/lib/output-language.ts` |
| `lib/prompt-text.js` | trailer parsing (`[PROMPT_TITLE]`, `[GENIUS_QUESTIONS]`), self-review stripping, long-dash scrub, JSON extraction, mirrors `src/lib/prompt-stream/trailer.ts` |
| `lib/config-store.js`, `lib/selector-registry.js`, `lib/target-model.js`, `lib/telemetry.js` | server-managed selectors and model profiles (`/api/extension-config`), per-host model override, best-effort telemetry |
| `popup/popup.*` | the toolbar window: enhance (modes, tone, language, readiness meter, streamed result, refinement questions, feedback), library with search and favourites, history, "what's new" line |
| `popup/options.*` | account, defaults, theme, inline toolbar, shortcuts, what's new, maintenance |
| `content/ai-chat-injector.*` | the button beside the composer on the three chat sites, the streamed preview card, the mode menu, the library side panel, conversation export |
| `content/content.*` | injected on demand on any site: the right-click selection panel and the floating toolbar on text fields |
| `content/auth-sync.js` | on peroot.space only: copies the session into the extension so signing in on the site signs in the extension |

## Contracts with the web app

- `POST /api/enhance` with `capability_mode`, `tone`, `target_model`,
  `model_profile_slug`, `output_language` (hebrew, english, arabic, russian),
  `mode_params`, and for refinement `previousResult`, `refinementInstruction`,
  `answers`. The stream ends with the trailer parsed by `lib/prompt-text.js`.
- `GET /api/me` returns `plan_tier`, `credits_balance`,
  `preferred_output_language`; the extension adopts the language unless the
  person chose one in the extension after that.
- `GET /api/announcements` feeds the "what's new" line and the options page.
- Storage keys are unchanged from v2 (`peroot_last_mode`, `peroot_output_language`,
  ...), so an upgrade keeps what people chose.

## Rules

- Hebrew-first, no long dashes in anything a person sees (same law as the web app).
- One gold: the primary action and the active state, nothing else.
- Both themes: the popup and options follow the theme preference (system, dark,
  light); content-script surfaces follow `prefers-color-scheme`.
- Never put a secret here. The anon key is public by design; everything else
  is a bearer token the person obtained by signing in.
