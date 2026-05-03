import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";
import { recordCronSuccess } from "@/lib/cron-heartbeat";
import { EmailService } from "@/lib/emails/service";
import {
  adminCronChurnAlertEmail,
  adminLsAnomalyAlertEmail,
} from "@/lib/emails/templates/admin-alerts";
import { verifyCronSecret } from "@/lib/cron-auth";

const LS_API_BASE = "https://api.lemonsqueezy.com/v1";
const LS_ACTIVE_STATUSES = new Set(["active", "on_trial", "past_due", "paid"]);

interface LsSubscription {
  id: string;
  attributes: {
    status: string;
    customer_id: number;
    user_email: string;
    user_name: string;
  };
}

/** Fetch all subscriptions from LemonSqueezy (handles pagination). */
async function fetchAllLsSubscriptions(apiKey: string): Promise<LsSubscription[]> {
  const results: LsSubscription[] = [];
  let url: string | null = `${LS_API_BASE}/subscriptions?page[size]=100`;
  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/vnd.api+json" },
    });
    if (!res.ok) {
      logger.error(`[sync-subscriptions] LS API error ${res.status}: ${await res.text()}`);
      break;
    }
    const json = (await res.json()) as {
      data: LsSubscription[];
      links?: { next?: string | null };
    };
    results.push(...(json.data ?? []));
    url = json.links?.next ?? null;
  }
  return results;
}

const PRO_MONTHLY_CREDITS = 150;
const ACTIVE_STATUSES = ["active", "on_trial", "past_due", "paid"] as const;
const INACTIVE_STATUSES = ["cancelled", "expired", "unpaid", "paused"] as const;

/**
 * GET /api/cron/sync-subscriptions
 *
 * Daily safety net: catches subscription drift that LemonSqueezy failed to
 * notify us about via webhook. Runs in both directions:
 *
 * Pro → Free: expired/cancelled subscriptions where profile still says 'pro'
 *             + expired trials still marked as on_trial
 * Free → Pro: active subscriptions where profile still says 'free'
 *             (missed subscription_created / subscription_payment_success webhook)
 */
