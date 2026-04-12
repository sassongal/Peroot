import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/users/[id]/prompts
 *
 * Returns user's saved prompts (personal_library) and generation history.
 * Supports: ?tab=prompts|history, ?limit=, ?offset=
 */
export const GET = withAdmin(async (
  req,
  supabase,
  _user,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const tab = req.nextUrl.searchParams.get('tab') || 'prompts';
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50') || 50, 200);
    const offset = Math.max(0, parseInt(req.nextUrl.searchParams.get('offset') || '0') || 0);

    if (tab === 'history') {
      // Fetch generation history — the actual prompts and AI outputs
      const { data, count, error: historyError } = await supabase
        .from('history')
        .select('id, prompt, enhanced_prompt, tone, category, capability_mode, title, source, created_at', { count: 'exact' })
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (historyError) {
        logger.error('[Admin User Prompts] history error:', historyError);
        return NextResponse.json({ error: 'Failed to load history' }, { status: 500 });
      }

      return NextResponse.json({
        tab: 'history',
        items: data ?? [],
        total: count ?? 0,
        limit,
        offset,
      });
    }

    // Default: fetch saved prompts from personal_library (with full prompt text)
    const { data, count, error: promptsError } = await supabase
      .from('personal_library')
      .select('id, title, prompt, use_count, created_at, updated_at', { count: 'exact' })
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (promptsError) {
      logger.error('[Admin User Prompts] prompts error:', promptsError);
      return NextResponse.json({ error: 'Failed to load prompts' }, { status: 500 });
    }

    return NextResponse.json({
      tab: 'prompts',
      items: data ?? [],
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (err) {
    logger.error('[Admin User Prompts] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
