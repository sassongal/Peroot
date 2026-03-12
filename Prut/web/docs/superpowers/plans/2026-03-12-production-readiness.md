# Production Readiness Plan - Peroot 10/10

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Peroot from its current ~6.5/10 production score to a solid 10/10 across security, SEO, error handling, performance, and testing.

**Architecture:** Incremental hardening of an existing Next.js 16 + Supabase + Vercel app. Each task is self-contained and commits independently. No breaking changes - all fixes are additive or tightening of existing behavior.

**Tech Stack:** Next.js 16, Supabase, Vitest, Playwright, Upstash Redis, Sentry, TypeScript

---

## Chunk 1: Tier 1 - Critical Production Fixes

### Task 1: Harden delete-account with try/catch and rate limiting

**Files:**
- Modify: `src/app/api/user/delete-account/route.ts`

**Context:** The current `Promise.all` on line 17 has NO error handling. If one delete fails, partial data remains. Also missing rate limiting - a malicious actor could spam this endpoint.

- [ ] **Step 1: Add try/catch around Promise.all and rate limiting**

Replace the entire file with:

```typescript
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/ratelimit";

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 3 attempts per hour
  const rl = await checkRateLimit(`delete-account:${user.id}`, "guest");
  if (!rl.success) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  // Delete user data from all tables - use allSettled to ensure partial failures don't block
  const results = await Promise.allSettled([
    supabase.from("personal_library").delete().eq("user_id", user.id),
    supabase.from("prompt_favorites").delete().eq("user_id", user.id),
    supabase.from("activity_logs").delete().eq("user_id", user.id),
    supabase.from("user_achievements").delete().eq("user_id", user.id),
    supabase.from("user_roles").delete().eq("user_id", user.id),
    supabase.from("profiles").delete().eq("id", user.id),
  ]);

  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length > 0) {
    logger.error("[delete-account] Partial data deletion failures:", failures);
  }

  // Delete auth user using admin client
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(
    user.id
  );

  if (deleteError) {
    logger.error("[delete-account] Failed to delete auth user:", deleteError);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Verify build passes**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/api/user/delete-account/route.ts
git commit -m "fix: Add error handling and rate limiting to delete-account"
```

---

### Task 2: Rate limit checkout and achievements endpoints

**Files:**
- Modify: `src/app/api/checkout/route.ts`
- Modify: `src/app/api/user/achievements/award/route.ts`

- [ ] **Step 1: Add rate limiting to checkout**

In `src/app/api/checkout/route.ts`, add import at line 5:
```typescript
import { checkRateLimit } from "@/lib/ratelimit";
```

After the user auth check (after line 18), add:
```typescript
    // Rate limit: 10 checkout attempts per hour
    const rl = await checkRateLimit(`checkout:${user.id}`, "free");
    if (!rl.success) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }
```

- [ ] **Step 2: Add rate limiting to achievements award**

In `src/app/api/user/achievements/award/route.ts`, add the same pattern after auth check.

- [ ] **Step 3: Verify build passes**

Run: `npx next build 2>&1 | tail -5`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/checkout/route.ts src/app/api/user/achievements/award/route.ts
git commit -m "fix: Add rate limiting to checkout and achievements endpoints"
```

---

### Task 3: Create global-error.tsx for root-level crashes

**Files:**
- Create: `src/app/global-error.tsx`

**Context:** `error.tsx` only catches segment-level errors. `global-error.tsx` catches errors in the root layout itself. Currently missing.

- [ ] **Step 1: Create global-error.tsx**

```typescript
"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
        <div className="max-w-md w-full bg-zinc-900 border border-white/10 p-8 rounded-3xl text-center space-y-6">
          <div className="text-5xl">⚠️</div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">שגיאה קריטית</h1>
            <p className="text-zinc-400 text-sm leading-relaxed">
              נתקלנו בשגיאה לא צפויה. נא לנסות שוב או לחזור מאוחר יותר.
            </p>
          </div>
          {error.digest && (
            <div className="text-[10px] font-mono text-zinc-600 bg-white/5 py-1 px-3 rounded-full inline-block">
              Error ID: {error.digest}
            </div>
          )}
          <button
            onClick={() => reset()}
            className="px-6 py-3 rounded-2xl bg-white text-zinc-950 font-bold hover:bg-zinc-200 transition-colors cursor-pointer"
          >
            נסה שוב
          </button>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/global-error.tsx
