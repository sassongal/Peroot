# Peroot Master Plan — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Peroot into a production-ready Hebrew prompt enhancement platform with stable auth/credits, synced admin, quality blog CMS, and SEO readiness.

**Architecture:** Next.js 16 App Router + Supabase (PostgreSQL, Auth, Storage) + Vercel AI SDK with multi-model fallback. All configuration lives in `site_settings` table as single source of truth. Blog powered by `blog_posts` table with TipTap editor in admin.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase, TailwindCSS, Radix UI, Vercel AI SDK, TipTap (new for blog), Lemon Squeezy

**Spec:** `docs/superpowers/specs/2026-03-10-peroot-master-plan-design.md`

---

## Chunk 1: Phase 0B + 0E — UI Quick Fixes & Legal/Footer/Contact

These are zero-risk cosmetic changes that can be done immediately without affecting any functionality.

### Task 1: Rename "מצב יכולת" → "מצב פרומפט"

**Files:**
- Modify: `src/i18n/dictionaries/he.json:80`
- Modify: `src/components/ui/OnboardingOverlay.tsx:168`

- [ ] **Step 1: Update i18n dictionary**

In `src/i18n/dictionaries/he.json`, change line 80:
```json
"capability_mode": "מצב פרומפט",
```

- [ ] **Step 2: Update OnboardingOverlay heading**

In `src/components/ui/OnboardingOverlay.tsx:168`, change:
```tsx
// Old:
בחר מצב יכולת
// New:
בחר מצב פרומפט
```

- [ ] **Step 3: Search for any other occurrences**

Run: `grep -r "מצב יכולת" src/`
If found elsewhere, update those too.

- [ ] **Step 4: Verify the app builds**

Run: `npm run build` (or `next build`)
Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/dictionaries/he.json src/components/ui/OnboardingOverlay.tsx
git commit -m "fix: rename 'מצב יכולת' to 'מצב פרומפט' across UI"
```

---

### Task 2: Agent Builder → "Coming Soon"

**Files:**
- Modify: `src/components/ui/OnboardingOverlay.tsx:36-41`
- Modify: `src/components/features/prompt-improver/PromptInput.tsx` (wherever capability mode selector renders Agent Builder option)

- [ ] **Step 1: Add "coming soon" badge to Agent Builder in OnboardingOverlay**

In `src/components/ui/OnboardingOverlay.tsx`, find the CAPABILITY_MODES array (line 17-42). For the Agent Builder entry (index 3, color "amber"), add a `comingSoon: true` flag:

```tsx
const CAPABILITY_MODES = [
    { icon: MessageSquare, color: "sky", labelHe: "סטנדרטי", descriptionHe: "יצירת טקסט וצ'אט רגיל — מושלם לרוב המשימות" },
    { icon: Globe, color: "emerald", labelHe: "מחקר מעמיק", descriptionHe: "חיפוש ברשת עם מקורות ושרשרת חשיבה מפורטת" },
    { icon: Palette, color: "purple", labelHe: "יצירת תמונה", descriptionHe: "יצירת פרומפטים לתמונות עם DALL-E או Midjourney" },
    { icon: Bot, color: "amber", labelHe: "בונה סוכנים", descriptionHe: "הגדרת GPT מותאמים וסוכני AI עצמאיים", comingSoon: true },
];
```

- [ ] **Step 2: Render "בקרוב" badge and disable interaction**

In the `.map()` that renders capability modes in OnboardingOverlay (around line 175), add opacity and a badge for `comingSoon` items:

```tsx
<div
    key={labelHe}
    className={cn(
        "flex items-start gap-3 p-4 rounded-2xl border transition-all relative",
        comingSoon ? "opacity-50 cursor-not-allowed" : "",
        c.bg, c.border
    )}
>
    {comingSoon && (
        <span className="absolute top-2 left-2 text-[9px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
            בקרוב
        </span>
    )}
    {/* ...existing content... */}
</div>
```

- [ ] **Step 3: Disable Agent Builder in PromptInput capability selector**

Find where CapabilityMode options are rendered in `src/components/features/prompt-improver/PromptInput.tsx`. Add a disabled state for `AGENT_BUILDER` with a "בקרוב" label. The exact implementation depends on how the selector is built — search for `AGENT_BUILDER` or `בונה סוכנים` in that file.

- [ ] **Step 4: Verify build**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/OnboardingOverlay.tsx src/components/features/prompt-improver/PromptInput.tsx
git commit -m "feat: mark Agent Builder as 'Coming Soon' with disabled state"
```

---

### Task 3: Standardize Contact Email

**Files:**
- Modify: `src/components/layout/Footer.tsx:29` — change `support@peroot.space` → `gal@joya-tech.net`
- Modify: `src/app/privacy/page.tsx` — search for `support@peroot.net`, replace with `gal@joya-tech.net`
- Modify: `src/app/accessibility/page.tsx` — search for `support@peroot.net`, replace with `gal@joya-tech.net`
- Modify: `public/llms.txt` — search for `support@peroot`, replace with `gal@joya-tech.net`

- [ ] **Step 1: Update Footer.tsx**

In `src/components/layout/Footer.tsx:29`, change:
```tsx
// Old:
<a href="mailto:support@peroot.space"
// New:
<a href="mailto:gal@joya-tech.net"
```

- [ ] **Step 2: Update privacy page**

