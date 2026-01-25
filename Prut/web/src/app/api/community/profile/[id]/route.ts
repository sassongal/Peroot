
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/community/profile/[id]
 * 
 * Fetches public profile data for a specific Peroot architect
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: userId } = await params;
        const supabase = await createClient();

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        // Fetch basic profile and social stats
        const { data: profile, error } = await supabase
            .from('profiles')
            .select(`
                id,
                full_name,
                avatar_url,
                created_at,
                user_stats (
                    rank_title,
                    contribution_score,
                    total_copies,
                    total_saves_by_others
                )
            `)
            .eq('id', userId)
            .maybeSingle();

        if (error || !profile) {
            console.error('[Profile API] Error:', error);
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        // Flatten the response for the UI
        const stats = (profile as any).user_stats?.[0] || {};
        const formattedProfile = {
            id: profile.id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            created_at: profile.created_at,
            rank_title: stats.rank_title || 'מחולל מתחיל',
            contribution_score: stats.contribution_score || 0,
            total_copies: stats.total_copies || 0,
            total_saves_by_others: stats.total_saves_by_others || 0
        };

        return NextResponse.json(formattedProfile);

    } catch (err) {
        console.error('[Profile API] Critical Error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
