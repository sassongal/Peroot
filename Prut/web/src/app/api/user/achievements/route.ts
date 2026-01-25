
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/user/achievements
 * 
 * Fetches unlocked achievements for the current user
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data } = await supabase
            .from('user_achievements')
            .select('*')
            .eq('user_id', user.id);
        
        return NextResponse.json(data || []);
    } catch (err) {
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