In `src/app/privacy/page.tsx`, find all instances of `support@peroot.net` and replace with `gal@joya-tech.net`.

- [ ] **Step 3: Update accessibility page**

In `src/app/accessibility/page.tsx`, find all instances of `support@peroot.net` and replace with `gal@joya-tech.net`.

- [ ] **Step 4: Update llms.txt**

In `public/llms.txt`, find `support@peroot` references and update to `gal@joya-tech.net`.

- [ ] **Step 5: Search for any remaining old emails**

Run: `grep -r "support@peroot" src/ public/`
Fix any remaining occurrences.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/Footer.tsx src/app/privacy/page.tsx src/app/accessibility/page.tsx public/llms.txt
git commit -m "fix: standardize contact email to gal@joya-tech.net everywhere"
```

---

### Task 4: Footer Enhancement — Add Blog & New Links

**Files:**
- Modify: `src/components/layout/Footer.tsx`

- [ ] **Step 1: Add blog and pricing links to footer**

In `src/components/layout/Footer.tsx`, add links to the nav section:

```tsx
<nav className="flex flex-wrap justify-center gap-6 text-sm text-slate-400">
  <Link href="/blog" className="cursor-pointer hover:text-amber-400 transition-colors">
    בלוג
  </Link>
  <Link href="/pricing" className="cursor-pointer hover:text-amber-400 transition-colors">
    מחירים
  </Link>
  <Link href="/terms" className="cursor-pointer hover:text-amber-400 transition-colors" suppressHydrationWarning>
    תנאי שימוש
  </Link>
  <Link href="/privacy" className="cursor-pointer hover:text-amber-400 transition-colors" suppressHydrationWarning>
    מדיניות פרטיות
  </Link>
  <Link href="/accessibility" className="cursor-pointer hover:text-amber-400 transition-colors" suppressHydrationWarning>
    הצהרת נגישות
  </Link>
  <a href="mailto:gal@joya-tech.net" className="cursor-pointer hover:text-amber-400 transition-colors" suppressHydrationWarning>
    צור קשר
  </a>
</nav>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/Footer.tsx
git commit -m "feat: add blog and pricing links to footer"
```

---

### Task 5: Create Contact Page

**Files:**
- Create: `src/app/contact/page.tsx`

- [ ] **Step 1: Create the contact page**

Create `src/app/contact/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "צור קשר | Peroot",
  description: "צור קשר עם צוות Peroot — שאלות, הצעות, דיווח על באגים.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-black text-slate-300 font-sans p-6 md:p-12 lg:p-24" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors mb-8">
          <ArrowRight className="w-4 h-4" />
          חזרה לדף הבית
        </Link>

        <h1 className="text-4xl md:text-5xl font-serif text-white mb-6">צור קשר</h1>

        <div className="glass-card rounded-2xl border border-white/10 p-8 space-y-6">
          <p className="text-lg text-slate-300 leading-relaxed">
            יש לכם שאלה, הצעה או דיווח על באג? נשמח לשמוע!
          </p>
          <a
            href="mailto:gal@joya-tech.net"
            className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-all"
          >
            <Mail className="w-5 h-5" />
            gal@joya-tech.net
          </a>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Add contact to footer links**

Update footer to include `/contact` link instead of raw mailto (optional — mailto is already fine).

- [ ] **Step 3: Add to sitemap**

In `src/app/sitemap.ts`, add:
```ts
{
  url: `${baseUrl}/contact`,
  lastModified: new Date(),
  changeFrequency: 'yearly' as const,
  priority: 0.4,
},
```

- [ ] **Step 4: Verify build**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/app/contact/page.tsx src/app/sitemap.ts
git commit -m "feat: add contact page with standardized email"
```

---

### Task 6: Add More Example Prompts

**Files:**
- Modify: `src/components/features/prompt-improver/PromptInput.tsx:263-267`

- [ ] **Step 1: Expand examples array**

In `src/components/features/prompt-improver/PromptInput.tsx`, find the examples array (around line 263) and expand it. Also add randomization:

```tsx
const ALL_EXAMPLES = [
  "כתוב לי מייל שיווקי להשקת מוצר חדש",
  "צור תוכן לפוסט אינסטגרם לעסק קטן",
  "בנה תבנית לתיאור משרה של מפתח Full Stack",
  "כתוב סקריפט לסרטון הסבר על המוצר שלי",
  "צור תוכנית לימודים לקורס AI למתחילים",
  "כתוב מייל מעקב מקצועי ללקוח אחרי פגישה",
  "בנה prompt ליצירת תמונה של מוצר על רקע סטודיו",
  "כתוב תיאור מוצר שמוכר לחנות אונליין",
  "צור שאלון סקר שביעות רצון ללקוחות",
  "כתוב הודעת WhatsApp שיווקית קצרה ואפקטיבית",
];
```

- [ ] **Step 2: Add randomization logic**

Replace the hardcoded array with a shuffled subset:

```tsx
// Above the component or as useMemo:
const displayedExamples = useMemo(() => {
  const shuffled = [...ALL_EXAMPLES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4);
}, []);
```

Then use `displayedExamples` in the `.map()`.

- [ ] **Step 3: Verify build**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/components/features/prompt-improver/PromptInput.tsx
git commit -m "feat: expand example prompts to 10 with random display of 4"
```

---

## Chunk 2: Phase 0A — Auth & Credits Overhaul

