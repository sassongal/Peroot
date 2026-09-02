/**
 * Light mode has to keep working.
 *
 * The product was built dark first and the light palette was added later, so
 * dark-only utility classes kept appearing: white text with no `dark:` pair,
 * `bg-white/5` glass, `border-white/10`, and modal shells pinned to a near
 * black hex. In light mode those render white on white, or a black modal on a
 * white page. This test fails on new ones rather than trusting a sweep to hold.
 *
 * The rule: inside one class string, a dark-only colour is a bug UNLESS the
 * same string also sets a `dark:` variant of the same property (which means the
 * author handled both themes deliberately).
 */
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

/**
 * Screens that are deliberately dark in both themes: the login gate and its
 * relatives, the onboarding scene, the maintenance page, and the Connect docs.
 * They are self-consistent, and their white text sits on their own dark ground.
 */
const DARK_SCENES = new Set([
  "src/components/auth/auth-form.tsx",
  "src/app/auth/reset-password/page.tsx",
  "src/app/oauth/authorize/page.tsx",
  "src/components/ui/OnboardingOverlay.tsx",
  "src/app/login/page.tsx",
  "src/components/MaintenanceMode.tsx",
  "src/app/(public)/connect/page.tsx",
  "src/app/(public)/connect/docs/page.tsx",
  // Canvas chrome: the force graph paints its own dark ground.
  "src/components/features/library/PromptGraphView.tsx",
  "src/components/features/library/GraphInsightOverlay.tsx",
  // Text and badges that sit on top of an image.
  "src/components/blog/BlogHeroImage.tsx",
  "src/components/features/FeaturesVideoEmbed.tsx",
  // Initials on a generated colour circle.
  "src/components/layout/user-nav.tsx",
]);

const CLASS = /"([^"\n]*)"/g;

function productFiles(): string[] {
  const out = execFileSync("bash", ["-c", "grep -rl 'className' --include=*.tsx src"], {
    encoding: "utf8",
  });
  return (
    out
      .split("\n")
      .filter(Boolean)
      // The admin dashboard is a separate, deliberately dark surface with an
      // audience of two. It is not part of the product's light mode.
      .filter((f) => !f.includes("/admin"))
      .filter((f) => !DARK_SCENES.has(f))
  );
}

/**
 * A filled button or badge (`bg-red-600`, `bg-amber-500`, `accent-gradient`)
 * paints its own opaque ground, so text on it is a fixed colour by design and
 * is not a theme bug. Alpha fills like `bg-red-500/10` do not count: those let
 * the page through.
 */
const SOLID_FILL =
  /(?:^|\s)(?:bg-(?:black|white|slate|zinc|gray|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}(?:\/(?:100|[789]\d))?(?:\s|$)|accent-gradient|bg-linear-to|bg-gradient-to)/;

function offenders(cls: string): string[] {
  if (SOLID_FILL.test(cls)) return [];
  const toks = cls.split(" ").filter(Boolean);
  const hasDark = (prop: string) => toks.some((t) => t.startsWith("dark:") && t.includes(prop));
  const bad: string[] = [];

  for (const t of toks) {
    if (t.startsWith("dark:")) continue;
    const base = t.slice(t.lastIndexOf(":") + 1);
    if (/^text-white$/.test(base) && !hasDark("text-")) bad.push(t);
    else if (/^text-slate-[3-7]00$/.test(base) && !hasDark("text-")) bad.push(t);
    else if (/^bg-white\/[\d.[\]]+$/.test(base) && !hasDark("bg-")) bad.push(t);
    else if (/^border-white\/[\d.[\]]+$/.test(base) && !hasDark("border-")) bad.push(t);
  }
  return bad;
}

describe("light mode", () => {
  it("no product component uses a dark-only colour without a light counterpart", () => {
    const found: string[] = [];

    for (const file of productFiles()) {
      const src = readFileSync(file, "utf8");
      CLASS.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = CLASS.exec(src)) !== null) {
        const cls = m[1];
        if (!cls.includes("-")) continue;
        const bad = offenders(cls);
        if (bad.length) {
          const line = src.slice(0, m.index).split("\n").length;
          found.push(`${file}:${line} → ${bad.join(" ")}`);
        }
      }
    }

    expect(found).toEqual([]);
  });
});
