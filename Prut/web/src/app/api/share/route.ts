import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from "@/lib/logger";
import { z } from "zod";
import { checkRateLimit } from "@/lib/ratelimit";

const ShareSchema = z.object({
  prompt: z.string().min(1).max(50000),
  original_input: z.string().max(50000).optional(),
  category: z.string().max(100).default("General"),
  capability_mode: z.string().max(50).default("STANDARD"),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(user.id, 'share');
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
    }

    const body = await request.json();
    const parseResult = ShareSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    const { prompt, original_input, category, capability_mode } = parseResult.data;

    const { data, error } = await supabase
      .from('shared_prompts')
      .insert({
        prompt: prompt.trim(),
        original_input: original_input?.trim() || null,
        category: category || 'General',
        capability_mode: capability_mode || 'STANDARD',
        user_id: user.id,
      })
      .select('id')
      .single();

    if (error) {
      logger.error('[Share] Error:', error);
      return NextResponse.json({ error: 'Failed to share prompt' }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (error) {
    logger.error('[Share] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
