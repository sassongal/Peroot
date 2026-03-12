import { NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/admin/admin-security';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/is-admin
 *
 * Check if the current user has admin role
 */
export async function GET() {
  try {
    const { error, user } = await validateAdminSession();

    if (error) {
      return NextResponse.json({ isAdmin: false, error }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    return NextResponse.json({
      isAdmin: true,
      user: {
        id: user?.id,
        email: user?.email
      }
    });
  } catch (error) {
    logger.error("[admin/is-admin] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
