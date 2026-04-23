import { google } from "googleapis";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", ".env.local");
const envText = readFileSync(envPath, "utf8");
const m = envText.match(/^GOOGLE_SERVICE_ACCOUNT_KEY=(.*)$/m);
if (!m) {
  console.error("GOOGLE_SERVICE_ACCOUNT_KEY not found");
  process.exit(1);
}
let raw = m[1].trim();
if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
  raw = raw.slice(1, -1);
}
const credentials = JSON.parse(raw);

const siteUrl = "https://www.peroot.space";
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
});
const gsc = google.searchconsole({ version: "v1", auth });

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
};

async function run() {
  console.log(`\n=== GSC status for ${siteUrl} ===\n`);

  // 1. Last 28d summary
  try {
    const summary = await gsc.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: daysAgo(28),
        endDate: daysAgo(1),
        dimensions: [],
        rowLimit: 1,
      },
    });
    const r = summary.data.rows?.[0];
    console.log("Last 28 days:");
    console.log(
      r
        ? `  clicks=${r.clicks} impressions=${r.impressions} ctr=${((r.ctr ?? 0) * 100).toFixed(2)}% avgPos=${(r.position ?? 0).toFixed(1)}`
        : "  no data",
    );
  } catch (e) {
    console.log("Summary error:", e.message);
  }

  // 2. Sitemaps
  try {
    const sm = await gsc.sitemaps.list({ siteUrl });
    console.log("\nSitemaps:");
    for (const s of sm.data.sitemap ?? []) {
      console.log(
        `  ${s.path}  submitted=${s.lastSubmitted} lastDownloaded=${s.lastDownloaded}`,
      );
      console.log(
        `    isPending=${s.isPending} errors=${s.errors ?? 0} warnings=${s.warnings ?? 0}`,
      );
      if (s.contents) {
        for (const c of s.contents) {
          console.log(`    ${c.type}: submitted=${c.submitted} indexed=${c.indexed}`);
        }
      }
    }
  } catch (e) {
    console.log("Sitemaps error:", e.message);
  }

  // 3. Top pages (last 28d)
  try {
    const pages = await gsc.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: daysAgo(28),
        endDate: daysAgo(1),
        dimensions: ["page"],
        rowLimit: 10,
      },
    });
    console.log("\nTop 10 pages (28d):");
    for (const r of pages.data.rows ?? []) {
      console.log(
        `  ${r.keys[0]}  clicks=${r.clicks} impr=${r.impressions} pos=${(r.position ?? 0).toFixed(1)}`,
      );
    }
  } catch (e) {
    console.log("Pages error:", e.message);
  }

  // 4. Inspect homepage
  try {
    const ins = await gsc.urlInspection.index.inspect({
      requestBody: { inspectionUrl: siteUrl + "/", siteUrl },
    });
    const idx = ins.data.inspectionResult?.indexStatusResult;
    console.log("\nHomepage index status:");
    console.log(`  verdict=${idx?.verdict} coverage=${idx?.coverageState}`);
    console.log(`  robotsTxtState=${idx?.robotsTxtState}  indexingState=${idx?.indexingState}`);
    console.log(`  pageFetchState=${idx?.pageFetchState}  crawledAs=${idx?.crawledAs}`);
    console.log(
      `  lastCrawlTime=${idx?.lastCrawlTime}  googleCanonical=${idx?.googleCanonical}`,
    );
  } catch (e) {
    console.log("Inspect error:", e.message);
  }
}

run().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
