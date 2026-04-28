import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdminWrite } from "@/lib/api-middleware";
import { createServiceClient } from "@/lib/supabase/service";
import { logAdminAction, parseAdminInput } from "@/lib/admin/admin-security";
import { logger } from "@/lib/logger";

/**
 * POST /api/admin/users/bulk
 *
 * Body: { action: "ban" | "unban" | "promote_admin" | "demote_admin" | "grant_admin" | "revoke_admin", ids: string[] }
 *
 * `grant_admin` is an alias for `promote_admin`; `revoke_admin` is an alias for `demote_admin`.
 * The canonical names are `promote_admin` and `demote_admin`, which use admin_change_tier RPC
 * (parity with the single-user endpoint). Aliases are preserved for backwards compatibility.
 *
 * Performs the requested action across up to 100 users in one round-trip.
 * Applies the same self-lockout + last-admin guardrails as the per-user
 * endpoint (/api/admin/users/[id]). Returns per-ID ok/fail breakdown.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const bulkSchema = z.object({
  action: z.enum(["ban", "unban", "promote_admin", "demote_admin", "grant_admin", "revoke_admin"]),
  ids: z.array(z.string().regex(UUID_RE)).min(1).max(100),
});

export const POST = withAdminWrite(async (req, _ssrClient, adminUser) => {
  const supabase = createServiceClient();
  const { data: body, error: parseError } = await parseAdminInput(req, bulkSchema);
  if (parseError) return parseError;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { ids } = body;
  // Normalize aliases to canonical action names for consistent audit log entries.
  const action =
    body.action === "grant_admin"
      ? "promote_admin"
      : body.action === "revoke_admin"
        ? "demote_admin"
        : body.action;

  const unique = Array.from(new Set(ids));

  // Self-lockout guardrail — strip admin's own id from ban/demote_admin ops.
  const selfBlocked =
    action === "ban" || action === "demote_admin" ? unique.includes(adminUser.id) : false;
  const targets = selfBlocked ? unique.filter((id) => id !== adminUser.id) : unique;

  // Last-admin guardrail — if the caller is demoting admin and would drop
  // the remaining admin count below 1, refuse. RPC enforces this too — defence in depth.
  if (action === "demote_admin") {
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
        // Revoke all sessions on ban so the JWT lag window is eliminated.
        if (isBanning) {
          const { error: signOutErr } = await supabase.auth.admin.signOut(id, "global");
          if (signOutErr) logger.error(`[Admin Bulk] ban signOut failed for ${id}:`, signOutErr);
        }
      } else if (action === "promote_admin") {
        const { error } = await supabase.rpc("admin_change_tier", {
          target_user_id: id,
          new_tier: "admin",
        });
        if (error) throw error;
        const { error: metaErr } = await supabase.auth.admin.updateUserById(id, {
          app_metadata: { role: "admin", plan_tier: "admin" },
        });
        if (metaErr)
          logger.error(`[Admin Bulk] promote_admin app_metadata failed for ${id}:`, metaErr);
        // Force re-login so new JWT picks up the admin role immediately.
        if (id !== adminUser.id) {
          const { error: signOutErr } = await supabase.auth.admin.signOut(id, "global");
          if (signOutErr)
            logger.error(`[Admin Bulk] promote_admin signOut failed for ${id}:`, signOutErr);
        }
      } else if (action === "demote_admin") {
        const { error } = await supabase.rpc("admin_change_tier", {
          target_user_id: id,
          new_tier: "free",
        });
        if (error) throw error;
        const { error: metaErr } = await supabase.auth.admin.updateUserById(id, {
          app_metadata: { role: null, plan_tier: "free" },
        });
        if (metaErr)
          logger.error(`[Admin Bulk] demote_admin app_metadata failed for ${id}:`, metaErr);
        // Force re-login so revoked role takes effect immediately.
        if (id !== adminUser.id) {
          const { error: signOutErr } = await supabase.auth.admin.signOut(id, "global");
          if (signOutErr)
            logger.error(`[Admin Bulk] demote_admin signOut failed for ${id}:`, signOutErr);
        }
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
