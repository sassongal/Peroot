import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdminWrite } from "@/lib/api-middleware";
import { createServiceClient } from "@/lib/supabase/service";
import { logAdminAction, parseAdminInput } from "@/lib/admin/admin-security";
import { logger } from "@/lib/logger";

/**
 * POST /api/admin/users/bulk
 *
 * Body: { action: "ban" | "unban" | "grant_admin" | "revoke_admin", ids: string[] }
 *
 * Performs the requested action across up to 100 users in one round-trip.
 * Applies the same self-lockout + last-admin guardrails as the per-user
 * endpoint (/api/admin/users/[id]). Returns per-ID ok/fail breakdown.
 *
 * Replaces the prior pattern of firing N fetches from the client, which
 * spammed the audit log and could partially succeed with no progress UX.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const bulkSchema = z.object({
  action: z.enum(["ban", "unban", "grant_admin", "revoke_admin"]),
  ids: z.array(z.string().regex(UUID_RE)).min(1).max(100),
});

export const POST = withAdminWrite(async (req, _ssrClient, adminUser) => {
  const supabase = createServiceClient();
  const { data: body, error: parseError } = await parseAdminInput(req, bulkSchema);
  if (parseError) return parseError;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { action, ids } = body;
  const unique = Array.from(new Set(ids));

  // Self-lockout guardrail — strip admin's own id from ban/revoke_admin ops.
  const selfBlocked =
    action === "ban" || action === "revoke_admin" ? unique.includes(adminUser.id) : false;
  const targets = selfBlocked ? unique.filter((id) => id !== adminUser.id) : unique;

  // Last-admin guardrail — if the caller is revoking admin and would drop
  // the remaining admin count below 1, refuse.
  if (action === "revoke_admin") {
    const { count, error: countErr } = await supabase
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countErr) {
      logger.error("[Admin Bulk] admin count precheck failed:", countErr);
      return NextResponse.json({ error: "Failed to verify admin count" }, { status: 500 });
    }
    // We'd be removing up to targets.length admin rows; must leave >= 1 behind.
    if ((count ?? 0) - targets.length < 1) {
      return NextResponse.json(
        { error: "Refusing: would remove the last remaining admin" },
        { status: 400 },
      );
    }
  }

  let ok = 0;
  const failed: string[] = [];

  for (const id of targets) {
    try {
      if (action === "ban" || action === "unban") {
        const isBanning = action === "ban";
        const { error } = await supabase
          .from("profiles")
          .update({ is_banned: isBanning })
          .eq("id", id);
        if (error) throw error;
        // Stamp app_metadata so proxy can enforce ban from JWT without extra DB call.
        const { error: metaErr } = await supabase.auth.admin.updateUserById(id, {
          app_metadata: { is_banned: isBanning },
        });
        if (metaErr) logger.error(`[Admin Bulk] ${action} app_metadata failed for ${id}:`, metaErr);
      } else if (action === "grant_admin") {
        const { error } = await supabase
          .from("user_roles")
          .upsert(
            { user_id: id, role: "admin" },
            { onConflict: "user_id,role", ignoreDuplicates: true },
          );
        if (error) throw error;
        // Mirror per-user grant_admin: sync plan_tier so rate limiting and tier
        // checks recognise this user as admin immediately (not just user_roles).
        const { error: tierErr } = await supabase
          .from("profiles")
          .update({ plan_tier: "admin" })
          .eq("id", id);
        if (tierErr) logger.error(`[Admin Bulk] grant_admin plan_tier sync failed for ${id}:`, tierErr);
      } else if (action === "revoke_admin") {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", id)
          .eq("role", "admin");
        if (error) throw error;
        // Restore plan_tier: keep 'pro' if active subscription, otherwise 'free'.
        const { data: activeSub } = await supabase
          .from("subscriptions")
          .select("status")
          .eq("user_id", id)
          .in("status", ["active", "on_trial", "past_due"])
          .maybeSingle();
        const { error: restoreErr } = await supabase
          .from("profiles")
          .update({ plan_tier: activeSub ? "pro" : "free" })
          .eq("id", id);
        if (restoreErr) logger.error(`[Admin Bulk] revoke_admin plan_tier restore failed for ${id}:`, restoreErr);
      }
      ok++;
    } catch (err) {
      logger.error(`[Admin Bulk] ${action} failed for ${id}:`, err);
      failed.push(id);
    }
  }

  // One audit log entry for the whole batch — cheaper and clearer than
  // N per-user rows for a single operator action.
  try {
    await logAdminAction(adminUser.id, `user_bulk_${action}`, {
      target_user_ids: targets,
      ok,
      failed,
      self_blocked: selfBlocked,
    });
  } catch (logErr) {
    logger.error("[Admin Bulk] audit log failed (op succeeded):", logErr);
  }

  return NextResponse.json({
    success: failed.length === 0,
    action,
    total: unique.length,
    ok,
    failed,
    self_blocked: selfBlocked,
  });
});
