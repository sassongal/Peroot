import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import { escapePostgrestValue } from "@/lib/sanitize";

/**
 * GET /api/admin/prompts-feed
 *
 * Global feed of user prompts: what the user typed (prompt) and what the system
 * generated (enhanced_prompt), across all users. Used by the admin Prompts tab.
 *
 * Query params:
 *   limit  — items per page (default 50, max 200)
 *   offset — pagination offset (default 0)
 *   search — ILIKE over prompt + enhanced_prompt + title
 *   mode   — filter by capability_mode (standard|image|research|agent|video)
 *   from   — ISO date filter: created_at >= from
 *   to     — ISO date filter: created_at <= to
 *   user   — filter by user_id (exact)
 */
export const GET = withAdmin(async (req, supabase) => {
  try {
    const sp = req.nextUrl.searchParams;
    const limit = Math.min(parseInt(sp.get("limit") || "50") || 50, 200);
    const offset = Math.max(0, parseInt(sp.get("offset") || "0") || 0);
    const search = (sp.get("search") || "").trim();
    const mode = sp.get("mode");
    const from = sp.get("from");
    const to = sp.get("to");
    const userId = sp.get("user");

    let query = supabase
      .from("history")
      .select(
        "id, user_id, prompt, enhanced_prompt, title, tone, category, capability_mode, source, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      const esc = escapePostgrestValue(search);
      query = query.or(
        `prompt.ilike.%${esc}%,enhanced_prompt.ilike.%${esc}%,title.ilike.%${esc}%`,
      );
    }
    if (mode) query = query.eq("capability_mode", mode);
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);
    if (userId && /^[0-9a-f-]{36}$/i.test(userId)) {
      query = query.eq("user_id", userId);
    }

    const { data, count, error } = await query;
    if (error) {
      logger.error("[admin/prompts-feed] history error:", error);
      return NextResponse.json({ error: "Failed to load feed" }, { status: 500 });
    }

    // Enrich with user email for display
    const userIds = Array.from(
      new Set((data ?? []).map((r) => (r as { user_id: string }).user_id).filter(Boolean)),
    );
    let emailByUser = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);
      for (const p of profiles ?? []) {
        const rec = p as { id: string; email: string; full_name?: string | null };
        emailByUser.set(rec.id, rec.full_name || rec.email);
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
      return { ...row, user_display: emailByUser.get(row.user_id) ?? row.user_id };
    });

    return NextResponse.json({
      items,
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (err) {
    logger.error("[admin/prompts-feed] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