This is the most critical phase. Changes core user flow.

### Task 7: Add `daily_free_limit` and `registration_bonus` to Site Settings

**Files:**
- Modify: `src/hooks/useSiteSettings.ts` — add new fields to `SiteSettings` interface and defaults

- [ ] **Step 1: Extend SiteSettings interface**

In `src/hooks/useSiteSettings.ts`, add to the `SiteSettings` interface:

```typescript
export interface SiteSettings {
  // ...existing fields...
  daily_free_limit: number;
  registration_bonus: number;
}
```

- [ ] **Step 2: Update default values**

In the `defaultSettings` object, update:

```typescript
const defaultSettings: SiteSettings = {
  // ...existing...
  max_free_prompts: 1,       // Changed from 3 — guest gets 1 trial
  default_credits: 2,        // Changed from 20 — registration bonus
  daily_free_limit: 2,       // NEW — free users get 2/day
  registration_bonus: 2,     // NEW — bonus on registration
};
```

- [ ] **Step 3: Add columns to site_settings table in Supabase**

Create a Supabase migration or run SQL:

```sql
ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS daily_free_limit integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS registration_bonus integer DEFAULT 2;

UPDATE site_settings SET
  max_free_prompts = 1,
  default_credits = 2,
  daily_free_limit = 2,
  registration_bonus = 2;
```

- [ ] **Step 4: Verify build**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSiteSettings.ts
git commit -m "feat: add daily_free_limit and registration_bonus to site settings"
```

---

### Task 8: Update Guest Flow — 1 Free Trial

**Files:**
- Modify: `src/hooks/usePromptLimits.ts`
- Modify: `src/app/page.tsx:321-324` (handleEnhance guest check)

- [ ] **Step 1: Update usePromptLimits for new guest limit**

The hook already reads `settings.max_free_prompts` from `useSiteSettings()`. Since we changed the default to 1 in Task 7, this should work automatically. But verify the flow:

In `src/hooks/usePromptLimits.ts`, ensure `getRequiredAction()` returns `'login'` after 1 use:

```typescript
function getRequiredAction(): 'login' | 'upgrade' | null {
    if (user) {
        return (credits !== null && credits < 1) ? 'upgrade' : null;
    }
    if (!settings.allow_guest_access) {
        return 'login';
    }
    if (usage.count >= settings.max_free_prompts) {
        return 'login';
    }
    return null;
}
```

This is already correct — it will now trigger `'login'` after 1 use (since `max_free_prompts` = 1).

- [ ] **Step 2: Make the login modal blocking after guest trial**

In `src/app/page.tsx`, the `handleEnhance` function (line 314-357) already shows `LoginRequiredModal` for guest users (line 321-324). Currently it blocks ALL guest usage:

```tsx
if (!user) {
    showLoginRequired("יצירת פרומפט", "כדי ליצור פרומפטים מקצועיים, יש להתחבר לחשבון. ההרשמה חינמית!");
    return;
}
```

This needs to be changed to allow 1 free use, THEN block:

```tsx
// Allow guest trial (1 free use), then require login
if (!user) {
    const guestUsage = JSON.parse(localStorage.getItem('peroot_guest_usage') || '{"count":0}');
    const today = new Date().toISOString().slice(0, 10);
    const lastDay = guestUsage.lastReset ? new Date(guestUsage.lastReset).toISOString().slice(0, 10) : '';
    const todayCount = lastDay === today ? guestUsage.count : 0;

    if (todayCount >= (settings?.max_free_prompts ?? 1)) {
        showLoginRequired(
            "יצירת פרומפט",
            "נהנית מהדוגמה הראשונה? הירשם בחינם כדי להמשיך לשדרג פרומפטים!"
        );
        return;
    }
}
```

Note: The `usePromptLimits` hook should handle this, but verify the client-side check doesn't block the first use.

- [ ] **Step 3: Update server-side guest enforcement**

In `src/app/api/enhance/route.ts`, add guest usage tracking. Currently guests hit rate limiting but not credit enforcement. Add before the credit check (around line 73):

```typescript
if (!user) {
    // Guest users: enforce max_free_prompts from site_settings
    // Server-side enforcement via rate limiter is already in place
    // But we need to ensure the limit matches site_settings
    // The rate limiter uses 'guest' tier which should align
}
```

The existing rate limiter already handles this. Just verify the `guest` tier limit matches `max_free_prompts`.

- [ ] **Step 4: Verify build**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePromptLimits.ts src/app/page.tsx src/app/api/enhance/route.ts
git commit -m "feat: enforce 1 free trial for guests, then require registration"
```

---

### Task 9: Daily Limit for Registered Free Users

**Files:**
- Modify: `src/app/api/enhance/route.ts:83-106` — overhaul daily credit logic
- Modify: `src/hooks/usePromptLimits.ts` — add daily tracking for logged-in free users

- [ ] **Step 1: Update server-side daily credit refresh**

In `src/app/api/enhance/route.ts`, the existing daily refresh (lines 85-106) sets `credits_balance` to 3. Change this to use `site_settings.daily_free_limit`:

