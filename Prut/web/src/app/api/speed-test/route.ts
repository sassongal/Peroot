import { NextRequest, NextResponse } from "next/server";

const PAGESPEED_API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const strategy = req.nextUrl.searchParams.get("strategy") || "mobile";

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "PageSpeed API key not configured" }, { status: 500 });
  }

  try {
    const categories = ["performance", "accessibility", "best-practices", "seo"];
    const params = new URLSearchParams({
      url,
      key: apiKey,
      strategy,
      ...Object.fromEntries(categories.map((c, i) => [`category`, c]).slice(0, 1)),
    });
    // Add multiple category params
    const categoryParams = categories.map((c) => `category=${c}`).join("&");
    const apiUrl = `${PAGESPEED_API}?url=${encodeURIComponent(url)}&key=${apiKey}&strategy=${strategy}&${categoryParams}`;

    const response = await fetch(apiUrl, { next: { revalidate: 0 } });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `PageSpeed API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract key metrics
    const lighthouse = data.lighthouseResult;
    const categories_result = lighthouse?.categories || {};
    const audits = lighthouse?.audits || {};

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
        fid: audits["max-potential-fid"]?.displayValue || "N/A",
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
        .filter((a: any) => a.details?.type === "opportunity" && a.score !== null && a.score < 0.9)
        .map((a: any) => ({
          title: a.title,
          description: a.description,
          savings: a.details?.overallSavingsMs
            ? `${Math.round(a.details.overallSavingsMs)}ms`
            : undefined,
        }))
        .slice(0, 10),
    };

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch PageSpeed data", details: error.message },
      { status: 500 }
    );
  }
}
