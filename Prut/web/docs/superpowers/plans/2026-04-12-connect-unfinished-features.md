# P2-2: Connect Unfinished Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire two built-but-disconnected features: cron churn alert email and multi-file batch context processing.

**Architecture:** Feature A patches one cron route (~12 lines). Feature B adds a new `/api/context/extract-files` batch endpoint that wraps the existing `processBatch` engine call, then threads an `addFiles` hook function through the component prop chain to use it on multi-file drop.

**Tech Stack:** Next.js App Router route handlers · Vitest · Resend (via `EmailService`) · Supabase service client · `processBatch` from `@/lib/context/engine`

---

## Feature A: Re-enable Cron Churn Alert Email

### Task 1: Add churn email to sync-subscriptions cron

**Files:**
- Modify: `src/app/api/cron/sync-subscriptions/route.ts:1-4` (imports)
- Modify: `src/app/api/cron/sync-subscriptions/route.ts:128-129` (disabled block)

The cron already fetches `settings?.contact_email` at line 72 and has `userId` available at line 77. To get the user's email, call `supabase.auth.admin.getUserById`. The `EmailService.send` pattern is identical to how `churn.ts` (the webhook) sends `adminChurnAlertEmail`.

- [ ] **Step 1: Add imports**

In `src/app/api/cron/sync-subscriptions/route.ts`, replace the current import block:

```ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
import { recordCronSuccess } from "@/lib/cron-heartbeat";
```

With:

```ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
import { recordCronSuccess } from "@/lib/cron-heartbeat";
import { EmailService } from "@/lib/emails/service";
import { adminCronChurnAlertEmail } from "@/lib/emails/templates/admin-alerts";
```

- [ ] **Step 2: Replace the disabled comment block**

Find lines 128–129 (inside the `if (profile.plan_tier === "pro")` block, after the ledger try/catch):

```ts
        // Churn emails disabled — automated email sending is paused
        logger.info(`[sync-subscriptions] Churn email skipped (disabled) for user ${userId}`);
```

Replace with:

```ts
        try {
          const adminEmail = settings?.contact_email || "gal@joya-tech.net";
          const { data: authData } = await supabase.auth.admin.getUserById(userId);
          await EmailService.send({
            to: adminEmail,
            subject: `[Peroot Cron] Churn: ${(authData.user?.email || userId).slice(0, 100)}`,
            html: adminCronChurnAlertEmail({
              customerEmail: authData.user?.email || "—",
              userId,
            }),
            emailType: "admin_churn_alert",
          });
          logger.info(`[sync-subscriptions] Churn alert sent for user ${userId}`);
        } catch (emailErr) {
          logger.error("[sync-subscriptions] Churn email error:", emailErr);
        }
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck 2>&1 | grep -A2 sync-subscriptions
```

Expected: no errors in that file.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron/sync-subscriptions/route.ts
git commit -m "feat(cron): re-enable churn alert email in sync-subscriptions"
```

---

## Feature B: Multi-File Batch Context Processing

The current flow processes files one-at-a-time: each file drop → separate `POST /api/context/extract-file` → one ContextBlock. `processBatch` already exists in the engine but is never called. This feature wires it up.

### Task 2: Create batch extraction endpoint

**Files:**
- Create: `src/app/api/context/extract-files/route.ts`
- Test: `src/app/api/context/__tests__/extract-files.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/api/context/__tests__/extract-files.test.ts`:

```ts
// src/app/api/context/__tests__/extract-files.test.ts
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { plan_tier: 'pro' } }) }) }) }),
  }),
}));
vi.mock('@/lib/context/engine/extraction-rate-limit', () => ({
  checkExtractionLimit: async () => ({ allowed: true, remaining: 10, limit: 100 }),
}));
vi.mock('@/lib/context/engine/enrich', () => ({
  enrichContent: async () => ({
    title: 'Batch Doc', documentType: 'generic',
    summary: 'א'.repeat(120), keyFacts: ['fact1'], entities: [],
  }),
}));
vi.mock('@/lib/context/engine/cache', () => ({
  getCachedBlock: async () => null, putCachedBlock: async () => {},
}));

