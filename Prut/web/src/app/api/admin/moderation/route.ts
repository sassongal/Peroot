import { NextResponse } from "next/server";
import { withAdmin, withAdminWrite } from "@/lib/api-middleware";
import { createServiceClient } from "@/lib/supabase/service";
import { logAdminAction } from "@/lib/admin/admin-security";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/moderation
 *
 * Query params:
 *   page       page number (default 1)
 *   limit      items per page (default 20)
 *   filter     all | flagged | approved | pending (default all)
 *   search     search string for prompt_text
 *
 * Returns paginated public prompts and summary stats.
 *
 * POST /api/admin/moderation
 *
 * Body: { action: 'approve' | 'remove' | 'flag', prompt_id: string }
 *
 * Moderation state is tracked via activity_logs (action='moderation_review').
 * "Remove" additionally sets is_public=false on personal_library.
 * We derive the effective status of each prompt from the most recent
 * moderation_review log for that prompt_id.
 */

// ─── GET ─────────────────────────────────────────────────────────────────────

export const GET = withAdmin(async (req) => {
  const supabase = createServiceClient();
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const filter = searchParams.get("filter") ?? "all";
  const search = (searchParams.get("search") ?? "").trim();
  const offset = (page - 1) * limit;

  // ── 1. Fetch all public prompts (with author info) ──────────────────────
  let promptsQuery = supabase
    .from("personal_library")
    .select("id, user_id, created_at, personal_category, prompt_text, is_public", {
      count: "exact",
    })
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (search) {
    // Escape special LIKE characters to prevent wildcard DOS
    const escaped = search.replace(/[%_\\]/g, "\\$&");
    promptsQuery = promptsQuery.ilike("prompt_text", `%${escaped}%`);
  }

  const { data: allPublicPrompts, error: promptsError } = await promptsQuery;

  if (promptsError) {
    logger.error("[Admin Moderation] Prompts query error:", promptsError);
    return NextResponse.json({ error: "Failed to fetch prompts" }, { status: 500 });
  }

  const publicPrompts = allPublicPrompts ?? [];

  // ── 2. Fetch recent moderation activity logs ───────────────────────────
  // Scan only the last 180 days with a hard cap. Without the bound this
  // query grew unbounded with activity_logs and dominated the page's TTFB.
  const MOD_LOG_CAP = 5000;
  const MOD_WINDOW_DAYS = 180;
  const modWindowStart = new Date(Date.now() - MOD_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: removedLogs } = await supabase
    .from("activity_logs")
    .select("details, created_at")
    .eq("action", "moderation_review")
    .eq("entity_type", "admin_action")
    .gte("created_at", modWindowStart)
    .order("created_at", { ascending: false })
    .limit(MOD_LOG_CAP);

  // Build a map: prompt_id -> latest moderation status
  const statusMap = new Map<string, { status: string; reviewed_at: string }>();
  for (const log of removedLogs ?? []) {
    const details = (log.details ?? {}) as Record<string, unknown>;
    const pid = details.prompt_id as string | undefined;
    const status = details.status as string | undefined;
    if (pid && status && !statusMap.has(pid)) {
      statusMap.set(pid, { status, reviewed_at: log.created_at });
    }
  }

  // ── 3. Enrich prompts with moderation status ───────────────────────────
  type EnrichedPrompt = {
    id: string;
    user_id: string;
    created_at: string;
    personal_category: string | null;
    prompt_text: string;
    is_public: boolean;
    moderation_status: string;
    reviewed_at: string | null;
  };

  let enriched: EnrichedPrompt[] = publicPrompts.map((p) => {
    const mod = statusMap.get(p.id);
    return {
      ...p,
      moderation_status: mod?.status ?? "pending",
      reviewed_at: mod?.reviewed_at ?? null,
    };
  });

  // ── 4. Apply filter ────────────────────────────────────────────────────
  if (filter === "flagged") {
    enriched = enriched.filter((p) => p.moderation_status === "flagged");
  } else if (filter === "approved") {
    enriched = enriched.filter((p) => p.moderation_status === "approved");
  } else if (filter === "pending") {
    enriched = enriched.filter((p) => p.moderation_status === "pending");
  }
  // 'removed' is not filterable here: removed prompts have is_public=false and are
  // excluded from publicPrompts above, so they never appear in this view.
  // 'all' passes everything through

  const totalFiltered = enriched.length;
  const paginated = enriched.slice(offset, offset + limit);

  // ── 5. Summary stats ────────────────────────────────────────────────────
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const totalPublic = publicPrompts.length;
  const flaggedCount = Array.from(statusMap.values()).filter((v) => v.status === "flagged").length;

  const reviewedToday = (removedLogs ?? []).filter((l) => {
    return new Date(l.created_at) >= todayStart;
  }).length;

  const { count: removedThisMonth } = await supabase
    .from("activity_logs")
    .select("id", { count: "exact", head: true })
    .eq("action", "moderation_review")
    .eq("entity_type", "admin_action")
    .gte("created_at", monthStart.toISOString())
    .contains("details", { status: "removed" });

  // Enrich author display names
  const authorIds = [...new Set(paginated.map((p) => p.user_id))];
  const authorMap: Record<string, string> = {};
  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, email")
      .in("id", authorIds);
    for (const p of profiles ?? []) {
      authorMap[p.id] = p.display_name || p.email || p.id.slice(0, 8);
    }
  }

  const promptsWithAuthor = paginated.map((p) => ({
    ...p,
    author_display: authorMap[p.user_id] ?? p.user_id.slice(0, 12) + "...",
  }));

  return NextResponse.json({
    prompts: promptsWithAuthor,
    pagination: {
      page,
      limit,
      total: totalFiltered,
      totalPages: Math.ceil(totalFiltered / limit),
    },
    stats: {
      totalPublic,
      reviewedToday,
      flagged: flaggedCount,
      removedThisMonth: removedThisMonth ?? 0,
    },
  });
});

