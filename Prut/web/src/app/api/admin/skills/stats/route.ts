import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/admin/admin-security';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/skills/stats
 *
 * Returns aggregate stats over the persistent `skill_selections` table.
 * Replaces the previous reliance on the in-memory ring buffer (which
 * resets on every Vercel cold start).
 *
 * Query params:
 *   days  optional, default 7 — sliding window in days
 */

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
        const daysRaw = parseInt(searchParams.get('days') || '7', 10);
        const days = Math.max(1, Math.min(90, isNaN(daysRaw) ? 7 : daysRaw));
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        // One bounded query — at the volume Peroot operates at, this is
        // measurable in milliseconds. If usage explodes (>100k rows/week)
        // we can move to a dedicated SQL aggregation function.
        const { data, error: qErr } = await supabase
            .from('skill_selections')
            .select('type, platform, categories')
            .gte('created_at', cutoff)
            .limit(10000);

        if (qErr) {
            logger.warn('[admin/skills/stats] query failed:', qErr.message);
            return NextResponse.json({ error: 'Query failed' }, { status: 500 });
        }

        const byType: Record<string, number> = {};
        const platformCounts: Record<string, number> = {};
        const categoryCounts: Record<string, number> = {};

        for (const row of data ?? []) {
            const r = row as { type: string; platform: string; categories: string[] | null };
            byType[r.type] = (byType[r.type] ?? 0) + 1;
            platformCounts[r.platform] = (platformCounts[r.platform] ?? 0) + 1;
            for (const cat of r.categories ?? []) {
                if (!cat) continue;
                categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
            }
        }

        const topPlatforms = Object.entries(platformCounts)
            .map(([platform, count]) => ({ platform, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);

        const topCategories = Object.entries(categoryCounts)
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);

        return NextResponse.json({
            totalSelections: (data ?? []).length,
            byType,
            topPlatforms,
            topCategories,
            windowDays: days,
        });
    } catch (err) {
        logger.error('[admin/skills/stats] unexpected error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
