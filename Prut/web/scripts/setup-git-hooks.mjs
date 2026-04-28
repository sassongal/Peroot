#!/usr/bin/env node
// Monorepo-aware Husky setup. The git repo lives at ../../.git relative to
// this package, so we point core.hooksPath at this package's .husky/ from the
// monorepo root. Works on macOS, Linux, and Windows. No-op in CI.

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, relative } from "node:path";

if (process.env.CI) process.exit(0);

try {
  const gitRoot = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
  const huskyDir = resolve(process.cwd(), ".husky");
  if (!existsSync(huskyDir)) process.exit(0);
  const rel = relative(gitRoot, huskyDir).replace(/\\/g, "/");
  execSync(`git config core.hooksPath "${rel}"`, { stdio: "inherit" });
  console.log(`[husky] core.hooksPath → ${rel}`);
} catch (err) {
  console.warn(`[husky] skipped: ${err instanceof Error ? err.message : String(err)}`);
}