git commit -m "fix: Add global-error.tsx for root-level crash recovery"
```

---

### Task 4: Wrap app content in ErrorBoundary

**Files:**
- Modify: `src/app/layout.tsx:148-153`

**Context:** The `ErrorBoundary` component exists but is only used in AdminLayout. Wrapping the main content prevents a single component crash from taking down the entire page.

- [ ] **Step 1: Add ErrorBoundary import and wrap children**

In `src/app/layout.tsx`, add import near other component imports:
```typescript
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
```

Replace lines 148-153:
```typescript
              <GlobalContextWrapper>
                <main id="main-content" className="flex-grow">
                  {children}
                </main>
                <Footer />
              </GlobalContextWrapper>
```

With:
```typescript
              <GlobalContextWrapper>
                <ErrorBoundary name="AppRoot">
                  <main id="main-content" className="flex-grow">
                    {children}
                  </main>
                </ErrorBoundary>
                <Footer />
              </GlobalContextWrapper>
```

- [ ] **Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "fix: Wrap main content in ErrorBoundary to prevent full-page crashes"
```

---

### Task 5: Enable TypeScript checking in CI

**Files:**
- Modify: `.github/workflows/ci.yml:33-34`

- [ ] **Step 1: Uncomment type check step**

Replace lines 33-34:
```yaml
      # - name: Type Check
      #   run: npx tsc --noEmit
```

With:
```yaml
      - name: Type Check
        run: npx tsc --noEmit
```

- [ ] **Step 2: Verify types pass locally**

Run: `npx tsc --noEmit`
Expected: No errors (or fix any that appear)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "fix: Enable TypeScript checking in CI pipeline"
```

---

### Task 6: Add image optimization config to next.config.ts

**Files:**
- Modify: `next.config.ts:28-44`

**Context:** No `images` config exists. Raw `<img>` tags serve unoptimized assets. The SVG files are 625KB each.

- [ ] **Step 1: Add images config to nextConfig**

In `next.config.ts`, add inside the `nextConfig` object (after line 31):
```typescript
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
    ],
  },
