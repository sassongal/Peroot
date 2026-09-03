/**
 * The personal area has to read in light mode too.
 *
 * The repo-wide light-mode test catches white text and white glass. It does
 * not catch the other way the settings pages went wrong: a coloured 300/400
 * text token (amber-400, green-300, red-400) with no `dark:` partner. On the
 * cool light ground those sit near 1.5:1 and vanish. Inside this folder the
 * rule is stricter: a coloured light-tint text class must pair with a
 * `dark:` text class in the same string, or use the 600/700/800 ramp.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const PAGE = path.resolve(__dirname, "../../../app/settings/page.tsx");
const CLASS = /"([^"\n]*)"/g;
const LIGHT_TINT_TEXT =
  /(?:^|\s)text-(?:amber|yellow|orange|red|rose|pink|green|emerald|teal|blue|sky|indigo|violet|purple|slate)-(?:200|300|400)(?:\/\d+)?(?:\s|$)/;

function files(): string[] {
  const own = readdirSync(ROOT)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => path.join(ROOT, f));
  return [...own, PAGE];
}

describe("settings area: light-mode contrast", () => {
  it("never sets a 200/300/400 coloured text without a dark: partner", () => {
    const bad: string[] = [];
    for (const file of files()) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(CLASS)) {
        const cls = m[1];
        if (!LIGHT_TINT_TEXT.test(cls)) continue;
        if (/\bdark:text-/.test(cls)) continue;
        bad.push(`${path.basename(file)}: "${cls.slice(0, 90)}"`);
      }
    }
    expect(bad, bad.join("\n")).toEqual([]);
  });

  it("does not link to routes that do not exist", () => {
    const src = files()
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");
    expect(src).not.toContain("/settings/subscription");
  });
});
