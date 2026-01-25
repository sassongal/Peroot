
import { NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/admin/admin-security';
import { z } from 'zod';

const PromptSchema = z.object({
    id: z.string(),
    title: z.string(),
    category: z.string(),
    use_case: z.string().optional(),
    prompt: z.string(),
    variables: z.array(z.string()).default([]),
    output_format: z.string().optional(),
    quality_checks: z.array(z.string()).default([]),
    capability_mode: z.enum(['STANDARD', 'DEEP_RESEARCH', 'IMAGE_GENERATION', 'AGENT_BUILDER']).default('STANDARD'),
    source: z.object({
        name: z.string(),
        url: z.string().optional(),
        license: z.string().optional(),
        license_url: z.string().optional(),
        restricted: z.boolean().default(false),
        reference: z.string().optional(),
    }).optional(),
});

const BatchImportSchema = z.array(PromptSchema);

/**
 * POST /api/admin/library/batch
 * 
 * Batch import/update public library prompts
 */
export async function POST(req: Request) {
    const { error, supabase, user } = await validateAdminSession();
    if (error || !supabase || !user) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const parseResult = BatchImportSchema.safeParse(body);
        
        if (!parseResult.success) {
            return NextResponse.json({ 
                error: 'Validation Error', 
                details: parseResult.error.format() 
            }, { status: 400 });
        }

        const prompts = parseResult.data;
        const total = prompts.length;
        
        // 1. Map and Prepare data
        const rows = prompts.map(p => ({
            id: p.id,
            title: p.title,
            category_id: p.category.toLowerCase(), // Simplistic mapping, assume category IDs are lowercase names
            use_case: p.use_case,
            prompt: p.prompt,
            variables: p.variables,
            output_format: p.output_format,
            quality_checks: p.quality_checks,
            capability_mode: p.capability_mode,
            source_metadata: p.source || {},
            updated_at: new Date().toISOString()
        }));

        // 2. Perform Upsert
        const { error: upsertError } = await supabase
            .from('public_library_prompts')
            .upsert(rows, { onConflict: 'id' });

        if (upsertError) {
            console.error('[Batch Import] Upsert Error:', upsertError);
            return NextResponse.json({ error: upsertError.message }, { status: 500 });
        }

        // 3. Log Admin Action
        await supabase.from('activity_logs').insert({
            user_id: user.id,
            action: 'Library Batch Import',
            entity_type: 'admin_action',
            details: { count: total, timestamp: new Date().toISOString() }
        });

        return NextResponse.json({ 
            success: true, 
            count: total,
            message: `Successfully processed ${total} prompts.` 
        });

    } catch (err) {
        console.error('[Batch Import] Critical Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
