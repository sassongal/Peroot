import { NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/admin/admin-security';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/costs/coverage
 *
 * Returns a list of known LLM-calling endpoints and the last time each one
 * logged a row to api_usage_logs. The CostsTab uses this to surface an
 * "untracked endpoints" warning — if an endpoint we *expect* to see in the
 * logs has gone quiet for 24h, it's probably missing a trackApiUsage call
 * (or nobody is using that feature).
 *
 * Known endpoints are hardcoded because the only authoritative source is
 * the actual call sites in the code — a route that never fires never shows
 * up in the logs, so we can't discover them from the DB alone.
 */

// Update this list when a new LLM-calling route is added. The dashboard will
// show a warning until the first real log row arrives.
const KNOWN_LLM_ENDPOINTS = [
    'enhance',
    'chain',
    'suggest-category',
    'test-engine',
] as const;

export async function GET() {
    try {
        const { error, user, supabase } = await validateAdminSession();
        if (error || !user || !supabase) {
            return NextResponse.json(
                { error: error || 'Forbidden' },
                { status: error === 'Unauthorized' ? 401 : 403 }
            );
        }

        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // For each known endpoint, grab the most recent row in the last 24h.
        // We do one query per endpoint rather than a single grouped query so
        // endpoints with zero rows are still represented in the result.
        const results = await Promise.all(
            KNOWN_LLM_ENDPOINTS.map(async (endpoint) => {
                const { data, error: qErr } = await supabase
                    .from('api_usage_logs')
                    .select('created_at')
                    .eq('endpoint', endpoint)
                    .gte('created_at', cutoff)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (qErr) {
                    logger.warn(`[costs/coverage] query failed for ${endpoint}:`, qErr.message);
                    return { endpoint, lastSeen: null, error: qErr.message };
                }

                return {
                    endpoint,
                    lastSeen: data?.created_at ?? null,
                };
            })
        );

        const untracked = results.filter(r => r.lastSeen === null).map(r => r.endpoint);

        // Cache hit stats for the same 24h window. Delegated to the
        // get_cache_stats(since_ts) Postgres function so aggregation runs
        // on the DB side (the previous client-side loop OOMed at scale).
        const { data: statsRows, error: statsErr } = await supabase
            .rpc('get_cache_stats', { since_ts: cutoff });

        let totalRequests = 0;
        let cacheHits = 0;
        let tokensSavedInput = 0;
        let tokensSavedOutput = 0;

        if (statsErr) {
            logger.warn('[costs/coverage] get_cache_stats rpc failed:', statsErr.message);
        } else if (Array.isArray(statsRows) && statsRows.length > 0) {
            const row = statsRows[0] as {
                total_requests: number | string;
                cache_hits: number | string;
                avg_input_tokens: number | string;
                avg_output_tokens: number | string;
            };
            totalRequests = Number(row.total_requests) || 0;
            cacheHits = Number(row.cache_hits) || 0;
            const avgIn = Number(row.avg_input_tokens) || 0;
            const avgOut = Number(row.avg_output_tokens) || 0;
            // "Tokens saved" is an estimate: assume a cache-hit request
            // would have consumed the average tokens of a non-cache-hit
            // request in the same window. Rough but useful as a trend.
            if (cacheHits > 0) {
                tokensSavedInput = Math.round(avgIn * cacheHits);
                tokensSavedOutput = Math.round(avgOut * cacheHits);
            }
        }

        return NextResponse.json({
            endpoints: results,
            untracked,
            windowHours: 24,
            cacheStats: {
                totalRequests,
                cacheHits,
                hitRate: totalRequests > 0 ? cacheHits / totalRequests : 0,
                tokensSavedInput,
                tokensSavedOutput,
            },
        });
    } catch (err) {
        logger.error('[costs/coverage] unexpected error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
