import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/api-middleware';

/**
 * GET /api/admin/stats
 *
 * Get comprehensive admin statistics
 */
export const GET = withAdmin(async (_req, supabase) => {
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
});
