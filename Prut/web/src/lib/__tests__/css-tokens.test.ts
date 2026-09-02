/**
 * Every `var(--token)` a component references must exist in globals.css.
 *
 * Five did not, and an undefined custom property resolves to nothing: the
 * element renders with no background at all. That is how the quota paywall's
 * countdown block, the score tooltip, an attachment dialog and the mobile
 * relations drawer all shipped transparent (master plan 1.1).
 *
 * Tokens set inline via a `style` prop are legitimate and are excluded.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const SRC = join(__dirname, "..", "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === "__tests__") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(entry)) out.push(full);
  }
  return out;
}

const CSS = readFileSync(join(SRC, "app", "globals.css"), "utf8");
const DEFINED = new Set(
  Array.from(CSS.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)).map((m) => m[1].toLowerCase()),
);

/**
 * Set at runtime on an element's own style, so they are scoped rather than
 * global. The picker computes its hues from ENGINE_HUE; the badge from the
 * capability; the guides page from its card data.
 */
const INLINE_SCOPED = new Set([
  // Injected by next/font in layout.tsx via its `variable` option, so they are
  // real at runtime but never appear in globals.css.
  "--font-varela",
  "--font-alef",
  "--font-jb-mono",
  "--pk-bg",
  "--pk-bg-soft",
  "--pk-bg-strong",
  "--pk-border",
  "--pk-border-soft",
  "--pk-text",
  "--chip-accent",
  "--card-color",
]);

describe("CSS custom properties", () => {
  const files = walk(join(SRC, "components")).concat(walk(join(SRC, "app")));

  it("finds the component tree and the stylesheet", () => {
    expect(files.length).toBeGreaterThan(100);
    expect(DEFINED.size).toBeGreaterThan(20);
  });

  it("every referenced token is defined", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const rel = relative(SRC, file).replace(/\\/g, "/");
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          // Tailwind's `bg-(--token)` shorthand and plain `var(--token)`.
          for (const m of line.matchAll(/(?:var\(|-\()(--[a-z0-9-]+)\)/gi)) {
            const token = m[1].toLowerCase();
            if (DEFINED.has(token) || INLINE_SCOPED.has(token)) continue;
            offenders.push(`${rel}:${i + 1}  ${token}`);
          }
        });
    }
    expect(
      offenders,
      `An undefined custom property renders as no value at all: the element gets no background.\nDefine it in globals.css (both palettes) or use an existing token.\n\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
