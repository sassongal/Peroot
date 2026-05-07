# Peroot Event Taxonomy

Single source of truth for every PostHog event we emit. Update this file
whenever you add, rename, or remove an event. Dashboards in `scripts/posthog/setup-dashboards.ts`
reference these names.

## Conventions

- **snake_case** event names; nouns describe the *what*, verbs the *when*.
- **Properties** are flat (no nested objects). Use `null` for absent values, not `undefined`.
- **Client events** fire from `src/lib/analytics.ts` helpers.
- **Server events** fire from `src/lib/analytics-server.ts` helpers (Vercel functions, webhooks).
- **Don't capture PII** in property values. User IDs are fine (Supabase `auth.users.id`); emails are not.
- Prefer **server capture** for billing/credit events (ad-blocker resistant) and **client capture** for UI engagement.

## Index

| Event | Source | Purpose | Dashboards |
|---|---|---|---|
| `$pageview` | client (auto) | Page view | — (autocapture) |
| `$pageleave` | client (auto) | Page leave | — |
| `prompt_enhance` | client | User submitted a prompt to be improved | Activation, Retention |
| `enhance_complete` | client | Enhancement finished (with score) | Activation |
| `prompt_copy` | client | User copied an output prompt | — |
| `library_prompt_use` | client | Public library prompt → "use in Peroot" | Activation |
| `user_signup` | client | Signup form submitted successfully | Activation |
| `feature_use` | client | First-use marker for a discoverable feature | — |
| `chain_run` | client | User completed all steps of a prompt chain | — |
| `target_model_select` | client | Target model picked in improver | — |
| `blog_share` | client | Social share button click | — |
| `palace_sidebar_opened` | client | Memory Palace sidebar shown (desktop) | Memory Palace |
| `palace_sidebar_collapsed` | client | Sidebar collapsed by user | Memory Palace |
| `palace_drawer_opened` | client | Memory Palace drawer opened (mobile) | Memory Palace |
| `palace_node_clicked` | client | Single click on a graph node | Memory Palace |
| `palace_node_double_clicked` | client | Double click → navigate to prompt | Memory Palace |
| `palace_navigated_to_prompt` | client | Navigation completed from palace | Memory Palace |
| `palace_empty_state_shown` | client | Empty state with reason | Memory Palace |
| `paywall_hit` | client + server | Free user blocked by daily/monthly limit | Conversion |
| `checkout_opened` | client | LemonSqueezy checkout modal/redirect | Conversion |
| `subscription_started` | server | Webhook: order_created → Pro active | Conversion |
| `subscription_cancelled` | server | Webhook: subscription_cancelled | Conversion |
| `prompt_engine_invoked` | server | Engine called (engine, mode, durationMs, success) | — |
| `credit_decremented` | server | Credit RPC succeeded | — |

## Property reference (per event)

### `prompt_enhance`
- `category: string`
- `mode: string` — engine identifier (e.g. `standard`, `image`)
- `input_length: number`

### `enhance_complete`
- `mode: string`
- `score: number` — 0–100 quality score
- `duration_ms: number`

### `palace_node_clicked`
- `from_id: string` (UUID)
- `to_id: string` (UUID)
- `edge_type: "similarity" | "cooccurrence" | "both"`
- `hop_index: number` — how deep the user navigated within one palace session

### `palace_empty_state_shown`
- `reason: "no_selection" | "no_neighbors" | "too_few_prompts"`

### `paywall_hit`
- `reason: "daily_limit" | "feature_locked" | "monthly_limit"`
- `context: string | null` — surface that triggered it (e.g. `prompt_improver_submit`)

### `checkout_opened`
- `plan: "pro_monthly" | "pro_yearly"`

### `subscription_started`
- `plan: "pro_monthly" | "pro_yearly"`
- `lemonsqueezy_order_id: string`

### `prompt_engine_invoked`
- `engine: string`
- `mode: string`
- `duration_ms: number`
- `success: boolean`

### `credit_decremented`
- `plan: "free" | "pro"`
- `remaining: number`

## Adding an event

1. Add a typed helper in `analytics.ts` (client) or `analytics-server.ts` (server) — never call `posthog.capture` directly from feature code.
2. Add the row to the **Index** table above and a property block to the **Property reference**.
3. If it belongs on a dashboard, update `scripts/posthog/setup-dashboards.ts` and run `npm run posthog:setup` — the script is idempotent.
4. Verify in PostHog → Activity that the event arrives.
