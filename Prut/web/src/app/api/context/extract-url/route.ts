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

    // Log origin+path only — query params may contain tokens/keys
    const safeUrl = (() => { try { const u = new URL(url); return u.origin + u.pathname; } catch { return '(invalid)'; } })();
    logger.info('[context/extract-url] processing', { url: safeUrl, tier });
    let block;
    try {
      block = await processAttachment({
        id: crypto.randomUUID(), type: 'url', userId: user.id, tier, url,
      });
    } catch (engineErr) {
      const msg = engineErr instanceof Error ? engineErr.message : String(engineErr);
      const stack = engineErr instanceof Error ? engineErr.stack : undefined;
      logger.error('[context/extract-url] engine error', { msg, stack, url: safeUrl, tier });
      const userMsg = engineErr instanceof Error && /^[\u0590-\u05FF]/.test(engineErr.message)
        ? engineErr.message
        : 'שגיאה בעיבוד הקישור';
      return NextResponse.json({ error: userMsg }, { status: 500 });
    }
    return NextResponse.json({ block });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('[context/extract-url] unhandled error', { msg });
    const userMsg = err instanceof Error && /^[\u0590-\u05FF]/.test(err.message)
      ? err.message
      : 'שגיאה בעיבוד הקישור';
    return NextResponse.json({ error: userMsg }, { status: 500 });
  }
}
