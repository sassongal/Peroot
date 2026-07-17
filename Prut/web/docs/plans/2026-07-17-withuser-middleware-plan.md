# `withUser` — Implementation Plan

**Date:** 2026-07-17
**Status:** Approved (design settled via `/grilling`)
**Goal:** Give "authenticated / guest-allowed credit-gated endpoint" a single **deep module** — the sibling of `withAdmin` — so the auth → tier → rate-limit → credit → refund → error preamble stops being re-encoded (and drifting) across ~30 routes.

Design vocabulary: `/codebase-design`. Domain seam recorded in `CONTEXT.md` → *Credit-gated endpoint · `withUser`*.

---

## 1. Why

The app's most common concept has **no module**. The preamble is copy-pasted across ~36 routes and has already drifted (`chain` omits the in-flight lock; `context/*` uses a different limiter; the RLS-vs-service-role client choice is hand-written in ~10 files as a footgun; ~306 hand-written error shapes). `withAdmin` already proves the wrapper pattern works here (~50 admin routes). `withUser` is the missing half.

**Auth in scope:** cookie **and** Bearer session token (revised from the original grilling — Bearer turned out to be the common case across `me`/`favorites`/`history`/`personal-library`, and centralizing its client choice *is* the candidate-#2 footgun fix). **Out of scope:** `enhance` keeps its bespoke preamble — `prk_` developer API keys, profile cache, in-flight lock. Pulling those into `withUser` would widen the interface and kill its depth.

---

## 2. Interface (the small door)

```ts
type Bucket = keyof typeof rateLimiters;

interface WithUserOptions {
  rateLimit: Bucket | ((tier: Tier) => Bucket) | "none";  // REQUIRED
  credits?: number;                                        // opt-in
  allowGuest?: boolean;                                    // default false
}

interface UserCtx {
  user: User | null;          // null only when allowGuest && unauthenticated
  db: SupabaseClient;         // ONE correctly-scoped client, chosen centrally
                              //   (RLS cookie client, or service-role for Bearer)
  get tier(): Promise<Tier>;  // lazy: 'free' | 'pro' | 'admin' | 'guest'
  get isAdmin(): Promise<boolean>; // lazy (user_roles = canonical source)
  refund(): Promise<void>;    // idempotent; for streaming mid-flight failure
}

type UserHandler<C> = (req: NextRequest, ctx: UserCtx, routeContext: C) => Promise<Response>;

export function withUser<C>(handler: UserHandler<C>, opts: WithUserOptions): (req: NextRequest, ctx: C) => Promise<Response>;
```

**Location:** `src/lib/api-middleware.ts`, beside `withAdmin`. (Do not rename the file.)

---

## 3. Behavior owned behind the interface

Ordering inside the wrapper:

1. **Auth** (cookie **or** Bearer). Read `Authorization: Bearer <token>`; if present, resolve via `supabase.auth.getUser(token)` and require `user.aud === "authenticated"` (401 `invalid_token` otherwise). Else resolve the cookie session via `supabase.auth.getUser()`. `prk_` API keys are **not** handled (enhance-only).
   - Not `allowGuest` and no user → **401** (`auth_required`), handler never runs.
   - `allowGuest` and no user → `ctx.user = null`, continue as guest.
2. **Client (chosen centrally — the footgun fix).** `ctx.db` = the RLS cookie client for cookie auth; the **service-role** client for Bearer auth (RLS has no `auth.uid()` on a token passed to `getUser`). `withUser` owns this choice so no route writes `bearer ? service : rls` again; handlers always scope by `ctx.user.id`.
3. **Tier/admin** resolved **lazily** — only touched if `credits`, a tier-varying `rateLimit` fn, or the handler reads `ctx.tier`/`ctx.isAdmin`. Combined `profiles` + `user_roles` query, parallel. **No cache in v1.**
4. **Admin bypass.** If `isAdmin`: skip rate-limit and credit charge; emit one structured log line (`[withUser] admin bypass`).
5. **Rate-limit** (unless bypassed or `"none"`). Resolve bucket (name or `fn(tier)`); key on `user.id` (authed) or validated client IP (guest — `x-real-ip`/rightmost `x-forwarded-for`, `net.isIP()`-checked, mirroring enhance). Fail → standard **429** (`Retry-After` + `X-RateLimit-*` + Hebrew `too_many_requests`).
6. **Credit charge** (if `credits` and not bypassed). Charge eagerly via `checkAndDecrementCredits`. Insufficient → **402** (`insufficient_credits`, includes `balance`), handler never runs.
7. **Run handler.** Then enforce **"charged only on a 2xx"**:
   - Handler **throws** → refund (if charged) → shaped **500**.
   - Handler returns status **≥ 400** → refund (if charged) → return handler's response as-is.
   - Handler returns **2xx** → keep the charge.
   - **Streaming:** handler returns 200 immediately; failure happens mid-stream where the 2xx rule can't see it → handler calls `ctx.refund()` on its error path. `refund()` is idempotent, so double-refund is safe.

**Error shape:** all wrapper responses go through the re-homed error helper (§4).

---

## 4. Sub-deliverable — re-home `api-error.ts`

`src/lib/api-error.ts` is unused (0 importers) and wrong (English + `UPPER_CASE`). Replace its body with the app convention — **Hebrew message + snake_case code** — and export helpers used by `withUser` internally *and* available to handlers:

```ts
errors.unauthorized()   // 401 { error: "נדרשת התחברות", code: "auth_required" }
errors.insufficientCredits(balance) // 402 { error: "...", code: "insufficient_credits", balance }
errors.rateLimited(reset)  // 429 + Retry-After + X-RateLimit-*
errors.internal()       // 500 { error: "שגיאת שרת", code: "server_error" }
errors.badRequest(msg)  // 400
// messages overridable per call.
```

Do **not** mass-migrate the ~306 existing call sites in this change — build the helper, wire `withUser` through it, leave broader adoption as opportunistic follow-up. Delete/replace `src/lib/__tests__/api-error.test.ts` (it tests the dead English shape).

---

## 5. Testability (DI seam)

`withUser` takes its collaborators through an internal `deps` object with real defaults (`{ getUser, checkRateLimit, checkAndDecrementCredits, refundCredit, resolveTier }`), overridable in tests. Public callers write `withUser(handler, opts)` unchanged — the seam is invisible to them, so interface depth is preserved.

---

## 6. Build order (TDD — tests first, per Q9)

### Phase 0 — Types & error helper
- Re-home `api-error.ts` (§4) + tests for the Hebrew/snake_case shape.

### Phase 1 — `withUser` under test (red → green)
Write `src/lib/__tests__/api-middleware.withUser.test.ts` asserting, through the interface, with fake `deps`:
- [ ] no user + `!allowGuest` → 401, handler not called
- [ ] no user + `allowGuest` → handler runs with `ctx.user === null`
- [ ] cookie auth → `ctx.db` is the RLS cookie client
- [ ] Bearer auth (valid) → user resolved via `getUser(token)`; `ctx.db` is service-role
- [ ] Bearer auth with `aud !== "authenticated"` → 401 `invalid_token`
- [ ] the wrapper never leaves the client choice to the handler (no conditional in caller)
- [ ] tier/admin **not** resolved when unused (spy: 0 calls)
- [ ] admin → rate-limit skipped, credit skipped, bypass logged
- [ ] rate-limit fail → 429 with `Retry-After` + `X-RateLimit-*`
- [ ] guest rate-limit keys on validated IP; bad IP → 400 `unidentified_source`
- [ ] tier-varying `rateLimit(fn)` selects the right bucket per tier
- [ ] insufficient credits → 402 with `balance`, handler not called
- [ ] **charged only on 2xx:** throw → refund + 500; ≥400 → refund + passthrough; 2xx → no refund
- [ ] streaming: `ctx.refund()` idempotent (double call = one refund)
Then implement `withUser` to green.

### Phase 2 — Representative migration (validate against the extremes)
Migrate 4 routes chosen to exercise every path, verifying behavior is unchanged:
- [x] `src/app/api/favorites/route.ts` — **Bearer** + cookie, `favorites` bucket (validates the centralized client choice)
- [x] `src/app/api/me/route.ts` — **Bearer** + cookie, keeps its own profile read
- [x] `src/app/api/chain/generate/route.ts` — cookie + credits (2) + tier-varying bucket; handler dropped all manual refund bookkeeping (auto-refund on ≥400)
- [x] `src/app/api/folders/route.ts` — cookie-only; POST `folders` bucket, GET/PATCH/DELETE `"none"`

**Intentional deltas on `chain/generate`** (client reads only `data.error`, so none break it):
- insufficient credits: `403 {remaining}` → `402 {code:"insufficient_credits", balance}` (standardized)
- 429 shape standardized (`rate_limited` + `Retry-After`/`X-RateLimit-*`); guest is now 401 `auth_required` (not a chain-specific message)
- admins now bypass the rate-limit too (previously charged the `pro` bucket) — matches the Q8 "admins bypass both" decision
- credit is charged before input validation; an invalid request returns 400 and the charge auto-refunds (net-zero)

### Phase 3 — Verify & land
- [ ] `npm run typecheck` · `npm run test` · `npm run lint`
- [ ] Manually exercise chain (guest, free-exhausted → 402, admin bypass) and favorites — confirm parity with pre-refactor behavior.
- [ ] Commit: `refactor(api): add withUser deep module for credit-gated endpoints`.

### Follow-ups (separate small PRs)
- Migrate remaining ~25 in-scope routes opportunistically.
- Consider a tier cache behind `ctx.tier` **only if** profiling shows it's hot.
- Opportunistically move hand-written error shapes onto `errors.*`.

---

## 7. Risks & mitigations

- **Behavior drift during migration** → migrate one route per commit; diff the old preamble against `withUser`'s guarantees before deleting it.
- **Streaming refund missed** → `refund()` idempotent + covered by test; chain manually verified in Phase 3.
- **Guest IP keying** → reuse enhance's exact `net.isIP()`-validated extraction, not a fresh implementation.
- **`enhance` left out** feels inconsistent → intentional and documented in `CONTEXT.md`; enhance may adopt a *slice* later once the common surface is proven.