// ─── POST ────────────────────────────────────────────────────────────────────

export const POST = withAdminWrite(async (req, _ssrClient, user) => {
  // Moderation writes to rows owned by OTHER users (personal_library RLS
  // blocks cross-user updates), so we must use the service client to
  // bypass RLS. The withAdmin HOF already verified caller is admin.
  const supabase = createServiceClient();

  const body = await req.json();
  const { action, prompt_id } = body as { action: string; prompt_id: string };

  if (!action || !prompt_id) {
    return NextResponse.json({ error: "action and prompt_id are required" }, { status: 400 });
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(prompt_id)) {
    return NextResponse.json({ error: "Invalid prompt_id format" }, { status: 400 });
  }

  const validActions = ["approve", "remove", "flag"];
  if (!validActions.includes(action)) {
    return NextResponse.json(
      { error: `action must be one of: ${validActions.join(", ")}` },
      { status: 400 },
    );
  }

  // Verify prompt exists
  const { data: prompt, error: fetchError } = await supabase
    .from("personal_library")
    .select("id, user_id, is_public")
    .eq("id", prompt_id)
    .maybeSingle();

  if (fetchError || !prompt) {
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  }

  // Map action -> moderation status label
  const statusLabel =
    action === "approve" ? "approved" : action === "remove" ? "removed" : "flagged";

  // If removing: set is_public = false and verify the update actually took effect
  if (action === "remove") {
    const { data: updated, error: updateError } = await supabase
      .from("personal_library")
      .update({ is_public: false })
      .eq("id", prompt_id)
      .select("id");

    if (updateError) {
      logger.error("[Admin Moderation] Failed to update is_public:", updateError);
      return NextResponse.json(
        { error: "Failed to remove prompt from public library" },
        { status: 500 },
      );
    }
    if (!updated || updated.length === 0) {
      // Silent RLS denial or row vanished — fail loud instead of logging success.
      logger.error("[Admin Moderation] Remove updated 0 rows for prompt", prompt_id);
      return NextResponse.json(
        { error: "Remove did not apply — prompt not updated" },
        { status: 500 },
      );
    }
  }

  // Log the moderation action via the standard admin log helper
  await logAdminAction(user.id, "moderation_review", {
    prompt_id,
    prompt_owner_id: prompt.user_id,
    status: statusLabel,
    action,
  });

  logger.info(`[Admin Moderation] ${action} on prompt ${prompt_id} by admin ${user.id}`);

  return NextResponse.json({ success: true, prompt_id, action, status: statusLabel });
});
