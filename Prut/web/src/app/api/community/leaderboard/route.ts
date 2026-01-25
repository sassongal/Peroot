
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/community/leaderboard
 * 
 * Fetches the global leaderboard of Peroot architects
 */
export async function GET() {
    try {
        const supabase = await createClient();
        
        // Fetch top 50 architects from the global view
        const { data, error } = await supabase
            .from('global_leaderboard')
            .select('*')
            .limit(50);

        if (error) {
            console.error('[Leaderboard API] Error:', error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }
        
        return NextResponse.json(data || []);
    } catch (err) {
        console.error('[Leaderboard API] Critical Error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
