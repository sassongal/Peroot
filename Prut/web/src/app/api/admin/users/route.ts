import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import { escapePostgrestValue } from "@/lib/sanitize";

/**
 * GET /api/admin/users
 *
 * Returns merged user list (profiles + roles + subscriptions).
 * Supports optional ?search= query param for server-side filtering.
 */
export const GET = withAdmin(async (req, supabase) => {
  const searchTerm = req.nextUrl.searchParams.get("search") || "";
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "100") || 100, 500);
  const offset = Math.max(0, parseInt(req.nextUrl.searchParams.get("offset") || "0") || 0);

  // Build profiles query with optional server-side search and pagination
  let profilesQuery = supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (searchTerm.trim()) {
    const escaped = escapePostgrestValue(searchTerm);
    profilesQuery = profilesQuery.or(
      `email.ilike.%${escaped}%,full_name.ilike.%${escaped}%,id.eq.${escaped}`
    );
  }

  // Profiles + roles + subscriptions in parallel
  const [
    { data: profiles, count: totalCount, error: profileError },
    { data: roles, error: roleError },
    { data: subscriptions, error: subError },
  ] = await Promise.all([
    profilesQuery,
    supabase.from("user_roles").select("user_id, role").limit(1000),
    supabase
      .from("subscriptions")
      .select("user_id, plan_name, status, customer_name")
      .limit(1000),
  ]);

  if (profileError) {
    logger.error("[admin/users] profiles error:", profileError);
    return NextResponse.json(
      { error: "Failed to load profiles" },
      { status: 500 }
    );
  }
  if (roleError) {
    logger.error("[admin/users] roles error:", roleError);
  }
  if (subError) {
    logger.warn("[admin/users] subscriptions warning:", subError);
  }

  const users = (profiles ?? []).map((p) => {
    const sub = (subscriptions ?? []).find(
      (s: { user_id: string }) => s.user_id === p.id
    );
    return {
      ...p,
      role:
        (roles ?? []).find(
          (r: { user_id: string; role: string }) => r.user_id === p.id
        )?.role ?? "user",
      plan_tier: sub?.plan_name ?? p.plan_tier ?? "free",
      customer_name: sub?.customer_name ?? null,
    };
  });

  return NextResponse.json(users, {
    headers: {
      'X-Total-Count': String(totalCount ?? 0),
    },
  });
});