import { POST } from '../extract-files/route';

let pdfPath: string;

beforeAll(async () => {
  const { PDFDocument } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  page.drawText('Batch test PDF', { x: 50, y: 700, size: 12 });
  const bytes = await doc.save();

  const tmpDir = path.join(os.tmpdir(), 'peroot-test-fixtures');
  mkdirSync(tmpDir, { recursive: true });
  pdfPath = path.join(tmpDir, 'batch.pdf');
  writeFileSync(pdfPath, bytes);
});

describe('POST /api/context/extract-files (batch)', () => {
  it('returns blocks array for two PDFs', async () => {
    const { readFileSync } = await import('node:fs');
    const pdf = readFileSync(pdfPath);
    const form = new FormData();
    form.append('files', new File([pdf], 'a.pdf', { type: 'application/pdf' }));
    form.append('files', new File([pdf], 'b.pdf', { type: 'application/pdf' }));
    const req = new Request('http://t', { method: 'POST', body: form });
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.blocks)).toBe(true);
    expect(body.blocks).toHaveLength(2);
    expect(body.blocks[0].type).toBe('file');
    expect(body.blocks[0].stage).toBe('ready');
  });

  it('returns 400 when no files provided', async () => {
    const form = new FormData();
    const req = new Request('http://t', { method: 'POST', body: form });
    const res = await POST(req as unknown as import('next/server').NextRequest);
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/app/api/context/__tests__/extract-files.test.ts 2>&1 | tail -20
```

Expected: FAIL — `Cannot find module '../extract-files/route'`

- [ ] **Step 3: Create the batch route**

Create `src/app/api/context/extract-files/route.ts`:

```ts
// src/app/api/context/extract-files/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processBatch } from '@/lib/context/engine';
import { checkExtractionLimit } from '@/lib/context/engine/extraction-rate-limit';
import { logger } from '@/lib/logger';
import { MAX_FILE_SIZE_MB } from '@/lib/context/engine/extract';
import type { ProcessAttachmentInput } from '@/lib/context/engine';
import type { PlanTier } from '@/lib/context/engine/types';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles').select('plan_tier').eq('id', user.id).maybeSingle();
    const tier: PlanTier = profile?.plan_tier === 'pro' ? 'pro' : 'free';

    const rl = await checkExtractionLimit(user.id, tier);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `חרגת ממכסת העיבוד היומית (${rl.limit}). נסה שוב מחר או שדרג ל-Pro.`, remaining: 0 },
        { status: 429 },
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    if (files.length === 0) {
      return NextResponse.json({ error: 'לא נבחרו קבצים' }, { status: 400 });
    }

    for (const file of files) {
      const sizeMb = file.size / (1024 * 1024);
      if (sizeMb > MAX_FILE_SIZE_MB) {
        return NextResponse.json(
          { error: `הקובץ ${file.name} גדול מדי (מקסימום ${MAX_FILE_SIZE_MB}MB)` },
          { status: 400 },
        );
      }
    }

    const inputs: ProcessAttachmentInput[] = await Promise.all(
      files.map(async (file) => ({
        id: crypto.randomUUID(),
        type: 'file' as const,
        userId: user.id,
        tier,
        buffer: Buffer.from(await file.arrayBuffer()),
        filename: file.name,
        mimeType: file.type,
      }))
    );

    logger.info('[context/extract-files] batch', { count: files.length, tier });
    const blocks = await processBatch(inputs);
    return NextResponse.json({ blocks });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('[context/extract-files] error', { msg });
    return NextResponse.json({ error: 'שגיאה בעיבוד הקבצים' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/app/api/context/__tests__/extract-files.test.ts 2>&1 | tail -20
```

Expected: PASS — 2 tests passing.

- [ ] **Step 5: Add route to middleware allowlist**

In `src/middleware.ts`, the context routes are already whitelisted. Verify `/api/context` is in the list:

```bash
grep "api/context" src/middleware.ts
```

Expected: `/api/context` present (the prefix already covers the new route — no change needed).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/context/extract-files/route.ts src/app/api/context/__tests__/extract-files.test.ts
git commit -m "feat(context): add batch file extraction endpoint using processBatch"
```

---

### Task 3: Add `addFiles` to `useContextAttachments` hook

**Files:**
- Modify: `src/hooks/useContextAttachments.ts`

- [ ] **Step 1: Add `addFiles` function after `addFile`**

In `src/hooks/useContextAttachments.ts`, add this function after the closing of `addFile` (after line ~141, before `addUrl`):

```ts
  const addFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      // Validate count atomically
      const currentCount = countByType(attachmentsRef.current, "file") + pendingCounts.current.file;
      if (currentCount + files.length > limits.maxFiles) {
        throw new Error(`ניתן לצרף עד ${limits.maxFiles} קבצים`);
      }
      pendingCounts.current.file += files.length;

      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) throw new Error(`הקובץ ${file.name} גדול מדי (מקסימום 10MB)`);
        if (!ACCEPTED_FILE_TYPES.includes(file.type)) throw new Error(`פורמט קובץ לא נתמך: ${file.name}`);
      }

      const ids = files.map(() => generateId());
      setAttachments((prev) => [
        ...prev,
        ...files.map((file, i) => ({
          id: ids[i],
          type: "file" as AttachmentType,
          name: file.name,
          filename: file.name,
          format: file.name.split('.').pop()?.toLowerCase(),
          size_mb: parseFloat((file.size / (1024 * 1024)).toFixed(2)),
          status: "loading" as const,
        })),
      ]);

      try {
        const formData = new FormData();
        for (const file of files) formData.append("files", file);
        const res = await fetch(getApiPath("/api/context/extract-files"), {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "שגיאה בחילוץ הקבצים");
        }
        const body = await res.json();
        const blocks: unknown[] = body.blocks ?? [];
        setAttachments((prev) =>
          prev.map((a) => {
            const idx = ids.indexOf(a.id);
            if (idx === -1) return a;
            const block = blocks[idx] as { stage?: string } | undefined;
            if (!block) return { ...a, status: "error" as const, error: "שגיאה בעיבוד" };
            return {
              ...a,
              block,
              stage: block.stage,
              status: block.stage === "error" ? "error" as const : "ready" as const,
            };
          })
        );
      } catch (err) {
        setAttachments((prev) =>
          prev.map((a) =>
            ids.includes(a.id)
              ? { ...a, status: "error" as const, error: err instanceof Error ? err.message : "שגיאה לא צפויה" }
              : a
          )
        );
      } finally {
        pendingCounts.current.file -= files.length;
      }
    },
    [limits.maxFiles]
  );
```

- [ ] **Step 2: Add `addFiles` to the return value**

Find the `return {` block (line ~325) and add `addFiles`:

```ts
  return {
    attachments,
    totalTokens,
    isOverLimit,
    limits,
    addFile,
    addFiles,
    addUrl,
    addImage,
    retryAttachment,
    removeAttachment,
    clearAll,
    getContextPayload,
  };
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck 2>&1 | grep -A2 useContextAttachments
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useContextAttachments.ts
git commit -m "feat(context): add addFiles batch hook to useContextAttachments"
```

---

### Task 4: Wire `addFiles` through the component prop chain

**Files:**
- Modify: `src/app/HomeClient.tsx:831` (add `onAddFiles` prop)
- Modify: `src/components/features/home/InputSection.tsx:74` (add prop type + thread through)
- Modify: `src/components/features/prompt-improver/PromptInput.tsx:53` (add prop + use in drop handler)

The goal: when a user drops ≥2 document files simultaneously, call `onAddFiles(docFiles)` (one batch request) instead of looping `onAddFile` (N serial requests).

- [ ] **Step 1: Add `onAddFiles` to `PromptInput` props and use it in `onDrop`**

In `src/components/features/prompt-improver/PromptInput.tsx`:

**Add to props interface** (around line 53):
```ts
  onAddFiles?: (files: File[]) => Promise<void>;
```

**Destructure** (around line 144 where other props are destructured):
```ts
  onAddFiles,
```

**Update the `onDrop` handler** (lines 358–374). Replace:
```ts
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            const files = Array.from(e.dataTransfer.files);
            for (const file of files) {
              try {
                if (file.type.startsWith('image/')) {
                  onAddImage?.(file);
                  toast.success(`"${file.name}" נוספה`);
                } else {
                  onAddFile?.(file);
                  toast.success(`"${file.name}" נוסף`);
                }
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "שגיאה בהוספת קובץ");
              }
            }
          }}>
```

With:
```ts
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            const dropped = Array.from(e.dataTransfer.files);
            const imageFiles = dropped.filter((f) => f.type.startsWith('image/'));
            const docFiles = dropped.filter((f) => !f.type.startsWith('image/'));

            for (const img of imageFiles) {
              try { onAddImage?.(img); toast.success(`"${img.name}" נוספה`); }
              catch (err) { toast.error(err instanceof Error ? err.message : "שגיאה בהוספת תמונה"); }
            }

            if (docFiles.length === 0) return;
            if (docFiles.length > 1 && onAddFiles) {
              onAddFiles(docFiles).then(() => {
                toast.success(`${docFiles.length} קבצים נוספו`);
              }).catch((err) => {
                toast.error(err instanceof Error ? err.message : "שגיאה בהוספת קבצים");
              });
            } else {
              for (const file of docFiles) {
                try { onAddFile?.(file); toast.success(`"${file.name}" נוסף`); }
                catch (err) { toast.error(err instanceof Error ? err.message : "שגיאה בהוספת קובץ"); }
              }
            }
          }}>
```

- [ ] **Step 2: Thread `onAddFiles` through `InputSection`**

In `src/components/features/home/InputSection.tsx`:

**Add to props interface** (around line 74):
```ts
  onAddFiles?: (files: File[]) => Promise<void>;
```

**Destructure** (around line 135):
```ts
  onAddFiles,
```

**Pass through to PromptInput** (line ~209, wherever PromptInput is rendered):
```ts
onAddFiles={onAddFiles}
```

- [ ] **Step 3: Pass `addFiles` from `HomeClient`**

In `src/app/HomeClient.tsx`, around line 831:
```ts
          onAddFile={context.addFile}
          onAddFiles={context.addFiles}
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck 2>&1 | grep -E "PromptInput|InputSection|HomeClient"
```

Expected: no errors.

- [ ] **Step 5: Build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds with no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/features/prompt-improver/PromptInput.tsx \
        src/components/features/home/InputSection.tsx \
        src/app/HomeClient.tsx
git commit -m "feat(context): wire addFiles through UI — batch drop replaces serial requests"
```

---

## Self-Review

**Spec coverage:**
- ✅ Re-enable churn email → Task 1
- ✅ `processBatch` connected to real endpoint → Task 2
- ✅ Hook exposes `addFiles` → Task 3
- ✅ UI uses batch on multi-file drop → Task 4

**Placeholder scan:** No TBDs. All code blocks are complete.

**Type consistency:**
- `addFiles: (files: File[]) => Promise<void>` used consistently in Tasks 3 and 4
- `onAddFiles?: (files: File[]) => Promise<void>` prop type matches in `InputSection` and `PromptInput`
- `ProcessAttachmentInput` imported from `@/lib/context/engine` (not the types subpath) in Task 2 — matches how `extract-file/route.ts` imports it

**Edge case covered:** Single-file drop still goes through the serial `onAddFile` path (Task 4 Step 1) — no regression.