```typescript
if (tier === 'free') {
    // Fetch site settings for daily limit
    const { data: siteSettings } = await supabase
        .from('site_settings')
        .select('daily_free_limit')
        .single();

    const dailyLimit = siteSettings?.daily_free_limit ?? 2;

    const { data: refreshData } = await supabase
        .from('profiles')
        .select('credits_refreshed_at, bonus_credits')
        .eq('id', user.id)
        .single();

    const lastRefresh = refreshData?.credits_refreshed_at
        ? new Date(refreshData.credits_refreshed_at)
        : null;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (!lastRefresh || lastRefresh < today) {
        // Reset daily credits, preserve bonus credits
        const bonusCredits = refreshData?.bonus_credits ?? 0;
        await supabase
            .from('profiles')
            .update({
                credits_balance: dailyLimit + bonusCredits,
                credits_refreshed_at: new Date().toISOString()
            })
            .eq('id', user.id);
    }
}
```

- [ ] **Step 2: Add bonus_credits column to profiles**

Run SQL migration:

```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS bonus_credits integer DEFAULT 0;
```

- [ ] **Step 3: Update registration flow to grant bonus credits**

Find where new user profiles are created (likely in auth callback or a trigger). Set `bonus_credits` to the value from `site_settings.registration_bonus`:

In `src/app/auth/callback/route.ts`, after successful auth, check if this is a new user and grant bonus:

```typescript
// After session exchange, check if profile needs bonus
const { data: profile } = await supabase
    .from('profiles')
    .select('bonus_credits, created_at')
    .eq('id', user.id)
    .single();

// If profile was just created (within last minute), grant registration bonus
if (profile && new Date().getTime() - new Date(profile.created_at).getTime() < 60000) {
    const { data: settings } = await supabase
        .from('site_settings')
        .select('registration_bonus, daily_free_limit')
        .single();

    const bonus = settings?.registration_bonus ?? 2;
    const daily = settings?.daily_free_limit ?? 2;

    await supabase
        .from('profiles')
        .update({
            bonus_credits: bonus,
            credits_balance: daily + bonus
        })
        .eq('id', user.id);
}
```

- [ ] **Step 4: Update usePromptLimits for daily + bonus display**

In `src/hooks/usePromptLimits.ts`, update `checkUser()` to fetch bonus_credits:

```typescript
if (activeUser) {
    const { data: profile } = await supabase
        .from('profiles')
        .select('credits_balance, bonus_credits')
        .eq('id', activeUser.id)
        .maybeSingle();

    if (profile) {
        setCredits(profile.credits_balance);
        // bonus_credits can be exposed if needed for UI
    }
}
```

The `credits_balance` now represents daily + bonus combined (set by server on refresh), so the existing `canUsePrompt` logic (`credits > 0`) still works.

- [ ] **Step 5: Verify build**

Run: `npm run build`

- [ ] **Step 6: Commit**

```bash
git add src/app/api/enhance/route.ts src/hooks/usePromptLimits.ts src/app/auth/callback/route.ts
git commit -m "feat: daily limit (2/day) + bonus credits (2) for free registered users"
```

---

### Task 10: Remove All Hardcoded Credit Values

**Files:**
- Modify: `src/app/api/enhance/route.ts` — remove hardcoded `3` credit refresh
- Modify: `src/hooks/useSiteSettings.ts` — defaults are fallbacks only
- Search entire codebase for hardcoded credit values

- [ ] **Step 1: Search for hardcoded credit values**

Run: `grep -rn "credits_balance.*=.*[0-9]" src/` and `grep -rn "max_free_prompts.*[0-9]" src/`
Fix any hardcoded numbers to reference site_settings.

- [ ] **Step 2: Verify all credit logic reads from site_settings**

Ensure no file has hardcoded `3`, `20`, or other credit values that should come from settings.

- [ ] **Step 3: Commit**

```bash
git commit -am "refactor: remove all hardcoded credit values, use site_settings as single source of truth"
```

---

## Chunk 3: Phase 0C + 0D — Admin Sync & Bug Fixes

### Task 11: Admin — Sync Credits Display with DB

**Files:**
- Modify: Admin user management component (likely in `src/app/admin/users/` or `src/components/admin/`)
- Modify: Admin settings page to expose new `daily_free_limit` and `registration_bonus` fields

- [ ] **Step 1: Find admin users page**

Run: `find src/app/admin -name "*.tsx" -o -name "*.ts"` to locate user management page.

- [ ] **Step 2: Ensure user list queries actual credits_balance + bonus_credits**

The admin user list should show:
- `credits_balance` (current available)
- `bonus_credits` (registration bonus remaining)
- `credits_refreshed_at` (last daily reset)
- `plan_tier`

Verify the admin API route (`/api/admin/users/[id]`) returns these fields.

- [ ] **Step 3: Add new settings fields to admin settings page**

In the admin settings page, add inputs for:
- `daily_free_limit` (number input)
- `registration_bonus` (number input)
- `max_free_prompts` (already exists, verify)

- [ ] **Step 4: Commit**

```bash
git commit -am "feat: admin dashboard shows real-time credit data + new settings fields"
```

---

### Task 12: Admin — Sync Engine Prompts

**Files:**
- Check: `src/lib/engines/index.ts` — already reads from `prompt_engines` table
- Check: Admin engines page

- [ ] **Step 1: Verify engine config flow**

The engine system (`src/lib/engines/index.ts`) already reads from the `prompt_engines` DB table and falls back to hardcoded defaults. Verify:

1. Admin engines page writes to `prompt_engines` table
2. The written config is what `getEngine()` actually uses
3. If no DB config exists, the hardcoded default in each engine class is used

