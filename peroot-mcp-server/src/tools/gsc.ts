import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { google } from "googleapis";
import { handleError, truncate } from "../clients.js";

const SITE_URL = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL ?? "https://www.peroot.space";

function getGscClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY not set. Create a Google Cloud service account with Search Console API access, download the JSON key, and set it as a single-line JSON string in .env.local.",
    );
  }
  const credentials = JSON.parse(raw);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  return google.searchconsole({ version: "v1", auth });
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

export function registerGscTools(server: McpServer): void {
  // ─── Top queries ─────────────────────────────────────────────────────────────
  server.registerTool(
    "peroot_gsc_top_queries",
    {
      title: "GSC Top Search Queries",
      description:
        "Google Search Console: top queries driving impressions and clicks to peroot.space. Returns clicks, impressions, CTR, and average position per query.",
      inputSchema: z.object({
        days: z.number().int().min(1).max(90).default(28).describe("Look-back window in days (max 90)"),
        limit: z.number().int().min(1).max(100).default(25).describe("Number of rows to return"),
        page_filter: z.string().optional().describe("Optional: filter to a specific page URL prefix"),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ days, limit, page_filter }) => {
      try {
        const gsc = getGscClient();
        const dimensionFilters = page_filter
          ? [{ dimension: "page", operator: "contains", expression: page_filter }]
          : undefined;

        const res = await gsc.searchanalytics.query({
          siteUrl: SITE_URL,
          requestBody: {
            startDate: daysAgo(days),
            endDate: daysAgo(1),
            dimensions: ["query"],
            rowLimit: limit,
            ...(dimensionFilters ? { dimensionFilterGroups: [{ filters: dimensionFilters }] } : {}),
          },
        });

        const rows = (res.data.rows ?? []).map((r) => ({
          query: r.keys?.[0] ?? "",
          clicks: r.clicks ?? 0,
          impressions: r.impressions ?? 0,
          ctr: r.ctr != null ? `${(r.ctr * 100).toFixed(1)}%` : "0%",
          position: r.position != null ? r.position.toFixed(1) : "—",
        }));

        return {
          content: [{ type: "text" as const, text: truncate(JSON.stringify({ site: SITE_URL, period_days: days, count: rows.length, rows }, null, 2)) }],
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );

  // ─── Top pages ───────────────────────────────────────────────────────────────
  server.registerTool(
    "peroot_gsc_top_pages",
    {
      title: "GSC Top Pages",
      description:
        "Google Search Console: top pages by organic clicks. Shows which URLs drive the most search traffic.",
      inputSchema: z.object({
        days: z.number().int().min(1).max(90).default(28).describe("Look-back window in days"),
        limit: z.number().int().min(1).max(100).default(25),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ days, limit }) => {
      try {
        const gsc = getGscClient();
        const res = await gsc.searchanalytics.query({
          siteUrl: SITE_URL,
          requestBody: {
            startDate: daysAgo(days),
            endDate: daysAgo(1),
            dimensions: ["page"],
            rowLimit: limit,
          },
        });

        const rows = (res.data.rows ?? []).map((r) => ({
          page: r.keys?.[0] ?? "",
          clicks: r.clicks ?? 0,
          impressions: r.impressions ?? 0,
          ctr: r.ctr != null ? `${(r.ctr * 100).toFixed(1)}%` : "0%",
          position: r.position != null ? r.position.toFixed(1) : "—",
        }));

        return {
          content: [{ type: "text" as const, text: truncate(JSON.stringify({ site: SITE_URL, period_days: days, count: rows.length, rows }, null, 2)) }],
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );

  // ─── URL inspection ──────────────────────────────────────────────────────────
  server.registerTool(
    "peroot_gsc_inspect_url",
    {
      title: "GSC Inspect URL",
      description:
        "Google Search Console URL Inspection API: checks whether a specific URL is indexed, what Googlebot last saw, and any indexing issues.",
      inputSchema: z.object({
        url: z.string().url().describe("Full URL to inspect (must be under peroot.space)"),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ url }) => {
      try {
        const gsc = getGscClient();
        const res = await gsc.urlInspection.index.inspect({
          requestBody: {
            inspectionUrl: url,
            siteUrl: SITE_URL,
          },
        });

        const result = res.data.inspectionResult;
        const out = {
          url,
          verdict: result?.indexStatusResult?.verdict,
          coverage_state: result?.indexStatusResult?.coverageState,
          robots_txt: result?.indexStatusResult?.robotsTxtState,
          indexing_state: result?.indexStatusResult?.indexingState,
          last_crawl_time: result?.indexStatusResult?.lastCrawlTime,
          crawled_as: result?.indexStatusResult?.crawledAs,
          google_canonical: result?.indexStatusResult?.googleCanonical,
          user_canonical: (result?.indexStatusResult as Record<string, unknown> | undefined)?.userDeclaredCanonical,
          mobile_usability: result?.mobileUsabilityResult?.verdict,
          rich_results: result?.richResultsResult?.verdict,
        };

        return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );

  // ─── Sitemaps ────────────────────────────────────────────────────────────────
  server.registerTool(
    "peroot_gsc_sitemaps",
    {
      title: "GSC Sitemaps Status",
      description:
        "Google Search Console: list all submitted sitemaps with their last download date, URL counts, and error status.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async () => {
      try {
        const gsc = getGscClient();
        const res = await gsc.sitemaps.list({ siteUrl: SITE_URL });

        const sitemaps = (res.data.sitemap ?? []).map((s) => ({
          path: s.path,
          last_submitted: s.lastSubmitted,
          last_downloaded: s.lastDownloaded,
          is_pending: s.isPending,
          is_sitemaps_index: s.isSitemapsIndex,
          contents: s.contents?.map((c) => ({ type: c.type, submitted: c.submitted, indexed: c.indexed })),
          errors: s.errors,
          warnings: s.warnings,
        }));

        return { content: [{ type: "text" as const, text: JSON.stringify({ site: SITE_URL, sitemaps }, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );

  // ─── Index coverage overview ─────────────────────────────────────────────────
  server.registerTool(
    "peroot_gsc_coverage_summary",
    {
      title: "GSC Coverage Summary",
      description:
        "Google Search Console: search analytics aggregate for the site — total clicks, impressions, CTR, and average position over a period. Use to track overall organic performance trends.",
      inputSchema: z.object({
        days: z.number().int().min(1).max(90).default(28).describe("Look-back window in days"),
        compare_days: z.number().int().min(1).max(90).optional().describe("If set, also fetch this prior period for comparison"),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ days, compare_days }) => {
      try {
        const gsc = getGscClient();

        const fetchPeriod = async (start: string, end: string) => {
          const res = await gsc.searchanalytics.query({
            siteUrl: SITE_URL,
            requestBody: { startDate: start, endDate: end, dimensions: [], rowLimit: 1 },
          });
          const row = res.data.rows?.[0];
          return {
            start,
            end,
            clicks: row?.clicks ?? 0,
            impressions: row?.impressions ?? 0,
            ctr: row?.ctr != null ? `${(row.ctr * 100).toFixed(2)}%` : "0%",
            position: row?.position != null ? row.position.toFixed(1) : "—",
          };
        };

        const current = await fetchPeriod(daysAgo(days), daysAgo(1));
        const out: Record<string, unknown> = { site: SITE_URL, current };

        if (compare_days) {
          const prior = await fetchPeriod(daysAgo(days + compare_days), daysAgo(days + 1));
          out.prior = prior;
          out.delta = {
            clicks: (current.clicks as number) - (prior.clicks as number),
            impressions: (current.impressions as number) - (prior.impressions as number),
          };
        }

        return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: handleError(err) }], isError: true };
      }
    },
  );
}
