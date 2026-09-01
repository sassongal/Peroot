/**
 * The personal library must render in BOTH themes.
 *
 * It shipped effectively dark-mode-only: the header, sidebar, folder drawer,
 * modals, dropdowns and search suggestions were hardcoded `#111` / `#0A0A0F` /
 * `#0A0A0A` with no `dark:` counterpart, so in light mode they painted
 * near-black panels onto a light page, with `text-white` on top of them. That
 * is the single biggest reason the surface "looked bad".
 *
 * Both halves are checked, because fixing only one is worse than fixing
 * neither: tokenised panels turn white in light mode, and any surviving
 * `text-white` inside them becomes invisible.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const SRC = join(__dirname, "..", "..", "..", "..");

const ROOTS = [
  join(SRC, "components", "views", "personal-library"),
  join(SRC, "components", "features", "library"),
];
const SINGLE_FILES = [join(SRC, "components", "views", "PersonalLibraryView.tsx")];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "__tests__") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(entry)) out.push(full);
  }
  return out;
}

const FILES = [...ROOTS.flatMap((r) => walk(r)), ...SINGLE_FILES];

/**
 * Data-driven colour is legitimate: the graph paints nodes by capability hue
 * and by score, computed at runtime rather than themed.
 */
const DATA_DRIVEN_COLOR = new Set([
  "components/features/library/PromptNodeCard.tsx",
  "components/features/library/PromptGraphView.tsx",
  "components/features/library/graph-utils.ts",
  "components/features/library/MiniGraph2D.tsx",
  "components/features/library/GuestGraphPreview.tsx",
  "components/features/library/memory-palace/MiniGraph2D.tsx",
]);

describe("library renders in both themes", () => {
  it("finds the library tree", () => {
    expect(FILES.length).toBeGreaterThan(10);
  });

  it("no hardcoded panel colour in the library chrome", () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const rel = relative(SRC, file).replace(/\\/g, "/");
      if (DATA_DRIVEN_COLOR.has(rel)) continue;
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          // `bg-[#...]` is a literal surface with no light/dark counterpart.
          if (/bg-\[#[0-9A-Fa-f]{3,8}\]/.test(line)) {
            offenders.push(`${rel}:${i + 1}  ${line.trim().slice(0, 100)}`);
          }
        });
    }
    expect(
      offenders,
      `Use --surface-panel (modals, dropdowns) or --surface-rail (headers, sidebars).\nBoth are defined in each palette in globals.css.\n\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("no unpaired white tint for surfaces or borders", () => {
    // `bg-white/2.5` and `border-white/8` are how the cards ended up with no
    // visible surface and no border at all on a light page: a 2.5% white fill
    // over #f8fafc is nothing. Paired forms (`dark:bg-white/8`) are correct.
    const offenders: string[] = [];
    for (const file of FILES) {
      const rel = relative(SRC, file).replace(/\\/g, "/");
      if (DATA_DRIVEN_COLOR.has(rel)) continue;
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (line.trim().startsWith("//")) return;
          if (line.includes("dark:")) return;
          if (/(?<![-\w:])(bg|border)-white\/[\d.]+/.test(line)) {
            offenders.push(`${rel}:${i + 1}  ${line.trim().slice(0, 100)}`);
          }
        });
    }
    expect(
      offenders,
      `Unpaired white tints vanish on light surfaces. Use --glass-bg / --glass-border.\n\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("no text-white without a light counterpart", () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const rel = relative(SRC, file).replace(/\\/g, "/");
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (!/(?<![-\w:])text-white\b(?!\/)/.test(line)) return;
          // `text-slate-900 dark:text-white` is the correct paired form.
          if (line.includes("dark:text-white")) return;
          offenders.push(`${rel}:${i + 1}  ${line.trim().slice(0, 100)}`);
        });
    }
    expect(
      offenders,
      `Unpaired text-white is invisible on a light panel. Use text-(--text-primary).\n\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});

describe("surface tokens exist in both palettes", () => {
  const css = readFileSync(join(SRC, "app", "globals.css"), "utf8");

  it("defines --surface-panel and --surface-rail twice each", () => {
    // Once in the light `:root` block, once in the dark block. A single
    // definition means one theme silently inherits the other's surface.
    for (const token of ["--surface-panel", "--surface-rail"]) {
      const count = css.split(`${token}:`).length - 1;
      expect(count, `${token} should be defined in both palettes`).toBe(2);
    }
  });
});
