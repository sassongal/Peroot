# Peroot AI — Full Overhaul Design

**Date:** 2026-03-09
**Approach:** C — Full Overhaul (7-10 days, +$5-15/month)
**Budget:** Up to $50/month total
**Priorities:** UX & User Experience, AI Quality & Speed, Stability & Performance

---

## Section 1: Architecture — Component Decomposition

**Problem:** `src/app/page.tsx` is 685 lines with 15+ `useState` calls, duplicate streaming logic in `handleEnhance` and `handleRefine`, and ~30 eager imports.

### 1.1 `usePromptWorkflow` Reducer
Extract all prompt state into a single `useReducer` in `src/hooks/usePromptWorkflow.ts`:
- Actions: `SET_INPUT`, `START_STREAM`, `STREAM_CHUNK`, `STREAM_DONE`, `SET_ERROR`, `RESET`
- Single `PromptState` object replaces 15+ individual `useState` calls

### 1.2 `useStreamingCompletion` Hook
Extract shared streaming logic into `src/hooks/useStreamingCompletion.ts`:
- Handles both enhance and refine flows (currently duplicated)
- Manages `AbortController`, chunk accumulation, error handling
- Returns `{ startStream, abort, isStreaming }` interface

### 1.3 `useAuth` Hook
Extract Supabase auth state into `src/hooks/useAuth.ts`:
- Session management, user profile, plan tier
- Currently scattered across `page.tsx` with direct `supabase.auth` calls

### 1.4 Lazy Loading Below-Fold Components
Use `next/dynamic` for 6 components that aren't visible on initial load:
- `PromptHistory`, `PersonalLibrary`, `AchievementsPanel`, `SmartRefinement`, `VariableManager`, `ResultSection`

**Target:** `page.tsx` from 685 → ~200 lines.

---

## Section 2: AI Gateway & Model Routing

### 2.1 Task-Based Model Routing
Replace static `FALLBACK_ORDER` in `src/lib/ai/models.ts` with a `TASK_ROUTING` map:

```typescript
export const TASK_ROUTING: Record<string, ModelId[]> = {
  enhance:  ['gemini-2.0-flash', 'deepseek-chat', 'llama-3-70b'],
  research: ['deepseek-chat', 'gemini-2.0-flash'],
  agent:    ['gemini-2.0-flash', 'llama-3-70b'],
  image:    ['gemini-2.0-flash', 'gemini-1.5-flash'],
};
```

Update `AIGateway.generateStream` to accept a `task` parameter and use the corresponding routing.

### 2.2 Response Caching
Add SHA-256 hash-based caching in Redis for identical prompts:
- Key: `cache:prompt:<sha256(system+prompt+task)>`
- TTL: 1 hour
- Skip cache when `temperature > 0` or user explicitly requests fresh response
- Implementation in `src/lib/ai/gateway.ts`

### 2.3 Rate Limiter Migration
Replace the manual 95-line fixed-window implementation in `src/lib/ratelimit.ts` with `@upstash/ratelimit` (already installed, not used):

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

export const rateLimiters = {
  guest: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "1h") }),
  free:  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "1h") }),
  pro:   new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(200, "1h") }),
};
```

### 2.4 Middleware Optimization
Remove the Supabase DB query from `src/middleware.ts` (runs on EVERY request):

```typescript
// REMOVE THIS:
const { data: settings } = await supabase
  .from('site_settings')
  .select('maintenance_mode')
  .single();
