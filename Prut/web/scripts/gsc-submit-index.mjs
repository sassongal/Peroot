// Programmatic URL indexing: resubmits sitemap + pings Google Indexing API
// for each URL in gsc-priority-submit.txt.
//
// Note: Google officially supports the Indexing API only for JobPosting and
// BroadcastEvent schemas. For other URLs it does not guarantee indexing, but
// urlNotifications.publish with URL_UPDATED still signals Googlebot to crawl
// sooner, which is what we want for freshly-shipped ISR pages.
//
// Usage: node scripts/gsc-submit-index.mjs [--limit N] [--dry]

import { google } from "googleapis";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envText = readFileSync(path.resolve(__dirname, "..", ".env.local"), "utf8");
const envMatch =
  envText.match(/^GOOGLE_APPLICATION_CREDENTIALS_JSON=(.*)$/m) ??
  envText.match(/^GOOGLE_SERVICE_ACCOUNT_KEY=(.*)$/m);
if (!envMatch) {
  console.error("No GOOGLE_APPLICATION_CREDENTIALS_JSON / GOOGLE_SERVICE_ACCOUNT_KEY in .env.local");
  process.exit(1);
}
let raw = envMatch[1].trim();
if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'")))
  raw = raw.slice(1, -1);
const credentials = JSON.parse(raw);

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const limitArg = args.find((a) => a.startsWith("--limit"));
const limitRaw = limitArg ? (limitArg.split("=")[1] ?? args[args.indexOf(limitArg) + 1]) : undefined;
const limit = limitArg ? parseInt(limitRaw, 10) : 200;
if (limitArg && (!Number.isFinite(limit) || limit <= 0)) {
  console.error(`Invalid --limit value: "${limitRaw}". Must be a positive integer.`);
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: [
    "https://www.googleapis.com/auth/indexing",
    "https://www.googleapis.com/auth/webmasters",
  ],
});
const indexing = google.indexing({ version: "v3", auth });
const gsc = google.searchconsole({ version: "v1", auth });

const siteUrl = "https://www.peroot.space/";
const sitemapUrl = "https://www.peroot.space/sitemap.xml";

function readPriorityUrls() {
  const file = readFileSync(path.resolve(__dirname, "..", "gsc-priority-submit.txt"), "utf8");
  return file
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("https://"));
}

async function resubmitSitemap() {
  console.log(`\n=== Resubmit sitemap ===`);
  if (dry) {
    console.log(`  [dry] would submit ${sitemapUrl}`);
    return;
  }
  try {
    await gsc.sitemaps.submit({ siteUrl, feedpath: sitemapUrl });
    console.log(`  ✓ sitemap resubmitted`);
  } catch (e) {
    console.error(`  ✗ sitemap submit failed: ${e.message}`);
  }
}

async function pingIndexingApi(urls) {
  console.log(`\n=== Indexing API (${urls.length} URLs${dry ? " — dry" : ""}) ===`);
  let ok = 0,
    fail = 0;
  for (const url of urls) {
    if (dry) {
      console.log(`  [dry] URL_UPDATED ${url}`);
      ok++;
      continue;
    }
    try {
      await indexing.urlNotifications.publish({
        requestBody: { url, type: "URL_UPDATED" },
      });
      console.log(`  ✓ ${url}`);
      ok++;
    } catch (e) {
      const msg = e.errors?.[0]?.message ?? e.message;
      console.error(`  ✗ ${url} — ${msg}`);
      fail++;
      // Stop fast on quota exhaustion
      if (/quota|rate/i.test(msg)) {
        console.error(`  ! quota/rate hit — stopping`);
        break;
      }
    }
    // Gentle pacing — API allows 600/min but stay polite
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log(`\nResult: ${ok} ok, ${fail} failed`);
}

async function run() {
  const urls = readPriorityUrls().slice(0, limit);
  console.log(`Loaded ${urls.length} URLs from gsc-priority-submit.txt (limit=${limit})`);
  await resubmitSitemap();
  await pingIndexingApi(urls);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
