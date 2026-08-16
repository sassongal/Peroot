#!/usr/bin/env node
/**
 * Print a single blog_posts row as JSON (for editing workflows).
 * Usage: node scripts/fetch-blog-article.mjs <slug>
 */
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const slug = process.argv[2];
if (!slug) { console.error("Usage: node fetch-blog-article.mjs <slug>"); process.exit(1); }
const r = await fetch(
  `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/blog_posts?slug=eq.${encodeURIComponent(slug)}&select=slug,title,category,meta_title,meta_description,excerpt,content`,
  { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } },
);
const rows = await r.json();
if (!Array.isArray(rows) || !rows.length) { console.error(`No row for slug=${slug}`); process.exit(1); }
console.log(JSON.stringify(rows[0], null, 2));