- [ ] **Step 2: Seed current engine prompts into DB if not already there**

If the `prompt_engines` table is empty, the engines use hardcoded defaults from `StandardEngine`, `ResearchEngine`, etc. Insert the current defaults into the DB so they're visible and editable in admin:

```sql
INSERT INTO prompt_engines (mode, name, is_active, system_prompt_template, user_prompt_template)
SELECT 'standard', 'Standard Engine', true,
  'You are an expert prompt architect...', -- copy from StandardEngine constructor
  'Transform the following user input...'  -- copy from StandardEngine constructor
WHERE NOT EXISTS (SELECT 1 FROM prompt_engines WHERE mode = 'standard' AND is_active = true);
```

Repeat for research, image, and agent engines.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat: seed current engine prompts into DB for admin editability"
```

---

### Task 13: Bug Fixes — Favorites, D&D, Navigation

**Files:**
- Review: `src/hooks/useFavorites.ts`
- Review: `src/components/views/PersonalLibraryView.tsx`
- Review: Navigation flow in `src/app/page.tsx`

- [ ] **Step 1: Audit favorites**

Test the favorites flow manually or review code:
1. Toggle a favorite on a library prompt
2. Navigate away and back — is it still favorited?
3. Check for race conditions in `useFavorites.ts`

- [ ] **Step 2: Audit Drag & Drop**

In `PersonalLibraryView.tsx`, check:
1. Does reordering update `sort_index` in DB?
2. Are there issues with dropping at the end of a category?
3. Does the UI update optimistically?

- [ ] **Step 3: Audit navigation**

Test all navigation paths:
- Home → Library → Personal → Favorites → Home
- Sidebar toggle on mobile
- Logo click → home (verify logo has `<Link href="/">`)

- [ ] **Step 4: Fix any issues found and commit**

```bash
git commit -am "fix: resolve favorites sync, D&D ordering, and navigation issues"
```

---

## Chunk 4: Phase 0F — Basic Technical SEO

### Task 14: Update Sitemap

**Files:**
- Modify: `src/app/sitemap.ts`

- [ ] **Step 1: Make sitemap dynamic**

The sitemap already exists but is static. Update to include all known pages:

```typescript
import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://peroot.space';

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/blog/how-to-write-good-prompt`, lastModified: new Date('2026-03-10'), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
    { url: `${baseUrl}/privacy`, lastModified: new Date('2026-03-10'), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: new Date('2026-03-10'), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/accessibility`, lastModified: new Date('2026-03-10'), changeFrequency: 'yearly', priority: 0.3 },
  ];
}
```

Note: When blog CMS is built (Phase 2A), this should query `blog_posts` from Supabase.

- [ ] **Step 2: Delete stale static sitemap file**

Run: `rm -f public/sitemap.xml` (already deleted per git status)

- [ ] **Step 3: Verify robots.ts points to correct sitemap**

Already correct in `src/app/robots.ts` — points to `/sitemap.xml` which Next.js generates from `sitemap.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/app/sitemap.ts
git commit -m "feat: update dynamic sitemap with all current pages"
```

---

### Task 15: Add SoftwareApplication Schema to Homepage

**Files:**
- Review: `src/app/page.tsx:791-811` — schema already exists!

- [ ] **Step 1: Verify existing schema**

The homepage already has a `SoftwareApplication` JSON-LD schema (lines 791-811). Review and enhance if needed:

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Peroot",
  "applicationCategory": "ProductivityApplication",
  "operatingSystem": "Web",
  "description": "מחולל פרומפטים מקצועי בעברית — שדרג כל פרומפט באמצעות AI מתקדם",
  "url": "https://peroot.space",
  "inLanguage": "he",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "ILS"
  }
}
```

Remove fake `aggregateRating` (120 ratings) unless there's real data — fake structured data can cause Google penalties.

- [ ] **Step 2: Commit if changes needed**

```bash
git add src/app/page.tsx
git commit -m "fix: clean up SoftwareApplication schema, remove fake rating data"
```

---

## Chunk 5: Phase 1A + 1B — Explainer & Examples

### Task 16: "What Is This?" Explainer Modal

**Files:**
- Create: `src/components/ui/WhatIsThisModal.tsx`
- Modify: `src/app/page.tsx` — add button and modal

- [ ] **Step 1: Create the modal component**

Create `src/components/ui/WhatIsThisModal.tsx`:

```tsx
"use client";

import { X, Sparkles, Target, Globe, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface WhatIsThisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WhatIsThisModal({ isOpen, onClose }: WhatIsThisModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-lg glass-card rounded-3xl border border-white/10 bg-zinc-950/95 p-8 md:p-10 relative" dir="rtl">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-6">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-serif font-bold text-white">מה עושים פה?</h2>
            <p className="text-slate-400 leading-relaxed">
              <span className="text-amber-400 font-semibold">Peroot</span> הוא כלי AI שמשדרג כל פרומפט שאתם כותבים לרמה מקצועית — בעברית.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: Sparkles, title: "שדרוג אוטומטי", desc: "כתבו משפט פשוט וקבלו פרומפט מקצועי ומובנה" },
              { icon: Target, title: "4 מצבי עבודה", desc: "טקסט, מחקר, תמונות וסוכני AI — הכל במקום אחד" },
              { icon: Globe, title: "עברית מושלמת", desc: "בנוי מהיסוד לעברית — לא תרגום, אלא יצירה מקורית" },
              { icon: Zap, title: "תוצאות בשניות", desc: "AI מתקדם שמבין את הכוונה ומייצר פרומפט חד ומדויק" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <Icon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-white">{title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-2">
            <button
              onClick={onClose}
              className="px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold transition-all hover:scale-[1.03] active:scale-[0.98]"
            >
              בואו ננסה!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add button and auto-show logic in page.tsx**

In `src/app/page.tsx`, in the home view section (around line 670-690), add a "מה עושים פה?" button:

```tsx
// State (add near other state declarations):
const [showWhatIsThis, setShowWhatIsThis] = useState(false);

