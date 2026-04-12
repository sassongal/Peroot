import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient, User } from "@supabase/supabase-js";
import { validateAdminSession } from "@/lib/admin/admin-security";
import { logger } from "@/lib/logger";

/**
 * API Middleware — Higher-order functions for admin route handlers.
 *
 * Eliminates the repetitive validateAdminSession() + error-response
 * boilerplate that every admin route duplicates.
 *
 * Usage:
 *   export const GET = withAdmin(async (req, supabase, user) => {
 *     // handler logic — already authenticated as admin
 *     return NextResponse.json({ ok: true });
 *   });
 */

export type AdminHandler<TContext = unknown> = (
  req: NextRequest,
  supabase: SupabaseClient,
  user: User,
  context: TContext
) => Promise<NextResponse>;

/**
 * Wraps an admin API handler with session validation and error handling.
 *
 * - Calls validateAdminSession() and returns 401/403 on failure.
 * - Catches unhandled errors and returns a generic 500 response.
 * - Passes the authenticated supabase client and user to the handler.
 * - Forwards the route context (e.g. { params }) as the fourth argument.
 */
export function withAdmin<TContext = unknown>(handler: AdminHandler<TContext>) {
  return async (req: NextRequest, context: TContext) => {
    try {
      const { error, supabase, user } = await validateAdminSession();

      if (error || !supabase || !user) {
        return NextResponse.json(
          { error: error || "Forbidden" },
          { status: error === "Unauthorized" ? 401 : 403 }
        );
      }

      return await handler(req, supabase, user, context);
    } catch (err) {
      logger.error("[withAdmin] Unhandled error:", err);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
