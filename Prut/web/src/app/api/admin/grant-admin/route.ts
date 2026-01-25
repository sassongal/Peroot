import { NextResponse } from 'next/server';
import { validateAdminSession, logAdminAction } from '@/lib/admin/admin-security';

/**
 * GET /api/admin/grant-admin
 * 
 * Secure endpoint to grant admin role.
 * Note: Only an existing admin can grant admin to themselves or others.
 * For initial setup, use the SQL editor.
 */
export async function GET() {
  try {
    // 1. Validate Session (Only admins can grant admin roles)
    const { error, user, supabase } = await validateAdminSession();
    if (error || !user || !supabase) {
        return NextResponse.json({ error: error || 'Forbidden' }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    // 2. Grant admin role (Self-grant if already admin, essentially a refresh/verify)
    const { data, error: dbError } = await supabase
      .from('user_roles')
      .upsert({ 
        user_id: user.id, 
        role: 'admin',
        granted_by: user.id
      }, {
        onConflict: 'user_id,role'
      })
      .select()
      .single();

    if (dbError) {
      console.error('[Grant Admin] Error:', dbError);
      return NextResponse.json({ error: 'Failed to grant admin role' }, { status: 500 });
    }

    // 3. Audit Log
    await logAdminAction(user.id, 'Self-Verify Admin', { email: user.email });

    return NextResponse.json({ 
      success: true,
      message: 'Admin role verified',
      email: user.email,
      data
    });
  } catch (error) {
    console.error('[Grant Admin] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