// Auto-show for first-time visitors:
useEffect(() => {
  if (!localStorage.getItem('peroot_seen_explainer')) {
    setShowWhatIsThis(true);
    localStorage.setItem('peroot_seen_explainer', 'true');
  }
}, []);
```

Add the button somewhere visible near the hero:
```tsx
<button
  onClick={() => setShowWhatIsThis(true)}
  className="text-sm text-slate-500 hover:text-amber-400 transition-colors"
>
  מה עושים פה?
</button>
```

And render the modal:
```tsx
<WhatIsThisModal isOpen={showWhatIsThis} onClose={() => setShowWhatIsThis(false)} />
```

- [ ] **Step 3: Verify build and test**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/WhatIsThisModal.tsx src/app/page.tsx
git commit -m "feat: add 'What is this?' explainer modal with auto-show for first visitors"
```

---

## Chunk 6: Phase 1C — Prompt Naming Improvements

### Task 17: AI-Generated Prompt Names

**Files:**
- Modify: `src/lib/engines/base-engine.ts` or `src/lib/engines/standard-engine.ts` — add name generation instruction
- Modify: `src/app/api/enhance/route.ts` — parse name from response
- Modify: `src/app/page.tsx` — use AI name in history

- [ ] **Step 1: Add title generation to system prompt**

In the engine's system prompt template, add an instruction to include a short title after the main output, using a delimiter:

```
After the main prompt output, add a title suggestion on a new line using this format:
[PROMPT_TITLE]שם קצר ותיאורי של הפרומפט[/PROMPT_TITLE]
```

This goes BEFORE the `[GENIUS_QUESTIONS]` delimiter in the output.

- [ ] **Step 2: Parse the title from the stream**

In `src/app/page.tsx`, update `processStreamResult()` to extract the title:

```typescript
// Extract title if present
const titleMatch = acc.promptText.match(/\[PROMPT_TITLE\](.*?)\[\/PROMPT_TITLE\]/);
const generatedTitle = titleMatch ? titleMatch[1].trim() : null;
// Remove the title tag from the displayed prompt
acc.promptText = acc.promptText.replace(/\[PROMPT_TITLE\].*?\[\/PROMPT_TITLE\]\n?/, '');
```

- [ ] **Step 3: Use AI title when saving to history**

When calling `addToHistory()`, use the AI-generated title:

```typescript
addToHistory({
    original: ps.input,
    enhanced: promptText,
    tone: ps.selectedTone,
    category: ps.selectedCategory,
    title: generatedTitle || ps.input.slice(0, 30) + (ps.input.length > 30 ? "..." : ""),
});
```

- [ ] **Step 4: Verify build**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git commit -am "feat: AI-generated prompt names piggybacked on enhancement response"
```

---

## Chunk 7: Phase 2A — Blog CMS

### Task 18: Create Blog Posts Table

**Files:**
- Create: Supabase migration for `blog_posts` table

- [ ] **Step 1: Create the table**

Run SQL migration:

```sql
CREATE TABLE IF NOT EXISTS blog_posts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    slug text UNIQUE NOT NULL,
    title text NOT NULL,
    content text NOT NULL DEFAULT '',
    excerpt text,
    meta_title text,
    meta_description text,
    thumbnail_url text,
    category text DEFAULT 'מדריכים',
    tags text[] DEFAULT '{}',
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    author text DEFAULT 'Peroot',
    read_time text,
    published_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Public read for published posts
CREATE POLICY "Anyone can read published posts"
ON blog_posts FOR SELECT
USING (status = 'published');

-- Admin full access
CREATE POLICY "Admins can do everything"
ON blog_posts FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Index for slug lookups
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
```

- [ ] **Step 2: Migrate existing hardcoded post**

```sql
INSERT INTO blog_posts (slug, title, excerpt, meta_title, meta_description, category, status, read_time, published_at, content)
VALUES (
    'how-to-write-good-prompt',
    'איך לכתוב פרומפט טוב — המדריך המלא',
    '5 עקרונות שיהפכו כל פרומפט שלכם ממשהו בסיסי לפרומפט מקצועי שמוציא תוצאות מדויקות מ-ChatGPT, Claude ו-Gemini.',
    'איך לכתוב פרומפט טוב — המדריך המלא | Peroot',
    '5 עקרונות שיהפכו כל פרומפט שלכם לפרומפט מקצועי',
    'מדריכים',
    'published',
    '5 דקות קריאה',
    '2026-03-10',
    '' -- Content to be migrated from the page component
);
```

- [ ] **Step 3: Commit migration**

```bash
git commit -am "feat: create blog_posts table with RLS and migrate existing post"
```

---

### Task 19: Blog API Routes

**Files:**
- Create: `src/app/api/blog/route.ts` — list published posts
- Create: `src/app/api/blog/[slug]/route.ts` — get single post
- Create: `src/app/api/admin/blog/route.ts` — admin CRUD

- [ ] **Step 1: Create public blog list API**

Create `src/app/api/blog/route.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('blog_posts')
        .select('slug, title, excerpt, category, read_time, published_at, thumbnail_url, tags')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}