```

- [ ] **Step 2: Commit**

```bash
git add next.config.ts
git commit -m "feat: Add Next.js image optimization config with AVIF/WebP"
```

---

### Task 7: Compress oversized SVG/PNG assets

**Files:**
- Modify: `public/Peroot.svg` (625KB -> target <100KB)
- Modify: `public/logo.svg` (625KB -> target <100KB)
- Modify: `public/assets/branding/logo.svg` (625KB -> target <100KB)
- Modify: `public/assets/branding/icon-wand.png` (282KB)
- Modify: `public/assets/branding/icon-brain.png` (143KB)
- Modify: `public/assets/branding/logo.png` (252KB)

- [ ] **Step 1: Install svgo for SVG optimization**

Run: `npx svgo public/Peroot.svg public/logo.svg public/assets/branding/logo.svg --multipass`

- [ ] **Step 2: Optimize PNG files**

Run: `npx sharp-cli --input public/assets/branding/icon-wand.png --output public/assets/branding/icon-wand.png --quality 80 --format png` (or use `sips` on macOS)

Alternative with macOS native tool:
```bash
sips -s format png -s formatOptions 80 public/assets/branding/icon-wand.png
sips -s format png -s formatOptions 80 public/assets/branding/icon-brain.png
sips -s format png -s formatOptions 80 public/assets/branding/logo.png
```

- [ ] **Step 3: Verify files are smaller**

Run: `ls -la public/Peroot.svg public/logo.svg public/assets/branding/`

- [ ] **Step 4: Commit**

```bash
git add public/Peroot.svg public/logo.svg public/assets/branding/
git commit -m "perf: Compress SVG and PNG assets (reduce ~2MB)"
```

---

### Task 8: Add error logging to API routes missing it

**Files:**
- Modify: `src/app/api/blog/route.ts`
- Modify: `src/app/api/admin/blog/route.ts`
- Modify: `src/app/api/favorites/route.ts`
- Modify: `src/app/api/history/route.ts`
- Modify: `src/app/api/personal-library/route.ts`
- Modify: `src/app/api/subscription/route.ts`
- Modify: `src/app/api/share/route.ts`
- Modify: `src/app/api/prompt-usage/route.ts`
- Modify: `src/app/api/community/profile/[id]/route.ts`
- Modify: `src/app/api/community/leaderboard/route.ts`
- Modify: `src/app/api/me/route.ts`

**Pattern:** For each route that has `catch (error)` without logging, add `logger.error` before the error response. For routes without try/catch, wrap the handler body.

- [ ] **Step 1: For each file, ensure it has:**

1. `import { logger } from "@/lib/logger";` at the top
2. try/catch wrapping the handler body
3. `logger.error("[route-name] Error:", error);` in the catch block

Example pattern for a route missing try/catch:
```typescript
export async function GET() {
  try {
    // ... existing code ...
  } catch (error) {
    logger.error("[route-name] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify build passes**

Run: `npx next build 2>&1 | tail -5`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/
git commit -m "fix: Add error logging to all API routes"
```

---

## Chunk 2: Tier 2 - SEO, Loading States, Validation

### Task 9: Add loading.tsx files for route segments

**Files:**
- Create: `src/app/loading.tsx`
- Create: `src/app/blog/loading.tsx`
- Create: `src/app/settings/loading.tsx`
- Create: `src/app/admin/loading.tsx`
- Create: `src/app/pricing/loading.tsx`

**Context:** Zero `loading.tsx` files exist. These are Next.js convention files that show during route transitions.

- [ ] **Step 1: Create root loading.tsx**

```typescript
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
    </div>
  );
}
```

- [ ] **Step 2: Create blog loading.tsx**

```typescript
export default function BlogLoading() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-6" dir="rtl">
      <div className="h-10 w-32 bg-white/5 rounded-xl animate-pulse" />
      <div className="grid gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create settings, admin, and pricing loading files**

Use the same spinner pattern as root loading.tsx (adjust heights as needed).

- [ ] **Step 4: Commit**

```bash
git add src/app/loading.tsx src/app/blog/loading.tsx src/app/settings/loading.tsx src/app/admin/loading.tsx src/app/pricing/loading.tsx
git commit -m "feat: Add loading.tsx skeleton states for all route segments"
```

---

### Task 10: Add OG metadata to Contact and Examples pages

**Files:**
- Modify: `src/app/contact/page.tsx:5-9`
- Modify: `src/app/examples/page.tsx:5-9`

- [ ] **Step 1: Expand contact page metadata**

Replace the metadata export in `src/app/contact/page.tsx`:
```typescript
export const metadata: Metadata = {
  title: "צור קשר | Peroot",
  description: "צור קשר עם צוות Peroot - שאלות, הצעות, דיווח על באגים.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "צור קשר | Peroot",
    description: "צור קשר עם צוות Peroot - שאלות, הצעות, דיווח על באגים.",
    url: "/contact",
    siteName: "Peroot",
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "צור קשר | Peroot",
    description: "צור קשר עם צוות Peroot - שאלות, הצעות, דיווח על באגים.",
  },
};
```

- [ ] **Step 2: Expand examples page metadata**

Same pattern for `src/app/examples/page.tsx` with examples-specific copy.

- [ ] **Step 3: Commit**

```bash
git add src/app/contact/page.tsx src/app/examples/page.tsx
git commit -m "feat: Add Open Graph and Twitter Card metadata to contact and examples pages"
```

---

### Task 11: Add structured data (JSON-LD) to shared prompt pages

**Files:**
- Modify: `src/app/p/[id]/page.tsx`

**Context:** Shared prompt pages have OG metadata but no Schema.org structured data. Adding BreadcrumbList and CreativeWork schemas improves SEO for these public-facing pages.

- [ ] **Step 1: Add JSON-LD script to the page component**

In `src/app/p/[id]/page.tsx`, after line 69 (inside the return, before the main div), add:
```typescript
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            name: `פרומפט - ${prompt.category}`,
            description: prompt.prompt?.slice(0, 160),
            url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://peroot.space"}/p/${id}`,
            inLanguage: "he",
            creator: { "@type": "Organization", name: "Peroot" },
          }),
        }}
      />
