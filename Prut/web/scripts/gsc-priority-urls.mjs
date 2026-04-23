import { google } from "googleapis";
import { readFileSync, writeFileSync } from "node:fs";
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
const siteUrl = "https://www.peroot.space/";
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split("T")[0]; };

async function run() {
  // 1. All pages with impressions (these are already known to Google)
  const pagesRes = await gsc.searchanalytics.query({
    siteUrl,
    requestBody: { startDate: daysAgo(90), endDate: daysAgo(1), dimensions: ["page"], rowLimit: 1000 },
  });
  const knownUrls = new Set((pagesRes.data.rows ?? []).map(r => r.keys[0]));

  // 2. All URLs submitted in sitemap — fetch from live sitemap.xml
  const sitemapXml = await fetch("https://www.peroot.space/sitemap.xml").then(r => r.text());
  const submitted = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);

  // 3. Find URLs submitted but NOT yet getting impressions = priority submit list
  const priority = submitted.filter(u => !knownUrls.has(u));

  // Bucket by route type
  const buckets = {
    categoryPages: priority.filter(u => /\/prompts\/[^/]+$/.test(u)),
    promptDetails: priority.filter(u => /\/prompts\/[^/]+\/[^/]+$/.test(u)),
    blogPosts: priority.filter(u => /\/blog\/[^/]+$/.test(u)),
    guides: priority.filter(u => /\/guide/.test(u)),
    other: [],
  };
  buckets.other = priority.filter(u =>
    !buckets.categoryPages.includes(u) &&
    !buckets.promptDetails.includes(u) &&
    !buckets.blogPosts.includes(u) &&
    !buckets.guides.includes(u)
  );

  console.log(`Total URLs in sitemap:        ${submitted.length}`);
  console.log(`URLs already in Google:       ${knownUrls.size}`);
  console.log(`URLs needing indexing push:   ${priority.length}\n`);
  console.log(`Breakdown:`);
  console.log(`  Prompt category pages:  ${buckets.categoryPages.length}`);
  console.log(`  Prompt detail pages:    ${buckets.promptDetails.length}`);
  console.log(`  Blog posts:             ${buckets.blogPosts.length}`);
  console.log(`  Guides:                 ${buckets.guides.length}`);
  console.log(`  Other:                  ${buckets.other.length}`);

  // Write priority list — MANUAL-SUBMIT top 10 per category (GSC daily cap ~10-12)
  const top = [
    ...buckets.categoryPages.slice(0, 5),
    ...buckets.guides.slice(0, 3),
    ...buckets.blogPosts.slice(0, 3),
    ...buckets.promptDetails.slice(0, 4),
    ...buckets.other.slice(0, 2),
  ].slice(0, 12);

  const outPath = path.resolve(__dirname, "..", "gsc-priority-submit.txt");
  writeFileSync(outPath,
    `# GSC URLs to manually submit via "Request Indexing"\n# Generated ${new Date().toISOString()}\n# Daily quota is ~10-12 URLs. Paste each into GSC URL Inspection → Request Indexing.\n\n` +
    top.join("\n") + "\n\n# === REMAINING (submit in subsequent days) ===\n" +
    priority.filter(u => !top.includes(u)).join("\n")
  );
  console.log(`\n✓ Wrote priority list → ${outPath}`);
  console.log(`\nTop 12 to submit TODAY:\n${top.map(u => "  " + u).join("\n")}`);
}

run().catch(e => { console.error(e); process.exit(1); });
