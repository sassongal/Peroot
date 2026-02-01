
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/library/categories
 * 
 * Fetches all available library categories for the public view
 */
export async function GET() {
    try {
        const supabase = await createClient();
        
        const { data, error } = await supabase
            .from('library_categories')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) {
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }
        
        return NextResponse.json(data || [], {
            headers: {
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
                'CDN-Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
                'Vercel-CDN-Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            }
        });
    } catch (err) {
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
