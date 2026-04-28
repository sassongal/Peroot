import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { checkRateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface LighthouseAudit {
  title?: string;
  description?: string;
  score?: number | null;
  displayValue?: string;
  details?: {
    type?: string;
    overallSavingsMs?: number;
  };
}

const PAGESPEED_API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const VALID_STRATEGIES = new Set(["mobile", "desktop"]);

// SSRF defense: reject hosts that resolve to private/link-local/loopback space or
// look like raw metadata endpoints. We block by hostname pattern BEFORE forwarding
// to PageSpeed — PageSpeed itself fetches the URL, so an attacker could otherwise
// point it at http://169.254.169.254 or internal container IPs.
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "0.0.0.0" || h.endsWith(".local") || h.endsWith(".internal"))
    return true;
  const ipv4 = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4) {
    const [a, b] = ipv4.slice(1).map(Number);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 0) return true;
  }
  if (
    h.startsWith("[") &&
    (h.includes("::1") || h.startsWith("[fc") || h.startsWith("[fd") || h.startsWith("[fe80"))
  )
    return true;
  return false;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const strategy = req.nextUrl.searchParams.get("strategy") || "mobile";

  if (!url) {
    return NextResponse.json({ error: "חסר פרמטר URL", code: "missing_url" }, { status: 400 });
  }

  // Validate URL format + block SSRF targets
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "הכתובת חייבת להתחיל ב-http או https", code: "invalid_url" }, { status: 400 });
    }
    if (isBlockedHost(parsed.hostname)) {
      return NextResponse.json({ error: "הדומיין אינו מורשה", code: "host_not_allowed" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "כתובת URL אינה תקינה", code: "invalid_url" }, { status: 400 });
  }

  // Validate strategy
  if (!VALID_STRATEGIES.has(strategy)) {
    return NextResponse.json({ error: "Strategy must be 'mobile' or 'desktop'" }, { status: 400 });
  }

  // Rate limit — Upstash sliding window (10/min per IP)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await checkRateLimit(`speed-test:${ip}`, "speedTest");
  if (!rl.success) {
    return NextResponse.json(
      { error: "יותר מדי בקשות. נסה שוב בעוד דקה", code: "too_many_requests" },
      { status: 429 },
    );
  }

  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "מפתח PageSpeed לא מוגדר", code: "not_configured" }, { status: 500 });
  }

  try {
    const categories = ["performance", "accessibility", "best-practices", "seo"];
    const categoryParams = categories.map((c) => `category=${c}`).join("&");
    const apiUrl = `${PAGESPEED_API}?url=${encodeURIComponent(url)}&key=${apiKey}&strategy=${strategy}&${categoryParams}`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: `PageSpeed API returned status ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();

    const lighthouse = data.lighthouseResult;
    const categories_result = lighthouse?.categories || {};
    const audits: Record<string, LighthouseAudit> = lighthouse?.audits || {};

    const result = {
      url: data.id,
      fetchTime: lighthouse?.fetchTime,
      strategy,
      scores: {
        performance: Math.round((categories_result.performance?.score || 0) * 100),
        accessibility: Math.round((categories_result.accessibility?.score || 0) * 100),
        bestPractices: Math.round((categories_result["best-practices"]?.score || 0) * 100),
        seo: Math.round((categories_result.seo?.score || 0) * 100),
      },
      coreWebVitals: {
        lcp: audits["largest-contentful-paint"]?.displayValue || "N/A",
        cls: audits["cumulative-layout-shift"]?.displayValue || "N/A",
        fcp: audits["first-contentful-paint"]?.displayValue || "N/A",
        si: audits["speed-index"]?.displayValue || "N/A",
        tbt: audits["total-blocking-time"]?.displayValue || "N/A",
        tti: audits["interactive"]?.displayValue || "N/A",
      },
      coreWebVitalsScores: {
        lcp: audits["largest-contentful-paint"]?.score,
        cls: audits["cumulative-layout-shift"]?.score,
        fcp: audits["first-contentful-paint"]?.score,
        si: audits["speed-index"]?.score,
        tbt: audits["total-blocking-time"]?.score,
        tti: audits["interactive"]?.score,
      },
      opportunities: Object.values(audits)
        .filter(
          (a) =>
            a.details?.type === "opportunity" &&
            a.score !== null &&
            a.score !== undefined &&
            a.score < 0.9,
        )
        .map((a) => ({
          title: a.title,
          description: a.description,
          savings: a.details?.overallSavingsMs
            ? `${Math.round(a.details.overallSavingsMs)}ms`
            : undefined,
        }))
        .slice(0, 10),
    };

    return NextResponse.json(result);
  } catch (err) {
    Sentry.captureException(err, { tags: { route: "api/speed-test" } });
    return NextResponse.json({ error: "טעינת נתוני PageSpeed נכשלה", code: "load_failed" }, { status: 500 });
  }
}
