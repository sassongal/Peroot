
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
            console.error('[Public Library API] Error:', error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }
        
        return NextResponse.json(data || []);
    } catch (err) {
        console.error('[Public Library API] Critical Error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
