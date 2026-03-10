# Peroot — Flawless Product Audit & Improvement Plan

**Date:** 2026-03-10
**Goal:** Make Peroot a flawless, production-grade SaaS product. This plan covers every gap found through a comprehensive user-perspective audit of every feature, flow, and edge case.

**Scope:** 8 sections, 47 improvements, prioritized by impact.

---

## Table of Contents

1. [Library & Favorites Logic](#1-library--favorites-logic)
2. [Core Enhancement Flow](#2-core-enhancement-flow)
3. [Authentication & Security](#3-authentication--security)
4. [Credit System & Rate Limiting](#4-credit-system--rate-limiting)
5. [UX Polish & Edge Cases](#5-ux-polish--edge-cases)
6. [Settings & Account Management](#6-settings--account-management)
7. [SEO, Performance & Infrastructure](#7-seo-performance--infrastructure)
8. [Admin Dashboard Gaps](#8-admin-dashboard-gaps)

---

## 1. Library & Favorites Logic

### 1.1 Smart Auto-Categorization on Save (HIGH)

**Problem:** When a user saves an enhanced prompt to their personal library, they must manually pick a category. The system already knows the category from the enhancement request but doesn't use it.

**Fix:**
- Auto-populate `personal_category` from the enhancement's `selectedCategory` when saving from ResultSection
- If the category doesn't exist in user's personal categories, create it automatically
- Still allow override via dropdown

**Files:** `src/app/page.tsx` (save handler), `src/hooks/useLibrary.ts` (addPrompt)

---

### 1.2 Duplicate Detection on Save (HIGH)

**Problem:** Users can save the same prompt multiple times with no warning. Over time this clutters their library.

**Fix:**
- Before inserting, check if a prompt with identical `prompt` text exists for this user
- If duplicate found, show toast: "פרומפט דומה כבר קיים בספרייה. לשמור בכל זאת?"
- Add "update existing" option alongside "save as new"

**Files:** `src/hooks/useLibrary.ts` (addPrompt), `src/app/page.tsx` (save handler)

---

### 1.3 Favorites Should Show Source Context (MEDIUM)

**Problem:** When viewing favorites, items from the public library and personal library are mixed together with no visual distinction. Users can't tell where a favorited prompt came from.

**Fix:**
- Add a small badge/tag on favorited items: "ספרייה ציבורית" or "ספרייה אישית"
- Use `item_type` field from `prompt_favorites` to distinguish
- In PersonalLibraryView favorites filter, show source as subtitle

**Files:** `src/components/views/PersonalLibraryView.tsx`, `src/components/views/LibraryView.tsx`

---

### 1.4 "Use This Prompt" Flow is Disconnected (HIGH)

**Problem:** When a user selects a prompt from the public library, the connection between "selected library prompt" → "enhance it" → "save result back" is not seamless. The user has to manually navigate between views.

**Fix:**
- When user clicks "Use" on a library prompt, switch to Home view with the prompt pre-filled in input
- After enhancement, offer "Save & Link to Original" which sets `reference` field to the library prompt ID
- Track `use_count` increment on the library prompt when used this way

**Files:** `src/app/page.tsx`, `src/context/LibraryContext.tsx`, `src/components/views/LibraryView.tsx`

---

### 1.5 Personal Library Search is Basic (MEDIUM)

**Problem:** Search only matches title text. Users with 50+ saved prompts can't find what they need efficiently.

**Fix:**
- Extend search to match: title, prompt content, use_case, tags
- Add tag-based filtering (click a tag to filter by it)
- Highlight matching text in search results

**Files:** `src/context/LibraryContext.tsx` (filteredPersonalLibrary), `src/components/views/PersonalLibraryView.tsx`

---

### 1.6 Guest Library Data Loss Risk (MEDIUM)

**Problem:** Guest personal library is stored in `sessionStorage` (cleared on tab close, NOT `localStorage`). A guest who spends 30 minutes saving prompts loses everything when they close the tab.

**Fix:**
- Move guest library storage from `sessionStorage` to `localStorage` with TTL (7 days)
- Show a persistent but subtle banner: "הפרומפטים שלך יישמרו רק 7 ימים. התחבר כדי לשמור לצמיתות"
- On login, migrate localStorage items to DB (existing flow)

**Files:** `src/hooks/useLibrary.ts` (STORAGE_KEY usage, init logic)

---

### 1.7 No Import Functionality (LOW)

**Problem:** Export exists (JSON download) but there's no import. Users who export and re-import or move between accounts can't bring their prompts.

**Fix:**
- Add "Import JSON" button in PersonalLibraryView toolbar
- Validate JSON structure against expected schema
- Deduplicate by title+prompt hash before inserting
- Show import preview with count before confirming

**Files:** `src/components/views/PersonalLibraryView.tsx`, `src/hooks/useLibrary.ts`

---

### 1.8 Library Prompt "Last Used" Tracking (LOW)

**Problem:** Sort by "usage" exists but there's no "last used" date. A prompt used 50 times 6 months ago ranks higher than one used 3 times today.

**Fix:**
- Add `last_used_at` column to `personal_library` table
- Update on each use (when user clicks "Use" or copies)
- Add "Recent" sort option that uses `last_used_at` instead of `use_count`

**Files:** `src/hooks/useLibrary.ts`, new migration for `last_used_at` column

---

## 2. Core Enhancement Flow

### 2.1 Genius Questions Don't Update After Refinement (HIGH)

**Problem:** After the user answers genius questions and refines, the same questions appear again. The API returns NEW questions in the refined response, but the client doesn't parse/display them.

**Fix:**
- In the streaming chunk handler, parse `[GENIUS_QUESTIONS]` from the refinement response
- Dispatch `SET_QUESTIONS` with the new questions
- Clear previous answers when new questions arrive
- If no new questions returned (empty array), show "הפרומפט מקיף — אין שאלות נוספות"

**Files:** `src/app/page.tsx` (onChunk handler ~line 93-117), SmartRefinement.tsx

---

### 2.2 "Improve Again" Loses Original Input (MEDIUM)

**Problem:** When clicking "Improve Again", the enhanced result becomes the new input, and the original user prompt is lost. Users can't get back to their original intent.

**Fix:**
- Store `originalInput` in workflow state (never overwrite it)
- Show "Original prompt" as a collapsible section even after multiple iterations
- Add "Start Fresh from Original" button alongside "Improve Again"

**Files:** `src/hooks/usePromptWorkflow.ts`, `src/app/page.tsx`, ResultSection.tsx

---

### 2.3 No Streaming Visual in Result Display (MEDIUM)

**Problem:** During streaming, text appears in the result area but there's no cursor/typing animation. It looks like the text is jumping in chunks rather than being written.

**Fix:**
- Add a blinking cursor `│` at the end of streaming text (remove on `STREAM_DONE`)
- Smooth chunk arrival with CSS `transition` on text container height
- Optional: typewriter animation for each chunk (configurable)

**Files:** `src/components/features/prompt-improver/ResultSection.tsx`

---

### 2.4 Partial Stream Failure Silent (MEDIUM)

**Problem:** If the stream disconnects mid-response, the partial text is shown but there's no indication it was interrupted. Users may think the shortened result is complete.

**Fix:**
- Detect stream interruption (error during read loop)
- Show amber warning bar: "התגובה נקטעה. לחץ לנסות שוב"
- Include retry button that re-sends the same request
- Don't deduct credits for interrupted streams (server-side: refund if < 50 tokens returned)

**Files:** `src/hooks/useStreamingCompletion.ts`, `src/app/page.tsx`, `src/app/api/enhance/route.ts`

---

### 2.5 Variable Panel UX Issues (LOW)

**Problem:** Variables panel appears when `{placeholders}` are detected, but: (a) empty values are allowed without warning, (b) no indication which variables are required, (c) "Apply" button doesn't give feedback.

**Fix:**
- Mark all variables as required with red asterisk
- Disable "Apply to Prompt" button until all variables have values
- Show toast on apply: "משתנים הוחלו בהצלחה" with count
- Highlight unfilled variables in amber in the live preview

**Files:** `src/components/features/prompt-improver/PromptInput.tsx`

---

### 2.6 Copy with Watermark Should Be Optional (LOW)

**Problem:** Copy always appends "— נוצר עם Peroot | peroot.space". Pro users may want clean copy without branding.

**Fix:**
- Free tier: watermark always added
- Pro tier: toggle option "Copy without watermark" (default: no watermark)
- Store preference in localStorage

**Files:** `src/components/features/prompt-improver/ResultSection.tsx`

---

## 3. Authentication & Security

### 3.1 No Password Reset Flow (CRITICAL)

**Problem:** Users who signed up with email/password have NO way to recover a forgotten password. The auth form has login and signup but no "Forgot password?" link.

**Fix:**
- Add "שכחת סיסמה?" link below password field
- Create `/auth/reset-password` page with email input
- Call `supabase.auth.resetPasswordForEmail(email)`
- Handle the reset callback URL in `/auth/callback`
- Add password update form for the reset flow

**Files:** New: `src/app/auth/reset-password/page.tsx`, Edit: `src/components/auth/auth-form.tsx`, `src/app/auth/callback/route.ts`

---

### 3.2 Account Deletion Doesn't Remove Auth User (HIGH)

**Problem:** Settings page deletes profile data (history, library, favorites) but the `auth.users` entry remains in Supabase. The user's email is still in the system, and they could re-signup creating a ghost account.

**Fix:**
- After deleting profile data, call Supabase Admin API to delete the auth user
- Use service role key server-side: `supabase.auth.admin.deleteUser(userId)`
- Create `/api/user/delete-account` endpoint with proper auth verification
- Client calls this endpoint, then signs out

**Files:** New: `src/app/api/user/delete-account/route.ts`, Edit: `src/app/settings/page.tsx`

---

### 3.3 Admin Role Revocation Not Immediate (MEDIUM)

**Problem:** Middleware only checks if user is authenticated, not their role. Admin role is checked by AdminGuard (client-side) and validateAdminSession (API-side), both querying `user_roles` table. This is correct, but if someone has a cached admin page in their browser, they see the UI until next navigation.

**Fix:**
- AdminGuard already re-checks on mount — this is acceptable
- Add `revalidate` interval to AdminGuard: re-check role every 5 minutes
- On role revocation, show "Access revoked" and redirect to home

**Files:** `src/components/admin/AdminGuard.tsx`

---

### 3.4 CSRF Protection on Sensitive Actions (MEDIUM)

**Problem:** Account deletion, admin actions, and credit grants use POST endpoints but have no CSRF token validation beyond Supabase auth cookies.

**Fix:**
- Supabase auth cookies are HttpOnly + SameSite=Lax, which provides basic CSRF protection
- For extra safety on destructive endpoints (delete account, admin actions), add a server-side check that the request `Origin` header matches the app domain
- Document this in security notes

**Files:** `src/app/api/user/delete-account/route.ts`, `src/app/api/admin/users/[id]/route.ts`

---

## 4. Credit System & Rate Limiting

### 4.1 Free vs Guest Credit Confusion (HIGH)

**Problem:** Three tiers exist (guest, free, pro) with different limit mechanisms:
- Guest: `localStorage` counter, rate limit 5/hour
- Free: `profiles.credits_balance` (20 initial), rate limit 2/24h
- Pro: No credit limit, rate limit 200/hour

The `usePromptLimits` hook tracks guest usage separately from `credits_balance`. The UX doesn't clearly show free users their remaining credits.

**Fix:**
- Unify the display: show a single "remaining prompts" counter for ALL tiers
- Guest: "X/3 prompts remaining today" (from localStorage)
- Free: "X credits remaining" (from profiles.credits_balance)
- Pro: "Unlimited" badge
- Move credit display to the header area (always visible), not just the enhance button area

**Files:** `src/hooks/usePromptLimits.ts`, `src/components/layout/Header.tsx`, `src/app/page.tsx`

---

### 4.2 Guest Daily Reset Not Implemented (HIGH)

**Problem:** `usePromptLimits` stores `lastReset` timestamp in localStorage but never actually checks it to reset the counter. Guest users who used their 3 prompts yesterday are still blocked today.

**Fix:**
- On hook initialization, check if `lastReset` is from a previous day
- If so, reset `count` to 0 and update `lastReset` to today
- Use UTC midnight as the reset boundary for consistency

**Files:** `src/hooks/usePromptLimits.ts`

---

### 4.3 No Credit Replenishment for Free Users (MEDIUM)

**Problem:** Free users get 20 credits at signup and never get more. Once depleted, they're permanently blocked unless they upgrade. No daily/weekly refresh.

**Fix — Choose one approach:**
- **Option A (Recommended):** Daily credit refresh — free users get 3 credits/day, capped at 20 max
- **Option B:** Weekly credit refresh — 10 credits every Monday
- **Option C:** Keep current model but make it clear in UI: "20 lifetime credits, upgrade for more"

Implementation for Option A:
- Add `credits_last_refreshed` column to profiles
- Check on each API call: if > 24h since last refresh, add 3 credits (max 20)
- Or use a Supabase cron job / edge function for batch refresh

**Files:** `src/app/api/enhance/route.ts`, new migration, optionally `supabase/functions/`

---

### 4.4 Rate Limit Redis Fallback Missing (MEDIUM)

**Problem:** If Upstash Redis is down, the rate limiter throws an error and the entire `/api/enhance` endpoint fails with 500. No fallback.

**Fix:**
- Wrap rate limit check in try/catch
- On Redis failure, fall back to a permissive mode (allow request but log warning)
- Or fall back to in-memory rate limiting (per-instance, less accurate but functional)
- Alert via Sentry when Redis is unreachable

**Files:** `src/lib/ratelimit.ts`, `src/app/api/enhance/route.ts`

---

### 4.5 Refund Logic for Interrupted Streams (LOW)

**Problem:** Credit refund only happens on caught exceptions. If the stream starts successfully but disconnects client-side, the credit is already spent but the user got an incomplete result.

**Fix:**
- In `onFinish` callback, check `completion.text.length`
- If < 100 characters (abnormally short), trigger automatic refund
- Log these incidents for monitoring

**Files:** `src/app/api/enhance/route.ts` (onFinish callback)

---

## 5. UX Polish & Edge Cases

### 5.1 No Skeleton Loading States (HIGH)

**Problem:** History panel shows "טוען היסטוריה..." text. Library shows nothing while loading. Settings page has no loading skeleton.

**Fix:**
- Add Skeleton components for: History panel (3 card skeletons), Library grid (6 card skeletons), Settings sections
- Use the existing glass-card style with `animate-pulse` for consistency

**Files:** `src/components/features/history/HistoryPanel.tsx`, `src/components/views/LibraryView.tsx`, `src/app/settings/page.tsx`

---

### 5.2 Mobile Responsiveness Gaps (HIGH)

**Problem:** Several components are desktop-optimized:
- Capability selector is too wide on mobile (overflows)
- ResultSection's quick-launch bar wraps awkwardly
- Admin sidebar doesn't collapse on mobile
- Variable panel side-by-side layout doesn't stack on small screens

**Fix:**
- Audit all components at 375px width
- CapabilitySelector: use horizontal scroll with snap on mobile
- Quick-launch bar: 2-column grid on mobile instead of flex row
- Admin layout: hamburger menu + drawer pattern
- Variable panel: stack below textarea on mobile (already `lg:flex-row` but check breakpoint)

**Files:** Multiple components across the app

---

### 5.3 Empty State Designs Missing (MEDIUM)

**Problem:** Several views have no empty state design:
- Personal library (new user, 0 items): blank area
- History panel (new user): just "No history" text
- Favorites (no favorites yet): blank
- Search with no results: blank

**Fix:**
- Design empty state illustrations/messages for each view:
  - Personal library: "הספרייה האישית שלך ריקה. שדרג פרומפט ושמור אותו כאן"
  - History: "עוד לא שדרגת פרומפטים. נתחיל?"
  - Favorites: "עוד לא סימנת מועדפים. לחץ על ⭐ כדי לשמור"
  - Search no results: "לא נמצאו תוצאות עבור '{query}'"
- Include CTA button that routes to relevant action

**Files:** PersonalLibraryView, HistoryPanel, LibraryView

---

### 5.4 Toast Messages Are Inconsistent (MEDIUM)

**Problem:** Some actions show Hebrew toasts, some English, some no feedback at all. Examples:
- Copy: no toast (just icon change)
- Save to library: Hebrew toast
- Voice error: Hebrew toast
- Share: no toast (just URL shown)
- Export: no toast

**Fix:**
- Standardize all user-facing toasts in Hebrew via i18n
- Add missing toasts: Copy ("הועתק ללוח"), Share ("קישור שיתוף נוצר"), Export ("הנתונים יורדו")
- Use consistent toast types: `toast.success` for actions, `toast.error` for errors

**Files:** Multiple components, `src/i18n/dictionaries/he.json`

---

### 5.5 Keyboard Accessibility Gaps (MEDIUM)

**Problem:**
- No visible focus ring on most interactive elements
- Tab order doesn't follow visual layout in some cases
- Star/favorite buttons not keyboard-accessible
- Escape key doesn't close modals/dropdowns consistently

**Fix:**
- Add `focus-visible:ring-2 focus-visible:ring-amber-500/50` to all interactive elements
- Ensure all modals trap focus and close on Escape
- Add `role="button"` and `tabIndex={0}` to custom clickable elements
- Test full tab-through flow

**Files:** Global CSS additions, component-level fixes

---

### 5.6 RTL Layout Issues (LOW)

**Problem:** Some components have hardcoded `left`/`right` instead of `start`/`end`:
- Dropdown menus positioned with `right-0` instead of `end-0`
- Some margins use `ml-` instead of `ms-`
- Voice recording button position

**Fix:**
- Audit all CSS for directional properties
- Replace `left/right/ml/mr/pl/pr` with `start/end/ms/me/ps/pe`
- Test in both LTR and RTL modes

**Files:** Multiple components

---

### 5.7 Onboarding Flow Incomplete (MEDIUM)

**Problem:** An onboarding API endpoint exists (`/api/user/onboarding/complete`) and `OnboardingOverlay` component exists, but the flow appears minimal. New users don't get a guided tour of features.

**Fix:**
- Create a 3-step onboarding for new users:
  1. "ברוך הבא! Peroot משדרג פרומפטים באמצעות AI" + input demo
  2. "בחר מצב יכולת" + explain 4 modes briefly
  3. "שמור לספרייה האישית שלך" + library intro
- Show once on first login (check `profiles.onboarding_completed`)
- Allow skip at any step
- Mark complete via existing API

**Files:** `src/components/ui/OnboardingOverlay.tsx`, `src/app/page.tsx`

---

## 6. Settings & Account Management

### 6.1 No Billing Management (Manage/Cancel Subscription) (HIGH)

**Problem:** The settings billing tab shows subscription status but has no "Manage Subscription" or "Cancel" button. Users must contact support or go to LemonSqueezy directly.

**Fix:**
- Add "Manage Subscription" button that opens LemonSqueezy customer portal
- LemonSqueezy provides a customer portal URL per subscription
- Store `customer_portal_url` from webhook data in subscriptions table
- Show cancel warning: "ביטול יכנס לתוקף בסוף תקופת החיוב הנוכחית"

**Files:** `src/app/settings/page.tsx`, `src/app/api/webhooks/lemonsqueezy/route.ts` (store portal URL)

---

### 6.2 Profile Editing Not Available (MEDIUM)

**Problem:** Settings shows user name and email but they're read-only (from OAuth metadata). Users can't update their display name.

**Fix:**
- Add editable "Display Name" field
- Save to `profiles.display_name` column (add if missing)
- Use this name across the app (user menu, leaderboard, shared prompts attribution)
- If empty, fall back to OAuth metadata name

**Files:** `src/app/settings/page.tsx`, new migration for `display_name` column

---

### 6.3 Data Export is Incomplete (LOW)

**Problem:** Export downloads history, library, and favorites as JSON. But doesn't include: achievements, usage stats, subscription info, activity logs.

**Fix:**
- Expand export to include all user data (GDPR-compliant full export):
  - Profile info, History, Library, Favorites, Achievements, Activity logs
- Format as structured JSON with clear sections
- Add download timestamp and user ID for verification

**Files:** `src/app/settings/page.tsx`

---

## 7. SEO, Performance & Infrastructure

### 7.1 No OpenGraph / Social Meta Tags (HIGH)

**Problem:** Sharing Peroot links on social media shows no preview image, title, or description. The shared prompt pages (`/p/[id]`) have no dynamic OG tags.

**Fix:**
- Add default OG meta tags in root layout (title, description, image)
- For `/p/[id]` pages, generate dynamic OG tags with prompt preview text
- Create an OG image template (branded Peroot card)
- Add Twitter card meta tags

**Files:** `src/app/layout.tsx`, `src/app/p/[id]/page.tsx`, new: `src/app/api/og/route.tsx` (OG image generation)

---

### 7.2 No Service Worker / Offline Support (LOW)

**Problem:** If the user loses internet mid-session, everything breaks with no graceful handling.

**Fix:**
- Add offline detection banner: "אין חיבור לאינטרנט. חלק מהפעולות לא זמינות"
- Cache the app shell with next-pwa for basic offline access
- Queue failed saves (library, favorites) and sync when back online

**Files:** New: next-pwa config, offline banner component

---

### 7.3 No Request Deduplication (LOW)

**Problem:** Double-clicking the enhance button fast enough can send two API requests. The button is disabled during loading, but there's a race condition window.

**Fix:**
- Add AbortController: abort previous request when new one starts
- Server-side: idempotency key based on (user_id + prompt_hash + timestamp_window)
- Or simpler: client-side debounce with 500ms cooldown after click

**Files:** `src/app/page.tsx` (handleEnhance), `src/hooks/useStreamingCompletion.ts`

---

### 7.4 Bundle Size Not Optimized (LOW)

**Problem:** All admin components are in the main bundle. Library views load even when user is on home view.

**Fix:**
- Lazy-load admin pages (already in separate route group, verify no eager imports)
- Lazy-load LibraryView and PersonalLibraryView with `dynamic(() => import(...))`
- Analyze bundle with `@next/bundle-analyzer` and identify largest modules
- Consider code-splitting the engine system (only load active engine)

**Files:** `src/app/page.tsx`, `next.config.ts`

---

## 8. Admin Dashboard Gaps

### 8.1 No Real-Time Dashboard Updates (MEDIUM)

**Problem:** Admin dashboard shows KPIs as a snapshot. To see new data, admin must refresh the page.

**Fix:**
- Add auto-refresh toggle (every 30s/60s/off)
- Use SWR or React Query with `refreshInterval`
- Show "Last updated: X seconds ago" indicator
- Subtle animation on KPI cards when values change

**Files:** `src/app/admin/page.tsx`

---

### 8.2 No User Search in Admin (HIGH)

**Problem:** Admin users page shows a paginated list but has no search. With 100+ users, finding a specific user by email is impossible without scrolling.

**Fix:**
- Add search input that filters by email, name, or user ID
- Server-side search via API parameter (not client-side filter)
- Debounce search input (300ms)

**Files:** `src/app/admin/users/page.tsx`, `src/app/api/admin/users/route.ts` (if exists) or the users list endpoint

---

### 8.3 No Export for Admin Data (LOW)

**Problem:** Admin can view analytics but can't export data for external analysis (spreadsheets, BI tools).

**Fix:**
- Add CSV export buttons to: Users list, Activity logs, Cost data, API usage
- Format with proper headers and Hebrew-safe encoding (UTF-8 BOM)

**Files:** Admin page components

---

### 8.4 No Audit Log for Admin Actions (MEDIUM)

**Problem:** When an admin changes a user's tier, grants credits, or bans a user, there's no persistent log of WHO did WHAT and WHEN.

**Fix:**
- Admin actions already log to `activity_logs` with `is_admin: true`
- Create a dedicated "Admin Actions" view in the dashboard filtering by `is_admin`
- Show: admin user, action, target user, timestamp, details

**Files:** `src/app/admin/activity/page.tsx` (add filter), `src/app/api/admin/activity/route.ts`

---

## Priority Matrix

| Priority | Count | Items |
|----------|-------|-------|
| CRITICAL | 1 | 3.1 (Password Reset) |
| HIGH | 12 | 1.1, 1.2, 1.4, 2.1, 3.2, 4.1, 4.2, 5.1, 5.2, 6.1, 7.1, 8.2 |
| MEDIUM | 16 | 1.3, 1.5, 2.2, 2.3, 2.4, 3.3, 3.4, 4.3, 4.4, 5.3, 5.4, 5.5, 5.7, 6.2, 8.1, 8.4 |
| LOW | 12 | 1.6, 1.7, 1.8, 2.5, 2.6, 4.5, 5.6, 6.3, 7.2, 7.3, 7.4, 8.3 |

---

## Recommended Implementation Order

### Phase 1: Critical Fixes (Day 1)
- 3.1 Password Reset Flow
- 4.2 Guest Daily Reset Bug
- 4.1 Credit Display Unification

### Phase 2: Core UX (Days 2-3)
- 2.1 Genius Questions After Refinement
- 1.1 Auto-Categorization on Save
- 1.2 Duplicate Detection
- 1.4 Library → Enhance Flow
- 5.1 Skeleton Loading States
- 5.3 Empty State Designs

### Phase 3: Polish (Days 4-5)
- 5.2 Mobile Responsiveness
- 5.4 Toast Standardization
- 2.2 Original Input Preservation
- 2.3 Streaming Cursor
- 6.1 Billing Management
- 7.1 OG/Social Meta Tags

### Phase 4: Security & Infrastructure (Day 6)
- 3.2 Account Deletion Fix
- 4.3 Credit Replenishment
- 4.4 Redis Fallback
- 8.2 Admin User Search

### Phase 5: Nice-to-Haves (Ongoing)
- Everything marked LOW
- 5.7 Onboarding Flow
- 8.1 Real-Time Dashboard
- Remaining MEDIUM items

---

## Architecture Notes

- All new API endpoints must use `validateAdminSession()` for admin routes
- All user-facing text must go through i18n (`he.json` / `en.json`)
- All new database columns need migrations in `supabase/migrations/`
- Follow existing patterns: `glass-card` styling, `animate-in` transitions, RTL-first layout
- Test at 375px (mobile), 768px (tablet), 1440px (desktop)