```

- [ ] **Step 2: Commit**

```bash
git add src/app/p/\\[id\\]/page.tsx
git commit -m "feat: Add CreativeWork JSON-LD to shared prompt pages"
```

---

### Task 12: Fix heading hierarchy on pricing page

**Files:**
- Modify: `src/app/pricing/page.tsx`

**Context:** Page has h1 -> h3 (skipping h2). The "איך עובדת מערכת הקרדיטים?" heading should be h2, not h3.

- [ ] **Step 1: Find and fix the heading level**

Search for `<h3` in pricing/page.tsx that contains "איך עובדת מערכת הקרדיטים" and change it to `<h2`. Adjust font size classes if needed to maintain visual appearance (add `text-xl` or similar if changing from h3 to h2 changes the default size).

- [ ] **Step 2: Commit**

```bash
git add src/app/pricing/page.tsx
git commit -m "fix: Correct heading hierarchy on pricing page (h1->h2, not h1->h3)"
```

---

### Task 13: Add Zod validation to unvalidated POST routes

**Files:**
- Modify: `src/app/api/checkout/route.ts`
- Modify: `src/app/api/user/onboarding/complete/route.ts`
- Modify: `src/app/api/user/achievements/award/route.ts`

**Context:** These POST/DELETE routes accept request bodies without schema validation. Admin routes use Zod via `parseAdminInput()` but non-admin routes don't.

- [ ] **Step 1: Add Zod schema to checkout route**

At the top of `src/app/api/checkout/route.ts`:
```typescript
import { z } from "zod";

const CheckoutSchema = z.object({
  variantId: z.string().min(1),
});
```

Replace the body parsing (line 20):
```typescript
    const body = await request.json();
    const parsed = CheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { variantId } = parsed.data;
```

- [ ] **Step 2: Add Zod schema to achievements award route**

Add validation for the achievement ID being passed.

- [ ] **Step 3: Add Zod schema to onboarding complete route**

If it accepts any body data, validate it. If it's just a trigger endpoint with no body, add a comment noting that.

- [ ] **Step 4: Verify build passes**

Run: `npx next build 2>&1 | tail -5`

- [ ] **Step 5: Commit**

```bash
git add src/app/api/checkout/route.ts src/app/api/user/onboarding/complete/route.ts src/app/api/user/achievements/award/route.ts
git commit -m "fix: Add Zod input validation to checkout, achievements, and onboarding routes"
```

---

### Task 14: Expand ErrorBoundary to dynamic imports

**Files:**
- Modify: `src/app/HomeClient.tsx`

**Context:** Dynamic imports in HomeClient have Suspense loading fallbacks but no error fallbacks. If a lazy-loaded chunk fails to load, the user sees nothing.

- [ ] **Step 1: Add ErrorBoundary import to HomeClient**

```typescript
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
```

- [ ] **Step 2: Wrap each dynamic import's Suspense with ErrorBoundary**

For each dynamically imported view (LibraryView, PersonalLibraryView, ResultSection, etc.), wrap the Suspense with ErrorBoundary:

```typescript
<ErrorBoundary name="LibraryView">
  <Suspense fallback={<LibraryViewSkeleton />}>
    <LibraryView />
  </Suspense>
</ErrorBoundary>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/HomeClient.tsx
git commit -m "fix: Add ErrorBoundary around dynamic imports for graceful degradation"
```

---

## Chunk 3: Tier 3 - Testing, CSP, Bundle Analysis, Polish

### Task 15: Add test scripts and coverage config

**Files:**
- Modify: `package.json:5-12` (scripts section)
- Modify: `vitest.config.ts`

- [ ] **Step 1: Add test scripts to package.json**

Add to scripts:
```json
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit"
```

- [ ] **Step 2: Add coverage config to vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    include: ['**/*.test.ts', '**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov'],
      include: ['src/lib/**', 'src/hooks/**', 'src/app/api/**'],
      exclude: ['**/*.test.*', '**/__tests__/**'],
    },
  },
});
```

