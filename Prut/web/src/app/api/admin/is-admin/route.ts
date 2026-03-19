import { NextResponse } from 'next/server';
import { withAdmin } from '@/lib/api-middleware';

/**
 * GET /api/admin/is-admin
 *
 * Check if the current user has admin role
 */
export const GET = withAdmin(async (_req, _supabase, user) => {
  return NextResponse.json({
    isAdmin: true,
    user: {
      id: user.id,
      email: user.email
    }
  });
});
