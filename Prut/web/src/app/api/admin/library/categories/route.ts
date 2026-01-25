
import { NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/admin/admin-security';
import { z } from 'zod';

const CategorySchema = z.object({
    id: z.string(),
    name_en: z.string(),
    name_he: z.string(),
    icon: z.string().optional(),
    sort_order: z.number().default(0),
});

/**
 * GET /api/admin/library/categories
 * 
 * Lists all categories (Admin View)
 */
export async function GET() {
    const { error, supabase } = await validateAdminSession();
    if (error || !supabase) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

    try {
        const { data } = await supabase
            .from('library_categories')
            .select('*')
            .order('sort_order', { ascending: true });
        
        return NextResponse.json(data || []);
    } catch {
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

/**
 * POST /api/admin/library/categories
 * 
 * Create or update a category
 */
export async function POST(req: Request) {
    const { error, supabase, user } = await validateAdminSession();
    if (error || !supabase || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const parseResult = CategorySchema.safeParse(body);
        
        if (!parseResult.success) {
            return NextResponse.json({ error: 'Validation Error', details: parseResult.error.format() }, { status: 400 });
        }

        const { error: upsertError } = await supabase
            .from('library_categories')
            .upsert(parseResult.data);

        if (upsertError) throw upsertError;

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error('[Admin Category] Error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
