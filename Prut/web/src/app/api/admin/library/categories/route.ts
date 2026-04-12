
import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/api-middleware';
import { z } from 'zod';
import { logger } from '@/lib/logger';

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
export const GET = withAdmin(async (_req, supabase) => {
    try {
        const { data } = await supabase
            .from('library_categories')
            .select('*')
            .order('sort_order', { ascending: true });
        
        return NextResponse.json(data || []);
    } catch {
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
});

/**
 * POST /api/admin/library/categories
 * 
 * Create or update a category
 */
export const POST = withAdmin(async (req, supabase) => {
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
        logger.error('[Admin Category] Error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
});
