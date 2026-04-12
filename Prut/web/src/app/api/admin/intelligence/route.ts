
import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/api-middleware';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/intelligence
 * 
 * Aggregates user style data and intelligence metrics for admin view
 */
export const GET = withAdmin(async (_req, supabase) => {
    try {
        // 1. Fetch all style tokens to calculate popularity
        const { data: personalities } = await supabase
            .from('user_style_personality')
            .select('style_tokens');
        
        const tokenMap: Record<string, number> = {};
        personalities?.forEach(p => {
            p.style_tokens?.forEach((t: string) => {
                tokenMap[t] = (tokenMap[t] || 0) + 1;
            });
        });

        const topTokens = Object.entries(tokenMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([token, count]) => ({ token, count }));

        // 2. Fetch recent intelligence activity
        const { data: recentAnalytics } = await supabase
            .from('activity_logs')
            .select('details, created_at')
            .in('action', ['Prmpt Enhance', 'Prmpt Refine'])
            .order('created_at', { ascending: false })
            .limit(100);

        // 3. Aggregate latency and token usage
        let totalLatency = 0;
        let totalTokens = 0;
        let count = 0;

        recentAnalytics?.forEach(log => {
            const details = log.details as { latency_ms?: number; tokens?: { totalTokens: number } };
            if (details?.latency_ms) {
                totalLatency += details.latency_ms;
                totalTokens += details.tokens?.totalTokens || 0;
                count++;
            }
        });

        return NextResponse.json({
            topTokens,
            metrics: {
                avgLatency: count > 0 ? Math.round(totalLatency / count) : 0,
                avgTokens: count > 0 ? Math.round(totalTokens / count) : 0,
                sampleSize: count
            },
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        logger.error('[Admin Intelligence] Error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
});
