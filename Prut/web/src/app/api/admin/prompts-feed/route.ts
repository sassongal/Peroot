import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-middleware";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
import { escapePostgrestValue } from "@/lib/sanitize";

/**
 * GET /api/admin/prompts-feed
 *
 * Global feed of user prompts: input (`prompt`) and system output
 * (`enhanced_prompt`) across ALL non-admin users.
 *
 * Uses the service client so RLS does not scope rows to the requesting admin.
 *
 * Query params:
 *   limit         — items per page (default 50, max 200)
 *   offset        — pagination offset
 *   search        — ILIKE over prompt + enhanced_prompt + title
 *   mode          — capability_mode filter
 *   from / to     — ISO date range on created_at
 *   user          — specific user_id
 *   includeAdmins — "1" to include admin-authored rows (default: exclude)
 */
export const GET = withAdmin(async (req) => {
  try {
    const svc = createServiceClient();
    const sp = req.nextUrl.searchParams;
    const rawLimit = parseInt(sp.get("limit") || "50", 10);
    const limit = Math.min(Number.isNaN(rawLimit) || rawLimit < 1 ? 50 : rawLimit, 200);
    const rawOffset = parseInt(sp.get("offset") || "0", 10);
    const offset = Math.max(0, Number.isNaN(rawOffset) ? 0 : rawOffset);
    const search = (sp.get("search") || "").trim();
    const mode = sp.get("mode");
    const from = sp.get("from");
    const to = sp.get("to");
    const userId = sp.get("user");
    const includeAdmins = sp.get("includeAdmins") === "1";

    // Resolve admin user IDs so we can exclude them by default
    let adminIds: string[] = [];
    if (!includeAdmins) {
      const { data: adminRoleRows, error: rolesErr } = await svc
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      if (rolesErr) {
        logger.warn("[admin/prompts-feed] roles query warning:", rolesErr);
      } else {
        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        adminIds = (adminRoleRows ?? [])
          .map((r) => (r as { user_id: string }).user_id)
          .filter((v): v is string => typeof v === "string" && uuidRe.test(v));
      }
    }

    let query = svc
      .from("history")
      .select(
        "id, user_id, prompt, enhanced_prompt, title, tone, category, capability_mode, source, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      const esc = escapePostgrestValue(search);
      query = query.or(`prompt.ilike.%${esc}%,enhanced_prompt.ilike.%${esc}%,title.ilike.%${esc}%`);
    }
    if (mode) query = query.eq("capability_mode", mode);
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);
    if (userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      query = query.eq("user_id", userId);
    } else if (!includeAdmins && adminIds.length > 0) {
      // PostgREST `in` syntax: (uuid1,uuid2,...)
      query = query.not("user_id", "in", `(${adminIds.join(",")})`);
    }

    const { data, count, error } = await query;
    if (error) {
      logger.error("[admin/prompts-feed] history error:", error);
      return NextResponse.json({ error: "Failed to load feed" }, { status: 500 });
    }

    // Enrich with user email / name
    const resultUserIds = Array.from(
      new Set((data ?? []).map((r) => (r as { user_id: string }).user_id).filter(Boolean)),
    );
    const displayByUser = new Map<string, { label: string; email: string | null }>();
    if (resultUserIds.length > 0) {
      const { data: profiles } = await svc
        .from("profiles")
        .select("id, email, full_name")
        .in("id", resultUserIds);
      for (const p of profiles ?? []) {
        const rec = p as { id: string; email: string | null; full_name?: string | null };
        displayByUser.set(rec.id, {
          label: rec.full_name || rec.email || rec.id,
          email: rec.email ?? null,
        });
      }
    }

    const items = (data ?? []).map((r) => {
      const row = r as {
        id: string;
        user_id: string;
        prompt: string;
        enhanced_prompt: string | null;
        title: string | null;
        tone: string | null;
        category: string | null;
        capability_mode: string | null;
        source: string | null;
        created_at: string;
      };
      const d = displayByUser.get(row.user_id);
      return {
        ...row,
        user_display: d?.label ?? row.user_id,
        user_email: d?.email ?? null,
      };
    });

    return NextResponse.json({
      items,
      total: count ?? 0,
      limit,
      offset,
      excludedAdmins: includeAdmins ? 0 : adminIds.length,
    });
  } catch (err) {
    logger.error("[admin/prompts-feed] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
