/**
 * The no-flash theme script must swap the class, not stack it.
 *
 * The server renders `<html className="dark">`. The inline bootstrap script
 * used to do `classList.add(stored)` and nothing else, so a light mode visitor
 * got `class="dark light"` before first paint. `.dark` carries the dark
 * palette and `.light` matches nothing at all, because the light palette lives
 * on bare `:root`, so the page painted dark until React reconciled. Caught in
 * production: the blog page came back at rgb(8,8,8) with the light setting
 * stored.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const layout = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");

/** The bootstrap script body, as it is actually shipped to the browser. */
function bootstrapScript(): string {
  const m = layout.match(/__html: `(try\{var t=localStorage\.getItem\('peroot-theme'\)[^`]*)`/);
  expect(m, "theme bootstrap script not found in layout").toBeTruthy();
  return m![1];
}

describe("theme bootstrap", () => {
  it("removes the opposite class as well as adding its own", () => {
    const script = bootstrapScript();
    expect(script).toContain("classList.remove('dark')");
    expect(script).toContain("classList.remove('light')");
  });

  it("actually swaps the class when it runs", () => {
    const script = bootstrapScript();
    const root = { classList: new Set<string>(["dark"]) };
    const documentElement = {
      classList: {
        add: (c: string) => root.classList.add(c),
        remove: (c: string) => root.classList.delete(c),
      },
    };

    for (const [stored, expected] of [
      ["light", ["light"]],
      ["dark", ["dark"]],
    ] as const) {
      root.classList.clear();
      root.classList.add("dark"); // what the server rendered
      const localStorage = { getItem: () => stored };
      new Function("localStorage", "document", script)(localStorage, { documentElement });
      expect([...root.classList], `stored=${stored}`).toEqual([...expected]);
    }
  });

  it("leaves the server class alone when nothing is stored", () => {
    const script = bootstrapScript();
    const classes = new Set<string>(["dark"]);
    const documentElement = {
      classList: { add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c) },
    };
    const localStorage = { getItem: () => null };
    new Function("localStorage", "document", script)(localStorage, { documentElement });
    expect([...classes]).toEqual(["dark"]);
  });
});
