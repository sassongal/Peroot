import { NextRequest, NextResponse } from "next/server";

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

// Simple in-memory rate limiter: max 10 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const strategy = req.nextUrl.searchParams.get("strategy") || "mobile";

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Validate URL format
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "URL must use http or https" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  // Validate strategy
  if (!VALID_STRATEGIES.has(strategy)) {
    return NextResponse.json({ error: "Strategy must be 'mobile' or 'desktop'" }, { status: 400 });
  }

  // Rate limit
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "PageSpeed API key not configured" }, { status: 500 });
  }

  try {
    const categories = ["performance", "accessibility", "best-practices", "seo"];
    const categoryParams = categories.map((c) => `category=${c}`).join("&");
    const apiUrl = `${PAGESPEED_API}?url=${encodeURIComponent(url)}&key=${apiKey}&strategy=${strategy}&${categoryParams}`;

    const response = await fetch(apiUrl, { next: { revalidate: 0 } });

    if (!response.ok) {
      return NextResponse.json(
        { error: `PageSpeed API returned status ${response.status}` },
        { status: response.status }
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
        .filter((a) => a.details?.type === "opportunity" && a.score !== null && a.score !== undefined && a.score < 0.9)
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
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch PageSpeed data" },
      { status: 500 }
    );
  }
}
