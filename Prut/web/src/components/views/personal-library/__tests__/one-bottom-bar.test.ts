/**
 * One fixed bottom bar per screen.
 *
 * The personal library used to render its own `fixed bottom-0 z-40` nav while
 * the global MobileTabBar rendered another one at the same z-index. Both were
 * md:hidden, and because the tab bar mounts later in the tree it painted on
 * top, so the library's folders, favorites, FAB and graph tab were buried and
 * unreachable on a phone. Nothing caught it because each component is correct
 * on its own; only their coexistence is the bug.
 *
 * This test greps for the pattern instead of rendering, because reproducing the
 * collision needs the real stacking context of the full app shell.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const SRC = join(__dirname, "..", "..", "..", "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === "__tests__") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(entry)) out.push(full);
  }
  return out;
}

/** The one global mobile navigation bar. */
const TAB_BAR = "components/layout/MobileTabBar.tsx";

/** The tab bar's stacking level. Anything at or below this collides with it. */
const TAB_BAR_Z = 40;

/**
 * Read the z-index off a Tailwind class string. Overlays that deliberately sit
 * ABOVE the tab bar (drawers, sheets, the cookie banner) are fine: they cover
 * it on purpose and are dismissed rather than navigated. The bug is a
 * PERSISTENT bar at the same level, where paint order silently decides which
 * one the user can touch.
 */
function zIndexOf(line: string): number | null {
  const m = line.match(/\bz-(\d+)\b/);
  return m ? Number(m[1]) : null;
}

describe("one fixed bottom bar", () => {
  const files = walk(join(SRC, "components"));

  it("finds the component tree", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("nothing else pins a full-width bar at or below the tab bar's z-index", () => {
    const offenders: string[] = [];

    for (const file of files) {
      const rel = relative(SRC, file).replace(/\\/g, "/");
      if (rel === TAB_BAR) continue;
      const src = readFileSync(file, "utf8");

      for (const line of src.split("\n")) {
        if (!line.includes("fixed") || !line.includes("bottom-0")) continue;
        // Bars span the viewport; a bottom-anchored corner element does not.
        const spansWidth =
          line.includes("inset-x-0") || (line.includes("left-0") && line.includes("right-0"));
        if (!spansWidth) continue;

        const z = zIndexOf(line);
        // No z-index at all is also a collision: it defaults below z-40.
        if (z === null || z <= TAB_BAR_Z) {
          offenders.push(`${rel}  (z-${z ?? "none"})  ${line.trim().slice(0, 100)}`);
        }
      }
    }

    expect(
      offenders,
      `A second full-width fixed bottom bar will be covered by MobileTabBar (same z-index, mounts later).\nPut view-scoped controls in the view's header instead.\n\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
