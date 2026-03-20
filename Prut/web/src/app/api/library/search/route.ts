import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

/**
 * GET /api/library/search?q=searchterm&limit=20
 *
 * Full-text search across public library prompts.
 * Searches title, use_case, and prompt columns using ILIKE.
 * Only returns active prompts.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const query = searchParams.get('q')?.trim() ?? '';
    const limitParam = parseInt(searchParams.get('limit') ?? '', 10);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), MAX_LIMIT)
      : DEFAULT_LIMIT;

    // Empty query returns empty results immediately
    if (!query) {
      return NextResponse.json([]);
    }

    const supabase = await createClient();
    const pattern = `%${query}%`;

    const { data, error } = await supabase
      .from('public_library_prompts')
      .select('id, title, category_id, use_case, variables, capability_mode')
      .eq('is_active', true)
      .or(`title.ilike.${pattern},use_case.ilike.${pattern},prompt.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('[Library Search API] Database error:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    return NextResponse.json(data ?? [], {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=120',
      },
    });
  } catch (err) {
    logger.error('[Library Search API] Critical error:', err);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}
