import { NextResponse } from 'next/server';
import { withAdminWrite } from "@/lib/api-middleware";
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/sync-users
 * 
 * Sync users - this now just refreshes the profiles data
 * Since Supabase automatically syncs auth.users to profiles via triggers,
 * we don't need admin API access
 */
export const POST = withAdminWrite(async (_req, supabase, _user) => {
    // Count profiles (automatically synced from auth.users via triggers)
    const { count, error: dbError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    if (dbError) {
      logger.error('[Sync Users] Error fetching profiles:', dbError);
      return NextResponse.json({ error: "Database operation failed" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      synced: count || 0,
      message: 'Users are automatically synced via Supabase triggers'
    });
});

