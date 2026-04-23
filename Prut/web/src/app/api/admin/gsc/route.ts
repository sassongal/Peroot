import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-middleware";
import { logger } from "@/lib/logger";
import { getGscClient, GSC_SITE_URL, daysAgo, formatRow } from "@/lib/gsc";

export const maxDuration = 30;

export const GET = withAdmin(async (req) => {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") ?? "summary";
  const days = parseInt(searchParams.get("days") ?? "28", 10);
  const limit = parseInt(searchParams.get("limit") ?? "25", 10);

  try {
    const gsc = getGscClient();

    // ── summary ──────────────────────────────────────────────────────────────
    if (action === "summary") {
      const [current, prior] = await Promise.all([
        gsc.searchanalytics.query({
          siteUrl: GSC_SITE_URL,
          requestBody: {
            startDate: daysAgo(days),
            endDate: daysAgo(1),
            dimensions: [],
            rowLimit: 1,
          },
        }),
        gsc.searchanalytics.query({
          siteUrl: GSC_SITE_URL,
          requestBody: {
            startDate: daysAgo(days * 2),
            endDate: daysAgo(days + 1),
            dimensions: [],
            rowLimit: 1,
          },
        }),
      ]);
      const c = current.data.rows?.[0];
      const p = prior.data.rows?.[0];
      return NextResponse.json({
        current: {
          clicks: c?.clicks ?? 0,
          impressions: c?.impressions ?? 0,
          ctr: c?.ctr != null ? parseFloat((c.ctr * 100).toFixed(2)) : 0,
          position: c?.position != null ? parseFloat(c.position.toFixed(1)) : 0,
        },
        prior: {
          clicks: p?.clicks ?? 0,
          impressions: p?.impressions ?? 0,
          ctr: p?.ctr != null ? parseFloat((p.ctr * 100).toFixed(2)) : 0,
          position: p?.position != null ? parseFloat(p.position.toFixed(1)) : 0,
        },
      });
    }

    // ── queries ───────────────────────────────────────────────────────────────
    if (action === "queries") {
      const res = await gsc.searchanalytics.query({
        siteUrl: GSC_SITE_URL,
        requestBody: {
          startDate: daysAgo(days),
          endDate: daysAgo(1),
          dimensions: ["query"],
          rowLimit: limit,
        },
      });
      return NextResponse.json({ rows: (res.data.rows ?? []).map((r) => formatRow(r)) });
    }

    // ── pages ─────────────────────────────────────────────────────────────────
    if (action === "pages") {
      const res = await gsc.searchanalytics.query({
        siteUrl: GSC_SITE_URL,
        requestBody: {
          startDate: daysAgo(days),
          endDate: daysAgo(1),
          dimensions: ["page"],
          rowLimit: limit,
        },
      });
      return NextResponse.json({ rows: (res.data.rows ?? []).map((r) => formatRow(r)) });
    }

    // ── sitemaps ──────────────────────────────────────────────────────────────
    if (action === "sitemaps") {
      const res = await gsc.sitemaps.list({ siteUrl: GSC_SITE_URL });
      return NextResponse.json({ sitemaps: res.data.sitemap ?? [] });
    }

    // ── inspect ───────────────────────────────────────────────────────────────
    if (action === "inspect") {
      const url = searchParams.get("url");
      if (!url) return NextResponse.json({ error: "url param required" }, { status: 400 });
      // Only allow inspecting URLs on the verified GSC property — anything else
      // would fail at Google anyway but we reject early and avoid wasting an
      // upstream call.
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return NextResponse.json({ error: "invalid url" }, { status: 400 });
      }
      const siteOrigin = new URL(GSC_SITE_URL).origin;
      if (parsed.origin !== siteOrigin) {
        return NextResponse.json({ error: "url must be on the verified site" }, { status: 400 });
      }
      const res = await gsc.urlInspection.index.inspect({
        requestBody: { inspectionUrl: parsed.toString(), siteUrl: GSC_SITE_URL },
      });
      return NextResponse.json({ result: res.data.inspectionResult });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (err) {
    logger.error("[Admin GSC] Error:", err);
    // Preserve the known misconfig signal the SEO console UI matches on, but
    // never leak raw auth/internal error text.
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("GOOGLE_SERVICE_ACCOUNT_KEY")) {
      return NextResponse.json(
        { error: "GOOGLE_SERVICE_ACCOUNT_KEY not configured" },
        { status: 500 },
      );
    }
    // 403 = service account not added to the GSC property yet — the SEO
    // console UI branches on "403" to show the setup hint, so keep that token
    // in the message even though we scrub the rest.
    if (/\b403\b/.test(msg)) {
      return NextResponse.json({ error: "GSC 403: service account lacks access" }, { status: 403 });
    }
    return NextResponse.json({ error: "GSC request failed" }, { status: 500 });
  }
});
