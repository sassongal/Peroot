import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/admin/admin-security';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/webhooks
 *
 * Returns the most recent webhook_events rows for admin debugging.
 * Surfaces processed/failed status + processing_error so admins can spot
 * payment integration issues without digging into Supabase.
 *
 * Until this endpoint shipped, webhook_events was an internal-only table
 * with no UI — meaning failed LemonSqueezy webhooks were invisible.
 *
 * Query params:
 *   limit  default 100, max 500
 *   status optional 'processed' | 'failed' | 'all' (default 'all')
 */

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 100;

export async function GET(req: NextRequest) {
    try {
        const { error, user, supabase } = await validateAdminSession();
        if (error || !user || !supabase) {
            return NextResponse.json(
                { error: error || 'Forbidden' },
                { status: error === 'Unauthorized' ? 401 : 403 }
            );
        }

        const { searchParams } = new URL(req.url);
        const limitRaw = parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10);
        const limit = Math.min(MAX_LIMIT, Math.max(1, isNaN(limitRaw) ? DEFAULT_LIMIT : limitRaw));
        const status = searchParams.get('status') || 'all';

        let query = supabase
            .from('webhook_events')
            .select('id, event_name, processed, processing_error, created_at')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (status === 'processed') {
            query = query.eq('processed', true);
        } else if (status === 'failed') {
            // "Failed" = either processed=false OR has a processing_error
            query = query.or('processed.eq.false,processing_error.not.is.null');
        }

        const { data, error: qErr } = await query;
        if (qErr) {
            logger.warn('[admin/webhooks] query failed:', qErr.message);
            return NextResponse.json({ error: 'Query failed' }, { status: 500 });
        }

        return NextResponse.json({
            events: data ?? [],
            limit,
            status,
        });
    } catch (err) {
        logger.error('[admin/webhooks] unexpected error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
