#!/usr/bin/env node
/**
 * Publish/update a single blog_posts row from a JSON payload file.
 *
 * Usage:
 *   node scripts/publish-blog-article.mjs <path-to-payload.json>
 *
 * payload.json shape (only `slug` is required; other fields update if present):
 *   {
 *     "slug": "ai-agents-automation-2026-hebrew",
 *     "content": "<p class=\"lede\">…</p> …",     // full article HTML
 *     "meta_title": "…",                           // ≤60 chars, no "| Peroot"
 *     "meta_description": "…",                      // 120-160 chars
 *     "excerpt": "…",
 *     "title": "…"
 *   }
 *
 * Guardrails: refuses to publish if content/title/meta contain an em/en dash.
 * Uses the Supabase service key (REST PATCH by slug) per blog_seo_tooling.
 */
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) { console.error("Missing Supabase env"); process.exit(1); }

const payloadPath = process.argv[2];
if (!payloadPath) { console.error("Usage: node publish-blog-article.mjs <payload.json>"); process.exit(1); }
const payload = JSON.parse(readFileSync(payloadPath, "utf8"));
if (!payload.slug) { console.error("payload.slug is required"); process.exit(1); }

// Dash guardrail
const dashHit = [];
for (const f of ["content", "title", "meta_title", "meta_description", "excerpt"]) {
  if (typeof payload[f] === "string" && /[—–]/.test(payload[f])) dashHit.push(f);
}
if (dashHit.length) {
  console.error(`REFUSED: em/en dash found in field(s): ${dashHit.join(", ")}`);
  process.exit(2);
}

const slug = payload.slug;
const body = {};
for (const f of ["content", "title", "meta_title", "meta_description", "excerpt"]) {
  if (payload[f] !== undefined) body[f] = payload[f];
}
body.updated_at = new Date().toISOString();

const res = await fetch(`${URL_}/rest/v1/blog_posts?slug=eq.${encodeURIComponent(slug)}`, {
  method: "PATCH",
  headers: {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  },
  body: JSON.stringify(body),
});
const out = await res.json();
if (!res.ok) { console.error(`FAILED (${res.status}):`, JSON.stringify(out)); process.exit(1); }
if (!Array.isArray(out) || out.length === 0) { console.error(`No row matched slug=${slug}`); process.exit(1); }
const words = (out[0].content || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
console.log(`OK: ${slug} updated (${words} words, fields: ${Object.keys(body).join(", ")})`);
