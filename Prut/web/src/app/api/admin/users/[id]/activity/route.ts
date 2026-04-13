import { NextRequest, NextResponse } from 'next/server';
import { withAdmin } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/users/[id]/activity
 *
 * Paginated activity log for a single user.
 * Query params:
 *   limit  — items per page (default 50, max 200)
 *   offset — pagination offset (default 0)
 *   from   — ISO date filter: created_at >= from
 *   to     — ISO date filter: created_at <= to
 */
export const GET = withAdmin(async (
  req: NextRequest,
  supabase,
  _user,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
    }

    const { searchParams } = req.nextUrl;
    const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200);
    const offset = Math.max(Number(searchParams.get('offset') ?? 0), 0);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = supabase
      .from('activity_logs')
      .select('id, action, entity_type, details, created_at', { count: 'exact' })
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (from) query = query.gte('created_at', from);
    if (to)   query = query.lte('created_at', to);

    const { data, count, error } = await query;

    if (error) {
      logger.error('[Admin User Activity GET] DB error:', error);
      return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
    }

    return NextResponse.json({
      logs: data ?? [],
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (err) {
    logger.error('[Admin User Activity GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
