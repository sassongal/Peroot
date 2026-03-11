import { NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/admin/admin-security';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/sync-users
 * 
 * Sync users - this now just refreshes the profiles data
 * Since Supabase automatically syncs auth.users to profiles via triggers,
 * we don't need admin API access
 */
export async function POST() {
  try {
    const { error, user, supabase } = await validateAdminSession();
    if (error || !user || !supabase) {
        return NextResponse.json({ error: error || 'Forbidden' }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    // Count profiles (automatically synced from auth.users via triggers)
    const { count, error: dbError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    if (dbError) {
      logger.error('[Sync Users] Error fetching profiles:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      synced: count || 0,
      message: 'Users are automatically synced via Supabase triggers'
    });
  } catch (error) {
    logger.error('[Sync Users] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

