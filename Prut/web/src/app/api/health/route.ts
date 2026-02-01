import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    const start = Date.now();
    let dbStatus = 'unknown';
    
    try {
        const supabase = await createClient();
        const { error } = await supabase.from('personal_library').select('id').limit(1);
        if (error) throw error;
        dbStatus = 'healthy';
    } catch (e) {
        dbStatus = 'unhealthy';
        console.error('Health Check DB Error:', e);
    }

    return NextResponse.json({
        status: dbStatus === 'healthy' ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        latency: Date.now() - start,
        services: {
            database: dbStatus,
            web: 'healthy'
        }
    }, { status: dbStatus === 'healthy' ? 200 : 503 });
}
