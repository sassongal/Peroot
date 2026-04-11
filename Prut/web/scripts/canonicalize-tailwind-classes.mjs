#!/usr/bin/env node
/**
 * Rewrites Tailwind class strings to canonical v4 forms using the project's design system.
 * Run: node scripts/canonicalize-tailwind-classes.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import { __unstable__loadDesignSystem } from "@tailwindcss/node";

const root = join(import.meta.dirname, "..");
const base = join(root, "src/app");

const css = await readFile(join(base, "globals.css"), "utf8");
const ds = await __unstable__loadDesignSystem(css, { base });

function canonicalizeValue(value) {
  const raw = value.trim();
  if (!raw) return value;
  const tokens = raw.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return value;
  try {
    const out = ds.canonicalizeCandidates(tokens);
    if (out.length !== tokens.length) return value;
    return out.join(" ");
  } catch {
    return value;
  }
}

/** Skip template expressions ${...} — only canonicalize static segments. */
function canonicalizeTemplateStatic(inner) {
  if (inner.includes("${")) return null;
  const next = canonicalizeValue(inner);
  return next === inner.trim() ? null : next;
}

function transformQuotedClassString(quote, inner) {
  const next = canonicalizeValue(inner);
  return next === inner.trim() ? null : `${quote}${next}${quote}`;
}

/**
 * Walk `cn(` ... matching `)` with respect to strings/parens.
 * Returns [start, endExclusive) of inner content, or null.
 */
function findCnCallInner(content, fromIdx) {
  const open = content.indexOf("(", fromIdx);
  if (open === -1) return null;
  let depth = 0;
  let i = open;
  while (i < content.length) {
    const c = content[i];
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      i++;
      while (i < content.length) {
        if (content[i] === "\\") {
          i += 2;
          continue;
        }
        if (content[i] === q) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (c === "(") depth++;
    else if (c === ")") {
      depth--;
      if (depth === 0) return [open + 1, i];
    }
    i++;
  }
  return null;
}

function transformCnInner(inner) {
  let changed = false;
  let out = "";
  let i = 0;
  while (i < inner.length) {
    const c = inner[i];
    if (c === '"' || c === "'") {
      const start = i;
      const q = c;
      i++;
      let buf = "";
      while (i < inner.length) {
        if (inner[i] === "\\") {
          buf += inner[i] + (inner[i + 1] ?? "");
          i += 2;
          continue;
        }
        if (inner[i] === q) {
          i++;
          break;
        }
        buf += inner[i];
        i++;
      }
      const t = transformQuotedClassString(q, buf);
      if (t) {
        changed = true;
        out += t;
      } else {
        out += inner.slice(start, i);
      }
      continue;
    }
    if (c === "`") {
      const start = i;
      i++;
      let buf = "";
      while (i < inner.length) {
        if (inner[i] === "\\") {
          buf += inner[i] + (inner[i + 1] ?? "");
          i += 2;
          continue;
        }
        if (inner[i] === "`") {
          i++;
          break;
        }
        buf += inner[i];
        i++;
      }
      if (!buf.includes("${")) {
        const next = canonicalizeValue(buf);
        if (next !== buf.trim()) {
          changed = true;
          out += "`" + next + "`";
          continue;
        }
      }
      out += inner.slice(start, i);
      continue;
    }
    out += c;
    i++;
  }
  return changed ? out : null;
}

function processFileContent(content) {
  let out = content;

  out = out.replace(/className="([^"]*)"/g, (full, inner) => {
    const next = canonicalizeValue(inner);
    return next === inner.trim() ? full : `className="${next}"`;
  });
  out = out.replace(/className='([^']*)'/g, (full, inner) => {
    const next = canonicalizeValue(inner);
    return next === inner.trim() ? full : `className='${next}'`;
  });
  out = out.replace(/className=\{`([^`${}]*)`\}/g, (full, inner) => {
    const next = canonicalizeTemplateStatic(inner);
    return next == null ? full : `className={\`${next}\`}`;
  });

  out = out.replace(/@apply\s+([^;{}]+);/g, (full, inner) => {
    const next = canonicalizeValue(inner);
    return next === inner.trim() ? full : `@apply ${next};`;
  });

  let search = 0;
  const cnParts = [];
  while (search < out.length) {
    const idx = out.indexOf("cn(", search);
    if (idx === -1) break;
    const innerRange = findCnCallInner(out, idx + 2);
    if (!innerRange) {
      search = idx + 3;
      continue;
    }
    const [a, b] = innerRange;
    const inner = out.slice(a, b);
    const transformed = transformCnInner(inner);
    if (transformed != null) {
      cnParts.push([a, b, transformed]);
    }
    search = b + 1;
  }
  if (cnParts.length > 0) {
    let shifted = out;
    for (let k = cnParts.length - 1; k >= 0; k--) {
      const [a, b, rep] = cnParts[k];
      shifted = shifted.slice(0, a) + rep + shifted.slice(b);
    }
    out = shifted;
  }

  return out;
}

async function collectFiles(dir, acc = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      await collectFiles(p, acc);
    } else if (/\.(tsx|ts|css)$/.test(e.name) && !e.name.endsWith(".d.ts")) {
      acc.push(p);
    }
  }
  return acc;
}

const files = await collectFiles(join(root, "src"));
let n = 0;
for (const path of files) {
  const before = await readFile(path, "utf8");
  const after = processFileContent(before);
  if (after !== before) {
    await writeFile(path, after, "utf8");
    console.log(relative(root, path));
    n++;
  }
}
console.log(`Done. Updated ${n} file(s).`);
