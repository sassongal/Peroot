import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-middleware";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
import { escapePostgrestValue } from "@/lib/sanitize";

/**
 * GET /api/admin/users
 *
 * Returns merged user list (profiles + roles + subscriptions + real activity).
 *
 * IMPORTANT: admin cross-user aggregations run on the service client so RLS
 * does not scope results to the requesting admin. The SSR client from
 * withAdmin() is only used for auth — all data queries below use `svc`.
 */
export const GET = withAdmin(async (req) => {
  const svc = createServiceClient();
  const searchTerm = req.nextUrl.searchParams.get("search") || "";
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "100") || 100, 500);
  const offset = Math.max(0, parseInt(req.nextUrl.searchParams.get("offset") || "0") || 0);

  let profilesQuery = svc
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (searchTerm.trim()) {
    const escaped = escapePostgrestValue(searchTerm);
    profilesQuery = profilesQuery.or(
      `email.ilike.%${escaped}%,full_name.ilike.%${escaped}%,id.eq.${escaped}`,
    );
  }

  const [
    { data: profiles, count: totalCount, error: profileError },
    { data: roles, error: roleError },
    { data: subscriptions, error: subError },
  ] = await Promise.all([
    profilesQuery,
    svc.from("user_roles").select("user_id, role").limit(1000),
    svc.from("subscriptions").select("user_id, plan_name, status, customer_name").limit(1000),
  ]);

  if (profileError) {
    logger.error("[admin/users] profiles error:", profileError);
    return NextResponse.json({ error: "Failed to load profiles" }, { status: 500 });
  }
  if (roleError) logger.error("[admin/users] roles error:", roleError);
  if (subError) logger.warn("[admin/users] subscriptions warning:", subError);

  const userIds = (profiles ?? []).map((p) => p.id);

  // Aggregate real activity from history + auth.users last_sign_in_at
  const promptCountByUser = new Map<string, number>();
  const latestHistoryByUser = new Map<string, string>();
  const lastSignInByUser = new Map<string, string>();

  let freeDailyLimit = 2;
  const ledgerByUser = new Map<
    string,
    { lastSpend: string | null; daily: Record<string, number> }
  >();

  if (userIds.length > 0) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [
      { data: historyRows, error: historyErr },
      authList,
      { data: ledgerRows },
      { data: siteSettings },
    ] = await Promise.all([
      svc
        .from("history")
        .select("user_id, created_at")
        .in("user_id", userIds)
        .order("created_at", { ascending: false })
        .limit(20000),
      // auth.admin.listUsers is paginated (max 1000/page); pull up to 5 pages.
      (async () => {
        const out: Array<{ id: string; last_sign_in_at?: string | null }> = [];
        for (let page = 1; page <= 5; page++) {
          const { data, error } = await svc.auth.admin.listUsers({ page, perPage: 1000 });
          if (error) {
            logger.warn("[admin/users] auth.listUsers warning:", error);
            break;
          }
          const users = data?.users ?? [];
          for (const u of users) out.push({ id: u.id, last_sign_in_at: u.last_sign_in_at ?? null });
          if (users.length < 1000) break;
        }
        return out;
      })(),
      svc
        .from("credit_ledger")
        .select("user_id, created_at, reason")
        .in("user_id", userIds)
        .gte("created_at", sevenDaysAgo)
        .limit(50000),
      svc.from("site_settings").select("daily_free_limit").maybeSingle(),
    ]);

    if (historyErr) {
      logger.warn("[admin/users] history aggregation warning:", historyErr);
    } else {
      for (const row of historyRows ?? []) {
        const uid = (row as { user_id: string }).user_id;
        const ts = (row as { created_at: string }).created_at;
        if (!uid) continue;
        promptCountByUser.set(uid, (promptCountByUser.get(uid) ?? 0) + 1);
        if (!latestHistoryByUser.has(uid)) latestHistoryByUser.set(uid, ts);
      }
    }

    for (const u of authList) {
      if (u.last_sign_in_at) lastSignInByUser.set(u.id, u.last_sign_in_at);
    }

    freeDailyLimit = (siteSettings as { daily_free_limit?: number } | null)?.daily_free_limit ?? 2;

    for (const row of ledgerRows ?? []) {
      const uid = row.user_id as string;
      const ts = row.created_at as string;
      const reason = row.reason as string;
      const entry = ledgerByUser.get(uid) ?? { lastSpend: null, daily: {} };
      if (reason === "spend") {
        if (!entry.lastSpend || ts > entry.lastSpend) entry.lastSpend = ts;
        const day = ts.slice(0, 10);
        entry.daily[day] = (entry.daily[day] ?? 0) + 1;
      }
      ledgerByUser.set(uid, entry);
    }
  }

  function buildSparkline(daily: Record<string, number>): number[] {
    const out: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      out.push(daily[d] ?? 0);
    }
    return out;
  }

  const users = (profiles ?? []).map((p) => {
    const sub = (subscriptions ?? []).find((s: { user_id: string }) => s.user_id === p.id);
    const authLastSignIn = lastSignInByUser.get(p.id) ?? null;
    const profileLastSignIn = (p as { last_sign_in_at?: string | null }).last_sign_in_at ?? null;
    const lastSignInAt = authLastSignIn ?? profileLastSignIn;
    const lastPromptAt = (p as { last_prompt_at?: string | null }).last_prompt_at ?? null;
    const latestHistory = latestHistoryByUser.get(p.id) ?? null;

    const candidates = [lastPromptAt, latestHistory, lastSignInAt].filter((v): v is string => !!v);
    const lastActivityAt =
      candidates.length > 0
        ? candidates.reduce((a, b) => (new Date(a) > new Date(b) ? a : b))
        : null;

    const role =
      (roles ?? []).find((r: { user_id: string; role: string }) => r.user_id === p.id)?.role ??
      "user";
    const tier = role === "admin" ? "admin" : (sub?.plan_name ?? p.plan_tier ?? "free");

    const daily_limit = tier === "admin" ? -1 : tier === "pro" ? 150 : freeDailyLimit;
    const ledger = ledgerByUser.get(p.id) ?? { lastSpend: null, daily: {} };
    const usage_last_7_days = buildSparkline(ledger.daily);

    let refresh_at: string | null = null;
    if (
      tier === "free" &&
      typeof (p as { credits_balance?: number }).credits_balance === "number" &&
      (p as { credits_balance: number }).credits_balance < freeDailyLimit &&
      ledger.lastSpend
    ) {
      refresh_at = new Date(
        new Date(ledger.lastSpend).getTime() + 24 * 60 * 60 * 1000,
      ).toISOString();
    }

    return {
      ...p,
      last_sign_in_at: lastSignInAt,
      role,
      plan_tier: tier,
      customer_name: sub?.customer_name ?? null,
      prompt_count: promptCountByUser.get(p.id) ?? 0,
      last_prompt_at: lastPromptAt,
      last_activity_at: lastActivityAt,
      daily_limit,
      last_spend_at: ledger.lastSpend,
      refresh_at,
      usage_last_7_days,
    };
  });

  return NextResponse.json(users, {
    headers: {
      "X-Total-Count": String(totalCount ?? 0),
    },
  });
});
