// src/app/api/context/extract-file/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processAttachment } from '@/lib/context/engine';
import { checkExtractionLimit } from '@/lib/context/engine/extraction-rate-limit';
import { logger } from '@/lib/logger';
import { MAX_FILE_SIZE_MB } from '@/lib/context/engine/extract';
import type { PlanTier } from '@/lib/context/engine/types';

export const maxDuration = 30;

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

    try {
      const rl = await checkExtractionLimit(user.id, tier);
      if (!rl.allowed) {
        return NextResponse.json(
          { error: `חרגת ממכסת העיבוד היומית (${rl.limit}). נסה שוב מחר או שדרג ל-Pro.`, remaining: 0 },
          { status: 429 },
        );
      }
    } catch (rlErr) {
      logger.error('[context/extract-file] rate limit check failed, allowing request', rlErr);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'לא נבחר קובץ' }, { status: 400 });

    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_FILE_SIZE_MB) {
      return NextResponse.json(
        { error: `הקובץ גדול מדי (מקסימום ${MAX_FILE_SIZE_MB}MB)` }, { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    logger.info('[context/extract-file] processing', { filename: file.name, sizeMb: sizeMb.toFixed(2), mimeType: file.type, tier });
    let block;
    try {
      block = await processAttachment({
        id: crypto.randomUUID(),
        type: 'file',
        userId: user.id,
        tier,
        buffer,
        filename: file.name,
        mimeType: file.type,
      });
    } catch (engineErr) {
      const msg = engineErr instanceof Error ? engineErr.message : String(engineErr);
      const stack = engineErr instanceof Error ? engineErr.stack : undefined;
      logger.error('[context/extract-file] engine error', { msg, stack, filename: file.name, tier });
      return NextResponse.json({ error: 'שגיאה בעיבוד הקובץ' }, { status: 500 });
    }

    return NextResponse.json({ block });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('[context/extract-file] unhandled error', { msg });
    return NextResponse.json({ error: 'שגיאה בעיבוד הקובץ' }, { status: 500 });
  }
}