```

- [ ] **Step 2: Create single post API**

Create `src/app/api/blog/[slug]/route.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: { slug: string } }) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', params.slug)
        .eq('status', 'published')
        .single();

    if (error || !data) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    return NextResponse.json(data);
}
```

- [ ] **Step 3: Create admin blog CRUD API**

Create `src/app/api/admin/blog/route.ts` with GET (all posts including drafts), POST (create), PUT (update), DELETE.

- [ ] **Step 4: Commit**

```bash
git commit -am "feat: blog API routes for public listing and admin CRUD"
```

---

### Task 20: Update Blog Frontend to Use DB

**Files:**
- Modify: `src/app/blog/page.tsx` — fetch from API instead of hardcoded POSTS array
- Modify: `src/app/blog/[slug]/page.tsx` — fetch from API

- [ ] **Step 1: Update blog listing page**

Replace the hardcoded `POSTS` array with a server-side fetch:

```tsx
import { createClient } from "@/lib/supabase/server";

export default async function BlogPage() {
    const supabase = await createClient();
    const { data: posts } = await supabase
        .from('blog_posts')
        .select('slug, title, excerpt, category, read_time, published_at, thumbnail_url')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

    // ...render posts...
}
```

- [ ] **Step 2: Update single post page**

Update `src/app/blog/[slug]/page.tsx` to fetch from DB and render `content` as HTML:

```tsx
export default async function BlogPost({ params }: { params: { slug: string } }) {
    const supabase = await createClient();
    const { data: post } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', params.slug)
        .eq('status', 'published')
        .single();

    if (!post) return notFound();

    return (
        // ...render post with dangerouslySetInnerHTML for content...
    );
}
```

- [ ] **Step 3: Update sitemap to include DB blog posts**

In `src/app/sitemap.ts`, query blog_posts for published slugs:

```typescript
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const supabase = await createClient();
    const { data: posts } = await supabase
        .from('blog_posts')
        .select('slug, updated_at')
        .eq('status', 'published');

    const blogEntries = (posts || []).map(post => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: new Date(post.updated_at),
        changeFrequency: 'monthly' as const,
        priority: 0.8,
    }));

    return [...staticPages, ...blogEntries];
}
```

- [ ] **Step 4: Commit**

```bash
git commit -am "feat: blog pages now fetch from Supabase instead of hardcoded data"
```

---

### Task 21: Admin Blog Editor

**Files:**
- Create: `src/app/admin/blog/page.tsx` — blog post list
- Create: `src/app/admin/blog/[id]/page.tsx` — blog post editor
- Modify: `src/components/admin/AdminLayout.tsx` — add blog nav link

This task requires installing TipTap:

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link @tiptap/extension-heading
```

- [ ] **Step 1: Install TipTap**

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link @tiptap/extension-heading
```

- [ ] **Step 2: Add blog to admin navigation**

In `src/components/admin/AdminLayout.tsx`, add a "בלוג" nav item pointing to `/admin/blog`.

- [ ] **Step 3: Create blog posts list page**

Create `src/app/admin/blog/page.tsx` with:
- Table of all posts (drafts + published)
- Status badge (draft/published)
- Edit/Delete actions
- "New Post" button

- [ ] **Step 4: Create blog post editor page**

Create `src/app/admin/blog/[id]/page.tsx` with:
- TipTap rich text editor for content
- Title, slug, excerpt fields
- Meta title, meta description fields
- Category dropdown, tags input
- Thumbnail upload (to Supabase Storage)
- Publish/Draft toggle
- Save button

- [ ] **Step 5: Verify build**

Run: `npm run build`

- [ ] **Step 6: Commit**

```bash
git commit -am "feat: admin blog editor with TipTap rich text, image upload, SEO fields"
```

---

## Chunk 8: Phase 1D + 1E + 1F — Engine Upgrades

### Task 22: Prompt Engine Upgrade

**Files:**
- Modify: `src/lib/engines/standard-engine.ts` — improve system prompt
- Modify: `src/lib/engines/research-engine.ts` — improve research prompt
- Modify: `src/lib/engines/image-engine.ts` — improve image prompt
- Update DB: `prompt_engines` table with new prompts

This is primarily a prompt engineering task. The implementation is updating the system/user prompt templates.

- [ ] **Step 1: Audit current prompts**

Read all engine files and document current system prompts:
- `src/lib/engines/standard-engine.ts`
- `src/lib/engines/research-engine.ts`
- `src/lib/engines/image-engine.ts`
- `src/lib/engines/agent-engine.ts`

- [ ] **Step 2: Improve standard engine prompt**

Enhance with:
- Better task-type detection
- Chain-of-thought reasoning
- Quality self-evaluation
- More structured output per task type

- [ ] **Step 3: Improve research engine prompt**

Enhance with:
- Better citation format
- Organized output (summary, findings, sources)
- Confidence indicators

- [ ] **Step 4: Improve image engine prompt**

Enhance with:
- Clean JSON output
- Style parameter suggestions
- Format for multiple AI image tools

- [ ] **Step 5: Update DB with new prompts**

Insert/update `prompt_engines` table with the improved prompts so they're editable in admin.

- [ ] **Step 6: Commit**

```bash
git commit -am "feat: upgrade all prompt engines for higher quality output"
```

---

## Chunk 9: Phase 2C + 2D — Schema Markup & OG Images

### Task 23: Schema Markup

**Files:**
- Modify: `src/app/page.tsx` — clean up existing schema
- Modify: `src/app/blog/[slug]/page.tsx` — add Article schema
- Create: `src/lib/schema.ts` — helper for generating schema JSON-LD

- [ ] **Step 1: Create schema helper**

Create `src/lib/schema.ts`:

```typescript
export function articleSchema(post: { title: string; excerpt: string; published_at: string; author: string; thumbnail_url?: string; slug: string }) {
    return {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post.title,
        "description": post.excerpt,
        "datePublished": post.published_at,
        "author": { "@type": "Organization", "name": post.author || "Peroot" },
        "publisher": { "@type": "Organization", "name": "Peroot", "url": "https://peroot.space" },
        "image": post.thumbnail_url,
        "url": `https://peroot.space/blog/${post.slug}`,
        "inLanguage": "he",
    };
}

