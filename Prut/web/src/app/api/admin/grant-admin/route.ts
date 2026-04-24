import { NextResponse } from 'next/server';
import { logAdminAction } from '@/lib/admin/admin-security';
import { withAdminWrite } from "@/lib/api-middleware";
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/grant-admin
 *
 * Secure endpoint to grant admin role.
 * Note: Only an existing admin can grant admin to themselves or others.
 * For initial setup, use the SQL editor.
 */
export const POST = withAdminWrite(async (_req, supabase, user) => {
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
    logger.error('[Grant Admin] Error:', dbError);
    return NextResponse.json({ error: 'Failed to grant admin role' }, { status: 500 });
  }

  await logAdminAction(user.id, 'Self-Verify Admin', { email: user.email });

  return NextResponse.json({
    success: true,
    message: 'Admin role verified',
    email: user.email,
    data
  });
});
