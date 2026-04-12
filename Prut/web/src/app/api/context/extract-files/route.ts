// src/app/api/context/extract-files/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processBatch } from '@/lib/context/engine';
import { checkExtractionLimit } from '@/lib/context/engine/extraction-rate-limit';
import { logger } from '@/lib/logger';
import { MAX_FILE_SIZE_MB } from '@/lib/context/engine/extract';
import { getContextLimits } from '@/lib/plans';
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

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    if (files.length === 0) {
      return NextResponse.json({ error: 'לא נבחרו קבצים' }, { status: 400 });
    }

    // Fix 1: enforce per-tier file cap (mirrors client-side limits in useContextAttachments)
    const maxFilesForTier = getContextLimits(tier).maxFiles;
    if (files.length > maxFilesForTier) {
      return NextResponse.json(
        { error: `ניתן לעבד עד ${maxFilesForTier} קבצים בבת אחת` },
        { status: 400 },
      );
    }

    // Fix 2: call checkExtractionLimit once per file so the rate-limit counter
    // correctly accounts for batch size (the function increments by 1 per call).
    for (let i = 0; i < files.length; i++) {
      const rl = await checkExtractionLimit(user.id, tier);
      if (!rl.allowed) {
        return NextResponse.json(
          { error: `חרגת ממכסת העיבוד היומית (${rl.limit}). נסה שוב מחר או שדרג ל-Pro.`, remaining: 0 },
          { status: 429 },
        );
      }
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
