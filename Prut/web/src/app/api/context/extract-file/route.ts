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

    const rl = await checkExtractionLimit(user.id, tier);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `חרגת ממכסת העיבוד היומית (${rl.limit}). נסה שוב מחר או שדרג ל-Pro.`, remaining: 0 },
        { status: 429 },
      );
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
    const block = await processAttachment({
      id: crypto.randomUUID(),
      type: 'file',
      userId: user.id,
      tier,
      buffer,
      filename: file.name,
      mimeType: file.type,
    });

    return NextResponse.json({ block });
  } catch (err) {
    logger.error('[context/extract-file]', err);
    return NextResponse.json({ error: 'שגיאה בעיבוד הקובץ' }, { status: 500 });
  }
}
