
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/achievements
 * 
 * Fetches all available achievement definitions
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data } = await supabase
            .from('achievements')
            .select('*')
            .order('points', { ascending: true });
        
        return NextResponse.json(data || []);
    } catch (err) {
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
