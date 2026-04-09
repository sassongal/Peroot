// src/app/api/context/extract-url/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processAttachment } from '@/lib/context/engine';
import { checkExtractionLimit } from '@/lib/context/engine/extraction-rate-limit';
import { logger } from '@/lib/logger';
import type { PlanTier } from '@/lib/context/engine/types';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles').select('plan_tier').eq('id', user.id).maybeSingle();
    const tier: PlanTier = profile?.plan_tier === 'pro' ? 'pro' : 'free';

    const rl = await checkExtractionLimit(user.id, tier);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'חרגת ממכסת העיבוד היומית' }, { status: 429 },
      );
    }

    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL חסר' }, { status: 400 });
    }

    const block = await processAttachment({
      id: crypto.randomUUID(), type: 'url', userId: user.id, tier, url,
    });
    return NextResponse.json({ block });
  } catch (err) {
    logger.error('[context/extract-url]', err);
    const msg = err instanceof Error ? err.message : 'שגיאה בעיבוד הקישור';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