export async function GET(req: Request) {
  const authFailure = verifyCronSecret(req);
  if (authFailure) return authFailure;

  const supabase = createServiceClient();
  const now = new Date().toISOString();
  let fixedCount = 0;
  let upgradedCount = 0;

  try {
    // 1. Find expired trials still marked as on_trial
    const { data: expiredTrials } = await supabase
      .from("subscriptions")
      .select("user_id, status, trial_ends_at")
      .eq("status", "on_trial")
      .lt("trial_ends_at", now);

    // 2. Find inactive subscriptions where profile still says 'pro'
    const { data: staleProUsers } = await supabase
      .from("subscriptions")
      .select("user_id, status")
      .in("status", [...INACTIVE_STATUSES]);

    // Collect all user IDs that need fixing
    const userIdsToFix = new Set<string>();

    for (const s of expiredTrials ?? []) {
      userIdsToFix.add(s.user_id);
    }

    if (staleProUsers?.length) {
      // Only include users whose profile is still 'pro'
      const { data: proProfiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("plan_tier", "pro")
        .in(
          "id",
          staleProUsers.map((s) => s.user_id),
        );

      for (const p of proProfiles ?? []) {
        userIdsToFix.add(p.id);
      }
    }

    // Fetch daily_free_limit (needed for churn resets)
    const { data: settings } = await supabase
      .from("site_settings")
      .select("daily_free_limit, contact_email")
      .single();
    const dailyFreeLimit = settings?.daily_free_limit ?? 2;

    // Pro → Free: fix churned users
    for (const userId of userIdsToFix) {
      // Get current profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan_tier, tags, credits_balance")
        .eq("id", userId)
        .single();

      if (!profile) continue;

      // Update subscription status for expired trials
      await supabase
        .from("subscriptions")
        .update({ status: "expired", updated_at: now })
        .eq("user_id", userId)
        .eq("status", "on_trial")
        .lt("trial_ends_at", now);

      // Only reset credits if they're still on pro tier
      if (profile.plan_tier === "pro") {
        const existingTags: string[] = profile.tags ?? [];
        const newTags = existingTags.includes("churn") ? existingTags : [...existingTags, "churn"];

        const newBalance = Math.min(profile.credits_balance, dailyFreeLimit);
        await supabase
          .from("profiles")
          .update({
            plan_tier: "free",
            credits_balance: newBalance,
            credits_refreshed_at: now,
            // Start the rolling 24h window now so a churned user doesn't get
            // a free "fresh quota" immediately on downgrade.
            last_prompt_at: now,
            churned_at: now,
            tags: newTags,
          })
          .eq("id", userId);

        // Log to credit ledger
        const revokeDelta = newBalance - profile.credits_balance;
        if (revokeDelta !== 0) {
          try {
            await supabase.rpc("log_credit_change", {
              p_user_id: userId,
              p_delta: revokeDelta,
              p_balance_after: newBalance,
              p_reason: "churn_revoke",
              p_source: "system",
            });
          } catch {
            /* ledger is best-effort */
          }
        }

        try {
          const adminEmail = settings?.contact_email || "gal@joya-tech.net";
          const { data: authData, error: authError } =
            await supabase.auth.admin.getUserById(userId);
          if (authError)
            logger.warn(
              `[sync-subscriptions] Could not fetch auth user ${userId}:`,
              authError.message,
            );
          await EmailService.send({
            to: adminEmail,
            subject: `[Peroot Cron] Churn: ${(authData.user?.email || userId).slice(0, 100)}`,
            html: adminCronChurnAlertEmail({
              customerEmail: authData.user?.email || "—",
              userId,
            }),
            emailType: "admin_churn_alert",
          });
          logger.info(`[sync-subscriptions] Churn alert sent for user ${userId}`);
        } catch (emailErr) {
          logger.error("[sync-subscriptions] Churn email error:", emailErr);
        }

        fixedCount++;
        logger.info(
          `[sync-subscriptions] Fixed stale pro user ${userId} → free, credits reset to ${dailyFreeLimit}`,
        );
      }
    }

    // ── Free → Pro reconciliation ─────────────────────────────────────────────
    // Catch users whose subscription_created / subscription_payment_success
    // webhook was lost. They paid but still land on the free tier.
    const { data: activeSubs } = await supabase
      .from("subscriptions")
      .select("user_id, status")
      .in("status", [...ACTIVE_STATUSES]);

    if (activeSubs?.length) {
      const activeUserIds = activeSubs.map((s) => s.user_id);

      const { data: staleFreePros } = await supabase
        .from("profiles")
        .select("id, tags, credits_balance")
        .eq("plan_tier", "free")
        .in("id", activeUserIds);

      for (const profile of staleFreePros ?? []) {
        const existingTags: string[] = profile.tags ?? [];
        const newTags = existingTags.includes("reconciled")
          ? existingTags
          : [...existingTags, "reconciled"];

        await supabase
          .from("profiles")
          .update({
            plan_tier: "pro",
            credits_balance: PRO_MONTHLY_CREDITS,
            credits_refreshed_at: now,
            tags: newTags,
          })
          .eq("id", profile.id);

        try {
          const delta = PRO_MONTHLY_CREDITS - (profile.credits_balance ?? 0);
          await supabase.rpc("log_credit_change", {
            p_user_id: profile.id,
            p_delta: delta,
            p_balance_after: PRO_MONTHLY_CREDITS,
            p_reason: "reconciliation_grant",
            p_source: "system",
          });
        } catch {
          /* ledger is best-effort */
        }

        upgradedCount++;
        logger.info(
          `[sync-subscriptions] Reconciled stale free→pro user ${profile.id}, credits set to ${PRO_MONTHLY_CREDITS}`,
        );
      }
    }

    logger.info(`[sync-subscriptions] Done. Churned: ${fixedCount}, Reconciled: ${upgradedCount}`);

    // ── LemonSqueezy API cross-check ─────────────────────────────────────────
    // Verify DB state against the live LS API to surface anomalies that the
    // DB-only pass above cannot catch (e.g. pro profile with no LS record at
    // all, subscription status drift, duplicate active subscriptions).
    const lsApiKey = process.env.LEMONSQUEEZY_API_KEY;
    if (lsApiKey) {
      try {
        const [lsSubs, { data: dbSubs }] = await Promise.all([
          fetchAllLsSubscriptions(lsApiKey),
          supabase.from("subscriptions").select("user_id, lemonsqueezy_subscription_id, status"),
        ]);

        // Index LS subscriptions by their ID for O(1) lookup.
        const lsById = new Map<string, LsSubscription>();
        for (const s of lsSubs) lsById.set(s.id, s);

        // Detect customers with multiple active subscriptions in LS.
        const activeByCustomer = new Map<string, string[]>();
        for (const s of lsSubs) {
          if (LS_ACTIVE_STATUSES.has(s.attributes.status)) {
            const cid = String(s.attributes.customer_id);
            if (!activeByCustomer.has(cid)) activeByCustomer.set(cid, []);
            activeByCustomer.get(cid)!.push(s.id);
          }
        }
        const duplicateCustomerIds = [...activeByCustomer.entries()].filter(
          ([, ids]) => ids.length > 1,
        );

        // Build anomaly buckets.
        const ghostProUsers: Array<{ userId: string; email: string; subId: string }> = [];
        const mismatchedUsers: Array<{
          userId: string;
          email: string;
          dbStatus: string;
          lsStatus: string;
        }> = [];

        // Fetch pro profiles to check against LS.
        const dbSubUserIds = (dbSubs ?? []).map((s) => s.user_id);
        const { data: proProfilesToCheck } = dbSubUserIds.length
          ? await supabase
              .from("profiles")
              .select("id, plan_tier")
              .eq("plan_tier", "pro")
              .in("id", dbSubUserIds)
          : { data: [] };

        const proProfileSet = new Set((proProfilesToCheck ?? []).map((p) => p.id));

        // Resolve user emails for anomaly report (best-effort).
        const anomalyUserIds = new Set<string>();
        for (const dbSub of dbSubs ?? []) {
          if (proProfileSet.has(dbSub.user_id)) anomalyUserIds.add(dbSub.user_id);
        }
        const emailMap = new Map<string, string>();
        if (anomalyUserIds.size > 0) {
          for (let page = 1; page <= 5; page++) {
            const { data, error } = await supabase.auth.admin.listUsers({
              page,
              perPage: 1000,
            });
            if (error) break;
            for (const u of data?.users ?? []) {
              if (anomalyUserIds.has(u.id)) emailMap.set(u.id, u.email ?? "");
            }
            if ((data?.users?.length ?? 0) < 1000) break;
          }
        }

        for (const dbSub of dbSubs ?? []) {
          const { user_id, lemonsqueezy_subscription_id: lsSubId, status: dbStatus } = dbSub;
          if (!proProfileSet.has(user_id)) continue;
          if (!lsSubId) {
            ghostProUsers.push({
              userId: user_id,
              email: emailMap.get(user_id) ?? "",
              subId: "(none)",
            });
            continue;
          }
          const lsSub = lsById.get(lsSubId);
          if (!lsSub) {
            ghostProUsers.push({
              userId: user_id,
              email: emailMap.get(user_id) ?? "",
              subId: lsSubId,
            });
            continue;
          }
          const lsStatus = lsSub.attributes.status;
          if (lsStatus !== dbStatus) {
            mismatchedUsers.push({
              userId: user_id,
              email: emailMap.get(user_id) ?? lsSub.attributes.user_email,
              dbStatus,
              lsStatus,
            });
          }
        }

        // Resolve duplicate customer details.
        const duplicateCustomers: Array<{
          customerId: string;
          email: string;
          subIds: string[];
        }> = duplicateCustomerIds.map(([cid, subIds]) => ({
          customerId: cid,
          email: lsById.get(subIds[0])?.attributes.user_email ?? "",
          subIds,
        }));

        logger.info(
          `[sync-subscriptions] LS cross-check: ${ghostProUsers.length} ghost-pro, ` +
            `${duplicateCustomers.length} dup-customers, ${mismatchedUsers.length} mismatched`,
        );

        if (ghostProUsers.length || duplicateCustomers.length || mismatchedUsers.length) {
          const adminEmail = settings?.contact_email || "gal@joya-tech.net";
          await EmailService.send({
            to: adminEmail,
            subject: `[Peroot Cron] LS anomalies: ${ghostProUsers.length} ghost, ${duplicateCustomers.length} dup, ${mismatchedUsers.length} mismatch`,
            html: adminLsAnomalyAlertEmail({ ghostProUsers, duplicateCustomers, mismatchedUsers }),
            emailType: "admin_ls_anomaly_alert",
          });
          logger.info("[sync-subscriptions] LS anomaly alert sent");
        }
      } catch (lsErr) {
        // Cross-check is best-effort — never let it fail the cron.
        logger.error("[sync-subscriptions] LS cross-check error:", lsErr);
      }
    } else {
      logger.warn("[sync-subscriptions] LEMONSQUEEZY_API_KEY not set — skipping LS cross-check");
    }

    await recordCronSuccess("sync-subscriptions");
    return NextResponse.json({ fixed: fixedCount, upgraded: upgradedCount });
  } catch (error) {
    logger.error("[sync-subscriptions] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