export function softwareAppSchema() {
    return {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Peroot",
        "applicationCategory": "ProductivityApplication",
        "operatingSystem": "Web",
        "description": "מחולל פרומפטים מקצועי בעברית — שדרג כל פרומפט באמצעות AI מתקדם",
        "url": "https://peroot.space",
        "inLanguage": "he",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "ILS" },
    };
}
```

- [ ] **Step 2: Use in blog posts**

In `src/app/blog/[slug]/page.tsx`, add:
```tsx
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema(post)) }} />
```

- [ ] **Step 3: Clean up homepage schema**

Replace the existing schema in `src/app/page.tsx` with `softwareAppSchema()`.

- [ ] **Step 4: Commit**

```bash
git commit -am "feat: add Article schema for blog posts, clean up homepage schema"
```

---

### Task 24: Open Graph Images

**Files:**
- Create: `src/app/api/og/route.tsx` — OG image generator using `next/og`

- [ ] **Step 1: Create OG image route**

Create `src/app/api/og/route.tsx`:

```tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || 'Peroot — מחולל פרומפטים מקצועי';

    return new ImageResponse(
        (
            <div style={{
                background: 'linear-gradient(135deg, #000 0%, #1a1a2e 100%)',
                width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '60px',
            }}>
                <div style={{ fontSize: 72, fontWeight: 'bold', color: '#F59E0B', marginBottom: 20 }}>
                    Peroot
                </div>
                <div style={{ fontSize: 36, color: '#e2e8f0', textAlign: 'center', maxWidth: 800, direction: 'rtl' }}>
                    {title}
                </div>
            </div>
        ),
        { width: 1200, height: 630 }
    );
}
```

- [ ] **Step 2: Reference in blog post metadata**

In blog post page's `generateMetadata()`:
```typescript
openGraph: {
    images: [`/api/og?title=${encodeURIComponent(post.title)}`],
}
```

- [ ] **Step 3: Commit**

```bash
git commit -am "feat: auto-generated OG images via next/og"
```

---

## Phase 3: Future Features (Documentation Only)

Phase 3 features are documented in the design spec but NOT implemented in this plan:
- 3A: Quality Comparison Score
- 3B: User Prompt Uploads (public/private)
- 3C: Export (PDF, Notion, Google Docs)
- 3D: Email Drip Campaign (Resend)
- 3E: Write Like Me
- 3F: English Support (i18n)
- 3G: Developer API
- 3H: Chrome Extension

Each will need its own brainstorming → spec → plan cycle when prioritized.

---

## Execution Order & Dependencies

```
PARALLEL GROUP 1 (no dependencies):
  Task 1: Rename מצב יכולת → מצב פרומפט
  Task 2: Agent Builder → Coming Soon
  Task 3: Standardize contact email
  Task 4: Footer enhancement
  Task 5: Create contact page
  Task 6: Add more examples
  Task 14: Update sitemap
  Task 15: Homepage schema cleanup

PARALLEL GROUP 2 (no dependencies):
  Task 16: What Is This modal
  Task 13: Bug fixes (favorites, D&D, navigation)

SEQUENTIAL GROUP 1 (depends on nothing but complex):
  Task 7: Add new site settings fields
  Task 8: Update guest flow (depends on Task 7)
  Task 9: Daily limit for registered users (depends on Task 7)
  Task 10: Remove hardcoded values (depends on Tasks 7-9)
  Task 11: Admin sync credits (depends on Tasks 7-9)
  Task 12: Admin sync engine prompts

SEQUENTIAL GROUP 2 (blog CMS, independent of Group 1):
  Task 18: Create blog_posts table
  Task 19: Blog API routes (depends on Task 18)
  Task 20: Update blog frontend (depends on Task 19)
  Task 21: Admin blog editor (depends on Task 19)

SEQUENTIAL GROUP 3 (depends on blog being done):
  Task 23: Schema markup
  Task 24: OG images

INDEPENDENT (can be done anytime):
  Task 17: AI prompt naming
  Task 22: Engine upgrades
```