```

Replace with Vercel Edge Config or Upstash Redis GET (sub-1ms reads). Fallback: cache `maintenance_mode` in Redis with 60-second TTL, refresh via Supabase real-time subscription.

---

## Section 3: Performance & Caching (Client-Side)

### 3.1 Dynamic Imports & Code Splitting
Apply `next/dynamic` with `ssr: false` to 6 below-fold components:
- `PromptHistory` — loaded on tab switch
- `PersonalLibrary` — loaded on tab switch
- `AchievementsPanel` — loaded on demand
- `SmartRefinement` — loaded after result appears
- `VariableManager` — loaded on demand
- `ResultSection` — loaded after streaming starts

### 3.2 Dead Dependency Audit
Run `npx depcheck` and remove unused dependencies:
- **Remotion** (4.0.409) — large package, check if actually used in production
- **Recharts** — verify if dashboard actually renders charts
- **react-markdown** — verify usage
- Remove any unused `@radix-ui/*` sub-packages

### 3.3 `optimizePackageImports` Expansion
Add to `next.config.ts`:
```typescript
optimizePackageImports: [
  'lucide-react', 'date-fns', 'recharts',
  '@radix-ui/react-slot',
  'posthog-js',        // NEW
  '@sentry/nextjs',    // NEW
  'react-markdown',    // NEW
],
```

### 3.4 Client-Side Response Cache
Add an in-memory `Map` cache in `usePromptWorkflow`:
- Key: `${engineId}:${inputHash}`
- Max 20 entries (LRU eviction)
- Instant replay for repeated prompts without API call

---

## Section 4: UX Improvements

### 4.1 i18n Consistency
Fix `SmartRefinement.tsx` which has hardcoded Hebrew strings (lines 45-46, 99, 128-129, 139, 155, 160) not using the `useTranslation` system. Add keys to `src/lib/i18n/`:

```typescript
smart_refinement: {
  categories: "קטגוריות שיפור",
  select_focus: "בחר תחום התמקדות",
  refine_button: "שפר עם התמקדות",
  // ...
}
```

### 4.2 Streaming Progress Indicator
Replace the simple spinner with a multi-stage indicator:
1. **שולח** (Sending) — request initiated
2. **מעבד** (Processing) — first token wait
3. **כותב** (Writing) — streaming chunks
4. **מסיים** (Finishing) — stream complete, scoring

Implementation: Add `streamPhase` to `useStreamingCompletion` state.

### 4.3 One-Click Iteration Loop
Add a "שפר שוב" (Improve Again) button to `ResultSection.tsx`:
- Feeds current output back as input to `handleEnhance`
- Preserves engine selection and category
- Shows iteration count badge (e.g., "שיפור #2")

### 4.4 Mobile Touch Targets
Ensure minimum 44px touch targets for:
- Voice recording mic button
- Category/capability selector
- Accordion/collapsible section buttons
- Copy and save action buttons
- Audit via Tailwind: `min-h-11 min-w-11` (44px)

### 4.5 Keyboard Shortcuts
- `Escape` — clear input or close open modals/panels
- `Cmd+Shift+C` (Mac) / `Ctrl+Shift+C` (Windows) — copy result to clipboard
- Implementation: `useEffect` with `keydown` listener in `page.tsx`

---

## Section 5: Pro Tier & Analytics

### 5.1 Simple Pro Plan
Three tiers leveraging existing credit system:

| Tier | Price | Credits | Features |
|------|-------|---------|----------|
| Guest | Free | 3 prompts (localStorage) | Basic enhance only |
| Free | Free | 20/month (DB) | All engines, history (30 days) |
| Pro | $9.99/month | 500/month | Priority models, full history, no ads |

Implementation:
- Stripe Checkout session via `src/app/api/stripe/checkout/route.ts`
- Webhook at `src/app/api/stripe/webhook/route.ts` to update `profiles.plan_tier`
- Monthly credit reset via Supabase scheduled function (or Vercel cron)

### 5.2 Analytics Cleanup
Audit PostHog usage across 30+ files. Keep only 5-7 critical events:
1. `prompt_enhanced` — core conversion
2. `prompt_refined` — iteration usage
3. `signup_completed` — funnel
4. `upgrade_initiated` — revenue
5. `credit_exhausted` — churn signal
6. `engine_selected` — feature usage
7. `error_occurred` — stability

Disable PostHog `autocapture` to reduce noise and costs. Remove all other tracking calls.

### 5.3 Credit Usage Dashboard
Add a compact widget to the `UserMenu` component:
- Progress bar showing credits used / total
- Color transitions: green → yellow (80%) → red (100%)
- Uses existing `usePromptLimits` hook data
- Links to upgrade page when low

### 5.4 Smart Upgrade Nudges
Two trigger points:
1. **80% usage** — Yellow banner at top: "נותרו לך X קרדיטים החודש"
2. **100% usage** — Modal with two options:
   - "שדרג ל-Pro" → Stripe Checkout
   - "המתן לאיפוס" → Shows reset date

---

## Technical Constraints

- **Budget:** All AI models remain free-tier (Gemini, Groq, DeepSeek)
- **Hosting:** Vercel free/hobby tier + Supabase free tier + Upstash free tier
- **Pro tier revenue** covers additional costs ($9.99/user/month)
- **No breaking changes** to existing user data or URLs
- **Hebrew-first** UI with existing i18n infrastructure
- **basePath `/peroot`** must be preserved throughout

## Estimated Timeline

| Section | Effort |
|---------|--------|
| 1. Architecture | 2 days |
| 2. AI Gateway | 1.5 days |
| 3. Performance | 1 day |
| 4. UX | 1.5 days |
| 5. Pro Tier | 2 days |
| Testing & Polish | 1 day |
| **Total** | **~9 days** |
