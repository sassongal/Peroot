import { google } from "googleapis";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envText = readFileSync(path.resolve(__dirname, "..", ".env.local"), "utf8");
let raw = envText.match(/^GOOGLE_SERVICE_ACCOUNT_KEY=(.*)$/m)[1].trim();
if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) raw = raw.slice(1, -1);
const credentials = JSON.parse(raw);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
});
const gsc = google.searchconsole({ version: "v1", auth });

const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split("T")[0]; };

async function run() {
  // List all properties the SA can access
  console.log("=== All GSC properties visible to service account ===\n");
  const sites = await gsc.sites.list();
  for (const s of sites.data.siteEntry ?? []) {
    console.log(`  ${s.siteUrl}  permission=${s.permissionLevel}`);
  }

  const target = "https://www.peroot.space/";

  console.log(`\n=== Coverage diag for ${target} ===`);

  // Queries that drive impressions
  const q = await gsc.searchanalytics.query({
    siteUrl: target,
    requestBody: {
      startDate: daysAgo(28),
      endDate: daysAgo(1),
      dimensions: ["query"],
      rowLimit: 15,
    },
  });
  console.log("\nTop 15 queries (28d):");
  for (const r of q.data.rows ?? []) {
    console.log(`  "${r.keys[0]}"  clicks=${r.clicks} impr=${r.impressions} pos=${r.position.toFixed(1)}`);
  }

  // By country
  const c = await gsc.searchanalytics.query({
    siteUrl: target,
    requestBody: {
      startDate: daysAgo(28),
      endDate: daysAgo(1),
      dimensions: ["country"],
      rowLimit: 10,
    },
  });
  console.log("\nBy country (28d):");
  for (const r of c.data.rows ?? []) {
    console.log(`  ${r.keys[0]}  clicks=${r.clicks} impr=${r.impressions}`);
  }

  // By device
  const d = await gsc.searchanalytics.query({
    siteUrl: target,
    requestBody: {
      startDate: daysAgo(28),
      endDate: daysAgo(1),
      dimensions: ["device"],
      rowLimit: 5,
    },
  });
  console.log("\nBy device (28d):");
  for (const r of d.data.rows ?? []) {
    console.log(`  ${r.keys[0]}  clicks=${r.clicks} impr=${r.impressions}`);
  }

  // All pages count
  const allPages = await gsc.searchanalytics.query({
    siteUrl: target,
    requestBody: {
      startDate: daysAgo(28),
      endDate: daysAgo(1),
      dimensions: ["page"],
      rowLimit: 1000,
    },
  });
  console.log(`\nTotal distinct pages with impressions (28d): ${allPages.data.rows?.length ?? 0}`);

  // Try URL inspection on various properties/URL forms
  console.log("\n=== URL Inspection attempts ===");
  const attempts = [
    { siteUrl: target, inspectionUrl: target },
    { siteUrl: target, inspectionUrl: "https://www.peroot.space" },
    { siteUrl: "sc-domain:peroot.space", inspectionUrl: target },
  ];
  for (const a of attempts) {
    try {
      const res = await gsc.urlInspection.index.inspect({ requestBody: a });
      const idx = res.data.inspectionResult?.indexStatusResult;
      console.log(`\nsiteUrl=${a.siteUrl} inspecting=${a.inspectionUrl}`);
      console.log(`  verdict=${idx?.verdict} coverage=${idx?.coverageState}`);
      console.log(`  robotsTxtState=${idx?.robotsTxtState} indexingState=${idx?.indexingState}`);
      console.log(`  pageFetchState=${idx?.pageFetchState} crawledAs=${idx?.crawledAs}`);
      console.log(`  lastCrawl=${idx?.lastCrawlTime} googleCanonical=${idx?.googleCanonical}`);
      console.log(`  userCanonical=${idx?.userCanonical}`);
      break;
    } catch (e) {
      console.log(`  ✗ siteUrl=${a.siteUrl}  ${e.message.split("\n")[0]}`);
    }
  }

  // Sitemaps detail per property
  console.log("\n=== Sitemaps ===");
  try {
    const sm = await gsc.sitemaps.list({ siteUrl: target });
    for (const s of sm.data.sitemap ?? []) {
      console.log(JSON.stringify(s, null, 2));
    }
  } catch (e) {
    console.log("  error:", e.message);
  }
}

run().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
