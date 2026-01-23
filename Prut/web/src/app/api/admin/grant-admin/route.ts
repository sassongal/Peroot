import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/grant-admin
 * 
 * Grant admin role to current user (for initial setup only)
 * In production, remove this endpoint after initial admin is set
 */
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        message: 'Please sign in first' 
      }, { status: 401 });
    }

    // Grant admin role
    const { data, error } = await supabase
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

    if (error) {
      console.error('[Grant Admin] Error:', error);
      return NextResponse.json({ 
        error: 'Failed to grant admin role',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Admin role granted successfully',
      userId: user.id,
      email: user.email,
      data
    });
  } catch (error) {
    console.error('[Grant Admin] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
