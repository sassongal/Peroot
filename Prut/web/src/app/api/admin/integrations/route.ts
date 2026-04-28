import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import { lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";

export const maxDuration = 30;

/**
 * GET /api/admin/integrations
 * Aggregates live status + metrics from all connected services.
 */
export const GET = withAdmin(async (_req, supabase) => {
  const results: Record<string, unknown> = {};

  // ── 1. GA4 Quick Stats (last 7 days) ─────────────────────────────────

  try {
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const propertyId = process.env.GA4_PROPERTY_ID;

    if (credentialsJson && propertyId) {
      const { BetaAnalyticsDataClient } = await import("@google-analytics/data");
      const credentials = JSON.parse(credentialsJson);
      const client = new BetaAnalyticsDataClient({ credentials });

      const [response] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [
          { startDate: "7daysAgo", endDate: "today" },
          { startDate: "14daysAgo", endDate: "8daysAgo" },
        ],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
          { name: "bounceRate" },
          { name: "averageSessionDuration" },
        ],
      });

      const rows = response.rows || [];
      const current = rows[0]?.metricValues?.map((v) => Number(v.value)) || [];
      const previous = rows[1]?.metricValues?.map((v) => Number(v.value)) || [];

      results.ga4 = {
        status: "active",
        period: "7d",
        activeUsers: current[0] || 0,
        sessions: current[1] || 0,
        pageViews: current[2] || 0,
        bounceRate: current[3] ? Math.round(current[3] * 100) : 0,
        avgSessionDuration: current[4] ? Math.round(current[4]) : 0,
        deltas: {
          activeUsers: previous[0]
            ? Math.round(((current[0] - previous[0]) / previous[0]) * 100)
            : 0,
          sessions: previous[1] ? Math.round(((current[1] - previous[1]) / previous[1]) * 100) : 0,
          pageViews: previous[2] ? Math.round(((current[2] - previous[2]) / previous[2]) * 100) : 0,
        },
      };
    } else {
      results.ga4 = { status: "not-configured" };
    }
  } catch (err) {
    logger.error("[Integrations] GA4 error:", err);
    results.ga4 = { status: "error", error: "Failed to fetch GA4 data" };
  }

  // ── 2. Supabase / App Stats ───────────────────────────────────────────
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      { count: totalUsers },
      { count: newUsersWeek },
      { count: proUsers },
      { count: promptsWeek },
      { count: promptsMonth },
      { data: recentActivity },
    ] = await Promise.all([
      supabase!.from("profiles").select("*", { count: "exact", head: true }),
      supabase!
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekAgo.toISOString()),
      supabase!
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      supabase!
        .from("personal_library")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekAgo.toISOString()),
      supabase!
        .from("personal_library")
        .select("*", { count: "exact", head: true })
        .gte("created_at", monthAgo.toISOString()),
      supabase!
        .from("activity_logs")
        .select("action")
        .gte("created_at", weekAgo.toISOString())
        .limit(500),
    ]);

    const errorCount =
      recentActivity?.filter(
        (a) =>
          a.action?.toLowerCase().includes("error") || a.action?.toLowerCase().includes("fail"),
      ).length || 0;

    results.app = {
      status: "active",
      totalUsers: totalUsers || 0,
      newUsersWeek: newUsersWeek || 0,
      proUsers: proUsers || 0,
      promptsWeek: promptsWeek || 0,
      promptsMonth: promptsMonth || 0,
      activityWeek: recentActivity?.length || 0,
      errorRate: recentActivity?.length
        ? Math.round((errorCount / recentActivity.length) * 100)
        : 0,
    };
  } catch (err) {
    logger.error("[Integrations] App stats error:", err);
    results.app = { status: "error" };
  }

  // ── 3. Sentry Check (via API) ────────────────────────────────────────
  try {
    results.sentry = {
      status: process.env.SENTRY_DSN ? "active" : "not-configured",
      hasDSN: !!process.env.SENTRY_DSN,
      hasAuthToken: !!process.env.SENTRY_AUTH_TOKEN,
    };
  } catch {
    results.sentry = { status: "error" };
  }

  // ── 4. Redis / Rate Limiting Status ───────────────────────────────────
  try {
    if (process.env.REDIS_URL && process.env.REDIS_TOKEN) {
      const start = Date.now();
      const res = await fetch(`${process.env.REDIS_URL}/ping`, {
        headers: { Authorization: `Bearer ${process.env.REDIS_TOKEN}` },
      });
      const latency = Date.now() - start;
      results.redis = {
        status: res.ok ? "active" : "error",
        latencyMs: latency,
      };
    } else {
      results.redis = { status: "not-configured" };
    }
  } catch (err) {
    logger.error("[Integrations] Redis error:", err);
    results.redis = { status: "error" };
  }

  // ── 5. Email (Resend) Status — live API check ─────────────────────────
  try {
    if (process.env.RESEND_API_KEY) {
      const resendRes = await fetch("https://api.resend.com/emails?limit=1", {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      });
      if (resendRes.ok) {
        const resendData = await resendRes.json();
        const lastEmail = resendData.data?.[0];
        results.resend = {
          status: "active",
          fromEmail: process.env.RESEND_FROM_EMAIL || "not set",
          lastSentAt: lastEmail?.created_at ?? null,
          lastSentTo: lastEmail?.to?.[0] ?? null,
        };
      } else {
        results.resend = {
          status: "error",
          fromEmail: process.env.RESEND_FROM_EMAIL || "not set",
          lastSentAt: null,
        };
      }
    } else {
      results.resend = { status: "not-configured", fromEmail: "not set", lastSentAt: null };
    }
  } catch (err) {
    logger.error("[Integrations] Resend error:", err);
    results.resend = {
      status: process.env.RESEND_API_KEY ? "active" : "not-configured",
      fromEmail: process.env.RESEND_FROM_EMAIL || "not set",
      lastSentAt: null,
    };
  }

  // ── 6. LemonSqueezy — live API check ──────────────────────────────────
  try {
    if (process.env.LEMONSQUEEZY_API_KEY) {
      lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY! });
      const { listSubscriptions } = await import("@lemonsqueezy/lemonsqueezy.js");
      const result = await listSubscriptions({ filter: { status: "active" } });
      const subs = result.data?.data ?? [];
      const activeSubs = subs.length;
      const priceUsd = parseFloat(process.env.LEMONSQUEEZY_PRO_PRICE_USD ?? "3.99");
      const mrr = parseFloat((activeSubs * priceUsd).toFixed(2));
      results.lemonSqueezy = {
        status: "active",
        activeSubs,
        mrr,
        storeId: process.env.LEMONSQUEEZY_STORE_ID || null,
      };
    } else {
      results.lemonSqueezy = { status: "not-configured", activeSubs: 0, mrr: 0, storeId: null };
    }
  } catch (err) {
    logger.error("[Integrations] LemonSqueezy error:", err);
    results.lemonSqueezy = {
      status: process.env.LEMONSQUEEZY_API_KEY ? "error" : "not-configured",
      activeSubs: 0,
      mrr: 0,
      storeId: process.env.LEMONSQUEEZY_STORE_ID || null,
    };
  }

  // ── 7. Service Config Checks ──────────────────────────────────────────
  results.services = {
    clarity: {
      configured: !!process.env.NEXT_PUBLIC_CLARITY_ID,
      id: process.env.NEXT_PUBLIC_CLARITY_ID
        ? `${process.env.NEXT_PUBLIC_CLARITY_ID.slice(0, 4)}...`
        : null,
    },
    indexnow: {
      configured: !!process.env.INDEXNOW_KEY,
      keyPrefix: process.env.INDEXNOW_KEY ? `${process.env.INDEXNOW_KEY.slice(0, 8)}...` : null,
    },
    posthog: {
      configured: !!process.env.NEXT_PUBLIC_POSTHOG_KEY,
    },
    searchConsole: {
      configured: !!process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL,
      siteUrl: process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL || null,
    },
  };

  return NextResponse.json({
    ...results,
    fetchedAt: new Date().toISOString(),
  });
});
