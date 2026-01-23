import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/admin/sync-users
 * 
 * Sync users - this now just refreshes the profiles data
 * Since Supabase automatically syncs auth.users to profiles via triggers,
 * we don't need admin API access
 */
export async function POST() {
  try {
    const supabase = await createClient();
    
    // Verify admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: isAdminData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!isAdminData) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all profiles (these are automatically synced from auth.users)
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Sync Users] Error fetching profiles:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return the synced count
    return NextResponse.json({
      success: true,
      synced: profiles?.length || 0,
      message: 'Users are automatically synced via Supabase triggers'
    });
  } catch (error) {
    console.error('[Sync Users] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

