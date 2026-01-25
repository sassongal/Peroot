
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Admin Security Module
 * 
 * Standardized logic for:
 * 1. Admin Session Validation
 * 2. Zod Input Parsing
 * 3. Unified Audit Logging (Shelf)
 */

export async function validateAdminSession() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        return { error: 'Unauthorized', status: 401, user: null };
    }

    const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

    if (!roleData) {
        return { error: 'Forbidden', status: 403, user: null };
    }

    return { error: null, user, supabase };
}

export async function logAdminAction(
    user_id: string,
    action: string,
    details: Record<string, unknown> = {}
) {
    const supabase = await createClient();
    
    // Log to standard activity logs with admin flag
    await supabase.from('activity_logs').insert({
        user_id,
        action,
        entity_type: 'admin_action',
        details: {
            ...details,
            is_admin: true,
            timestamp: new Date().toISOString()
        }
    });

    // Console track for production visibility
    console.log(`[ADMIN ACTION] ${user_id}: ${action}`, details);
}

/**
 * Standard utility to parse body and handle zod errors
 */
export async function parseAdminInput<T>(req: Request, schema: z.ZodSchema<T>) {
    try {
        const body = await req.json();
        return { data: schema.parse(body), error: null };
    } catch (err: unknown) {
        if (err instanceof z.ZodError) {
            return { data: null, error: NextResponse.json({ error: 'Validation Error', details: err.issues }, { status: 400 }) };
        }
        return { data: null, error: NextResponse.json({ error: 'Invalid Request Body' }, { status: 400 }) };
    }
}
