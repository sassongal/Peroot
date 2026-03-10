import { NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/admin/admin-security';

/**
 * GET /api/admin/stats
 * 
 * Get comprehensive admin statistics
 */
export async function GET() {
  try {
    const { error, user, supabase } = await validateAdminSession();
    if (error || !user || !supabase) {
        return NextResponse.json({ error: error || 'Forbidden' }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    const [
      { count: totalUsers },
      { count: totalPrompts },
      { count: todayPrompts },
      { count: totalActivity },
      { count: totalStyles }
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('personal_library').select('*', { count: 'exact', head: true }),
      supabase.from('personal_library')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      supabase.from('activity_logs').select('*', { count: 'exact', head: true }),
      supabase.from('user_style_personality').select('*', { count: 'exact', head: true })
    ]);

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      totalPrompts: totalPrompts || 0,
      todayPrompts: todayPrompts || 0,
      totalActivity: totalActivity || 0,
      totalStyles: totalStyles || 0,
      timestamp: new Date().toISOString()
});
  } catch (error) {
    console.error('[Admin Stats] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
