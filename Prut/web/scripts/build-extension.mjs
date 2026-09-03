#!/usr/bin/env node
/**
 * Package the Chrome extension for the Web Store.
 *
 *   npm run extension:build
 *
 * Checks every script parses, the manifest is valid JSON with the files it
 * names, then writes dist/peroot-extension-<version>.zip (no tests, no docs).
 */
import { execFileSync } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "chrome-extension-v2.1");
const manifest = JSON.parse(readFileSync(path.join(src, "manifest.json"), "utf8"));

const named = new Set();
for (const cs of manifest.content_scripts || []) {
  for (const f of [...(cs.js || []), ...(cs.css || [])]) named.add(f);
}
named.add(manifest.background.service_worker);
named.add(manifest.action.default_popup);
named.add(manifest.options_ui.page);
for (const f of Object.values(manifest.icons || {})) named.add(f);
const missing = [...named].filter((f) => !existsSync(path.join(src, f)));
if (missing.length) {
  console.error("manifest names files that do not exist:", missing.join(", "));
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (entry === "__tests__" || entry.endsWith(".md") || entry.startsWith(".")) continue;
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}
const files = walk(src);
for (const f of files.filter((x) => x.endsWith(".js"))) {
  execFileSync(process.execPath, ["--check", f], { stdio: "inherit" });
}

const dist = path.join(root, "dist");
mkdirSync(dist, { recursive: true });
const zipPath = path.join(dist, `peroot-extension-${manifest.version}.zip`);
// The zip is written with the system zip tool when present (deterministic
// enough for a store upload); otherwise fall back to a tar.gz next to it.
try {
  execFileSync("zip", ["-r", "-X", "-q", zipPath, ".", "-x", "*/__tests__/*", "*.md"], { cwd: src, stdio: "inherit" });
  console.log(`wrote ${path.relative(root, zipPath)} (${files.length} files, v${manifest.version})`);
} catch {
  const tgz = zipPath.replace(/\.zip$/, ".tgz");
  execFileSync("tar", ["-czf", tgz, "--exclude=__tests__", "--exclude=*.md", "-C", src, "."], { stdio: "inherit" });
  console.log(`zip unavailable; wrote ${path.relative(root, tgz)}`);
}
void createWriteStream;
