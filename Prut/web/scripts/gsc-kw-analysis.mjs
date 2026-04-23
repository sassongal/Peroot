import { google } from "googleapis";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raw = readFileSync(path.resolve(__dirname,"..",".env.local"),"utf8").match(/GOOGLE_SERVICE_ACCOUNT_KEY=(.*)/)[1].replace(/^['"]|['"]$/g,"");
const auth = new google.auth.GoogleAuth({credentials: JSON.parse(raw), scopes:["https://www.googleapis.com/auth/webmasters.readonly"]});
const gsc = google.searchconsole({version:"v1",auth});
const siteUrl = "https://www.peroot.space/";
const daysAgo = n => { const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().split("T")[0]; };

async function q(dims, rowLimit=50, extra={}) {
  const r = await gsc.searchanalytics.query({ siteUrl, requestBody: { startDate: daysAgo(90), endDate: daysAgo(1), dimensions: dims, rowLimit, ...extra }});
  return r.data.rows ?? [];
}

console.log("=== TOP 30 QUERIES (90d) ===");
(await q(["query"], 30)).forEach(r=>console.log(`  ${String(r.clicks).padStart(4)}c / ${String(r.impressions).padStart(5)}i / pos ${r.position.toFixed(1)}  "${r.keys[0]}"`));

const all = await q(["query"], 500);

console.log("\n=== OPPORTUNITIES: pos 5-20, impressions >= 10 ===");
all.filter(r => r.position >= 5 && r.position <= 20 && r.impressions >= 10).sort((a,b)=>b.impressions-a.impressions).slice(0,25)
  .forEach(r=>console.log(`  pos ${r.position.toFixed(1).padStart(4)} / ${String(r.impressions).padStart(5)}i / ${r.clicks}c / ctr ${(r.ctr*100).toFixed(1)}%  "${r.keys[0]}"`));

console.log("\n=== STRIKING DISTANCE: pos 11-20 ===");
all.filter(r => r.position >= 11 && r.position <= 20 && r.impressions >= 5).sort((a,b)=>b.impressions-a.impressions).slice(0,20)
  .forEach(r=>console.log(`  pos ${r.position.toFixed(1).padStart(4)} / ${String(r.impressions).padStart(5)}i  "${r.keys[0]}"`));

console.log("\n=== LOW CTR on page 1 (pos <=10, ctr < 3%) ===");
all.filter(r => r.position <= 10 && r.impressions >= 20 && r.ctr < 0.03).sort((a,b)=>b.impressions-a.impressions).slice(0,15)
  .forEach(r=>console.log(`  pos ${r.position.toFixed(1).padStart(4)} / ${String(r.impressions).padStart(5)}i / ctr ${(r.ctr*100).toFixed(1)}%  "${r.keys[0]}"`));

console.log("\n=== TOP 15 PAGES ===");
(await q(["page"], 15)).forEach(r=>console.log(`  ${String(r.clicks).padStart(4)}c / ${String(r.impressions).padStart(5)}i / pos ${r.position.toFixed(1)}  ${r.keys[0].replace("https://www.peroot.space","")}`));

console.log("\n=== HEAD TERMS ===");
for (const term of ["פרומפט","פרומפטים","הנדסת פרומפטים","כתיבת פרומפטים","פירוט","chatgpt בעברית","שדרוג פרומפט","מחולל פרומפטים"]) {
  const r = await gsc.searchanalytics.query({ siteUrl, requestBody: { startDate: daysAgo(90), endDate: daysAgo(1), dimensions:["query"], dimensionFilterGroups:[{filters:[{dimension:"query",operator:"equals",expression:term}]}]}});
  const row = r.data.rows?.[0];
  console.log(`  "${term}": ${row ? `${row.clicks}c / ${row.impressions}i / pos ${row.position.toFixed(1)}` : "no data"}`);
}

console.log("\n=== TOTALS (90d) ===");
const total = await gsc.searchanalytics.query({ siteUrl, requestBody: { startDate: daysAgo(90), endDate: daysAgo(1)}});
const t = total.data.rows?.[0];
if (t) console.log(`  ${t.clicks} clicks / ${t.impressions} impressions / avg pos ${t.position.toFixed(1)} / CTR ${(t.ctr*100).toFixed(2)}%`);
