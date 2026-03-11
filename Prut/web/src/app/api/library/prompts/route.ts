
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CATEGORY_LABELS } from '@/lib/constants';
import { logger } from "@/lib/logger";

/**
 * GET /api/library/prompts
 * 
 * Fetches all active public library prompts
 */
export async function GET() {
    try {
        const supabase = await createClient();
        
        const { data, error } = await supabase
            .from('public_library_prompts')
            .select(`
                *,
                source:source_metadata
            `)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('[Public Library API] Error:', error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }
        
        // Map category_id to category for frontend compatibility
        // Normalize to match CATEGORY_LABELS keys (Supabase stores lowercase)
        const categoryKeyMap = Object.fromEntries(
            Object.keys(CATEGORY_LABELS).map(k => [k.toLowerCase(), k])
        );
        const mapped = (data || []).map(({ category_id, ...rest }) => ({
            ...rest,
            category: (category_id && categoryKeyMap[category_id.toLowerCase()]) || 'General',
        }));
        return NextResponse.json(mapped, {
            headers: {
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            },
        });
    } catch (err) {
        logger.error('[Public Library API] Critical Error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