- [ ] **Step 3: Install coverage provider**

Run: `npm install --save-dev @vitest/coverage-v8`

- [ ] **Step 4: Commit**

```bash
git add package.json vitest.config.ts
git commit -m "feat: Add test coverage configuration and scripts"
```

---

### Task 16: Write tests for critical API routes

**Files:**
- Create: `src/app/api/user/__tests__/delete-account.test.ts`
- Create: `src/app/api/__tests__/checkout.test.ts`
- Create: `src/lib/__tests__/api-error.test.ts`
- Create: `src/lib/__tests__/env.test.ts`

**Context:** Only 5 test files exist. Priority is testing the most critical paths: account deletion, checkout, and utility functions.

- [ ] **Step 1: Write delete-account tests**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test: returns 401 when unauthenticated
// Test: calls Promise.allSettled for data deletion
// Test: returns 500 when admin deletion fails
// Test: returns 200 on success
// Test: rate limits excessive attempts
```

Mock Supabase client and test each error path.

- [ ] **Step 2: Write api-error utility tests**

```typescript
import { describe, it, expect } from 'vitest';
import { apiError, API_ERRORS } from '@/lib/api-error';

describe('apiError', () => {
  it('returns correct status and body for each error type', () => {
    const res = apiError('unauthorized');
    expect(res.status).toBe(401);
  });

  it('returns 500 for internal errors', () => {
    const res = apiError('internal');
    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 3: Write env validation tests**

```typescript
import { describe, it, expect } from 'vitest';

describe('validateEnv', () => {
  it('throws when required env vars are missing', () => {
    // Save and clear env vars, verify validateEnv throws
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run`
Expected: All new tests pass

- [ ] **Step 5: Commit**

```bash
git add src/app/api/user/__tests__/ src/app/api/__tests__/ src/lib/__tests__/
git commit -m "test: Add tests for delete-account, checkout, api-error, and env validation"
```

---

### Task 17: Configure Playwright for E2E tests

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/smoke.spec.ts`
- Modify: `package.json` (add e2e script)
- Modify: `.github/workflows/ci.yml` (add e2e step - optional)

**Context:** `@playwright/test` is already installed but not configured. Start with a simple smoke test.

- [ ] **Step 1: Create playwright.config.ts**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 2: Create smoke test**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Peroot/);
  });

  test('pricing page loads', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('blog page loads', async ({ page }) => {
    await page.goto('/blog');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('contact page loads', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('h1')).toContainText('צור קשר');
  });

  test('shared prompt 404 for invalid id', async ({ page }) => {
    const response = await page.goto('/p/nonexistent-id');
    expect(response?.status()).toBe(404);
  });
});
```

- [ ] **Step 3: Add e2e script to package.json**

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

- [ ] **Step 4: Install browsers**

Run: `npx playwright install chromium`

- [ ] **Step 5: Run smoke tests locally**

Run: `npx playwright test`
Expected: All 5 tests pass

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts e2e/ package.json
git commit -m "test: Configure Playwright and add smoke E2E tests"
```

---

### Task 18: Install and configure bundle analyzer

**Files:**
- Modify: `package.json` (add devDependency)
- Modify: `next.config.ts`

- [ ] **Step 1: Install bundle analyzer**

Run: `npm install --save-dev @next/bundle-analyzer`

- [ ] **Step 2: Add to next.config.ts**

At the top of `next.config.ts`:
```typescript
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});
```

At the bottom, change the export:
```typescript
export default withBundleAnalyzer(withSentryConfig(nextConfig, sentryWebpackPluginOptions));
```

- [ ] **Step 3: Add analyze script**

In package.json scripts:
```json
"analyze": "ANALYZE=true next build"
```

- [ ] **Step 4: Commit**

```bash
git add package.json next.config.ts
git commit -m "feat: Add @next/bundle-analyzer for bundle size visibility"
```

---

### Task 19: Reduce Sentry sample rate for production cost

**Files:**
- Modify: `sentry.client.config.ts`
- Modify: `sentry.server.config.ts`
- Modify: `sentry.edge.config.ts`

**Context:** All three configs have `tracesSampleRate: 1.0` (100% of requests traced). This is expensive at scale and unnecessary. Lower to 10-20% for production.

- [ ] **Step 1: Update all three Sentry configs**

In each file, change:
```typescript
tracesSampleRate: 1.0,
```
To:
```typescript
tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
```

Also consider changing `sendDefaultPii: true` to `sendDefaultPii: false` unless PII is explicitly needed for debugging. If keeping it, add a comment explaining why.

- [ ] **Step 2: Commit**

```bash
git add sentry.client.config.ts sentry.server.config.ts sentry.edge.config.ts
git commit -m "perf: Reduce Sentry trace sample rate to 10% in production"
```

---

### Task 20: Convert raw img tags to next/Image

**Files:**
- Modify: `src/app/settings/page.tsx` (avatar img)
- Modify: `src/app/auth/reset-password/page.tsx` (logo img)
- Modify: `src/app/blog/page.tsx` (thumbnails)
- Modify: `src/app/blog/[slug]/page.tsx` (thumbnail)
- Modify: `src/components/ui/AnimatedLogo.tsx` (logo)
- Modify: `src/components/layout/top-logo.tsx` (logo)

**Context:** 9 raw `<img>` tags cause unoptimized image loading and potential CLS. Convert to `next/Image` where possible. For external URLs (user avatars from Google), keep as `<img>` with explicit width/height and loading="lazy".

- [ ] **Step 1: Convert local asset img tags**

For logo references (AnimatedLogo, top-logo, reset-password), convert:
```tsx
<img src="/logo.svg" ... />
```
To:
```tsx
import Image from "next/image";
// ...
<Image src="/logo.svg" alt="Peroot" width={40} height={40} priority />
```

- [ ] **Step 2: Convert blog thumbnails**

For blog page thumbnails, use next/Image with remote patterns (already configured in Task 6):
```tsx
<Image
  src={post.thumbnail_url}
  alt={post.title}
  width={400}
  height={225}
  className="..."
  loading="lazy"
/>
```

- [ ] **Step 3: For user avatars (external URLs)**

Keep as `<img>` but ensure they have explicit `width`, `height`, `loading="lazy"`, and `decoding="async"` attributes.

- [ ] **Step 4: Verify build passes**

Run: `npx next build 2>&1 | tail -5`

- [ ] **Step 5: Commit**

```bash
git add src/app/settings/page.tsx src/app/auth/reset-password/page.tsx src/app/blog/ src/components/ui/AnimatedLogo.tsx src/components/layout/top-logo.tsx
git commit -m "perf: Convert raw img tags to next/Image for optimization and CLS prevention"
```

---

### Task 21: Add Prettier for consistent formatting

**Files:**
- Create: `.prettierrc`
- Create: `.prettierignore`
- Modify: `package.json` (add script)

- [ ] **Step 1: Install Prettier**

Run: `npm install --save-dev prettier`

- [ ] **Step 2: Create .prettierrc**

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100
}
```

- [ ] **Step 3: Create .prettierignore**

```
.next
node_modules
public
*.md
```

- [ ] **Step 4: Add format script**

In package.json scripts:
```json
"format": "prettier --write \"src/**/*.{ts,tsx}\"",
"format:check": "prettier --check \"src/**/*.{ts,tsx}\""
```

- [ ] **Step 5: Commit config only (don't format all files yet)**

```bash
git add .prettierrc .prettierignore package.json
git commit -m "chore: Add Prettier configuration for consistent formatting"
```

---

### Task 22: Add pre-commit hooks with Husky + lint-staged

**Files:**
- Create: `.husky/pre-commit`
- Create: `.lintstagedrc`
- Modify: `package.json`

- [ ] **Step 1: Install Husky and lint-staged**

Run: `npm install --save-dev husky lint-staged`

- [ ] **Step 2: Initialize Husky**

Run: `npx husky init`

- [ ] **Step 3: Create pre-commit hook**

Write to `.husky/pre-commit`:
```bash
npx lint-staged
```

- [ ] **Step 4: Create lint-staged config**

Create `.lintstagedrc`:
```json
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,yml}": ["prettier --write"]
}
```

- [ ] **Step 5: Add prepare script**

In package.json scripts:
```json
"prepare": "husky"
```

- [ ] **Step 6: Commit**

```bash
git add .husky/ .lintstagedrc package.json
git commit -m "chore: Add Husky + lint-staged for pre-commit validation"
```

---

### Task 23: Tighten CSP by adding nonce support

**Files:**
- Modify: `next.config.ts:14-25` (CSP header)
- Modify: `src/middleware.ts` (generate nonce)

**Context:** Current CSP uses `unsafe-inline` and `unsafe-eval` which weaken protection. Next.js 16 supports CSP nonces via middleware. However, this is complex and may break third-party scripts (PostHog, Sentry, LemonSqueezy).

**Approach:** Remove `unsafe-eval` (the most dangerous). Keep `unsafe-inline` for now since Next.js still requires it for some inline styles. Add `strict-dynamic` for scripts.

- [ ] **Step 1: Remove unsafe-eval from CSP**

In `next.config.ts`, change the script-src line:
```typescript
"script-src 'self' 'unsafe-inline' https://*.posthog.com https://*.sentry.io https://*.lemonsqueezy.com",
```

Note: Removing `unsafe-eval` may break some third-party scripts. Test thoroughly.

- [ ] **Step 2: Test that PostHog, Sentry, and LemonSqueezy still work**

Deploy to preview and verify:
- PostHog events fire
- Sentry captures errors
- LemonSqueezy checkout works

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "security: Remove unsafe-eval from CSP header"
```

---

### Task 24: Final verification and deploy

- [ ] **Step 1: Run full test suite**

```bash
npm run lint && npx tsc --noEmit && npx vitest run && npx next build
```

Expected: All pass

- [ ] **Step 2: Run E2E smoke tests**

```bash
npx playwright test
```

Expected: All pass

- [ ] **Step 3: Push to deploy**

```bash
git push origin main
```

- [ ] **Step 4: Verify production**

Check these on the live site:
- Homepage loads fast (< 3s LCP)
- Cookie consent banner appears
- Blog images are optimized (check network tab for WebP/AVIF)
- Error pages work (navigate to /nonexistent)
- Share page has structured data (check with Google Rich Results Test)
- Security headers present (check with securityheaders.com)

---

## Summary

| Task | Area | Tier | Est. Effort |
|------|------|------|-------------|
| 1. Delete-account hardening | Security | 1 | 5 min |
| 2. Rate limit checkout/achievements | Security | 1 | 5 min |
| 3. Global error page | Error Handling | 1 | 3 min |
| 4. ErrorBoundary in layout | Error Handling | 1 | 3 min |
| 5. TypeScript in CI | Testing | 1 | 2 min |
| 6. Image optimization config | Performance | 1 | 3 min |
| 7. Compress assets | Performance | 1 | 10 min |
| 8. Error logging in routes | Error Handling | 1 | 15 min |
| 9. Loading.tsx files | Performance | 2 | 10 min |
| 10. OG metadata expansion | SEO | 2 | 5 min |
| 11. JSON-LD for shared prompts | SEO | 2 | 5 min |
| 12. Fix heading hierarchy | SEO | 2 | 2 min |
| 13. Zod validation | Security | 2 | 10 min |
| 14. ErrorBoundary on dynamic imports | Error Handling | 2 | 5 min |
| 15. Test coverage config | Testing | 3 | 5 min |
| 16. Critical API route tests | Testing | 3 | 30 min |
| 17. Playwright E2E | Testing | 3 | 20 min |
| 18. Bundle analyzer | Performance | 3 | 5 min |
| 19. Sentry sample rate | Performance | 3 | 3 min |
| 20. Convert img to next/Image | Performance | 3 | 15 min |
| 21. Prettier | Code Quality | 3 | 5 min |
| 22. Husky + lint-staged | Code Quality | 3 | 5 min |
| 23. Tighten CSP | Security | 3 | 10 min |
| 24. Final verification | All | 3 | 10 min |

**Total: 24 tasks across 3 tiers**
