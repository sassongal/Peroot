/**
 * No new inline locale formatting.
 *
 * The sweep that unified 45 files only stays unified if the next inline
 * `toLocaleDateString("en-US")` fails here rather than shipping. The few
 * legitimate uses are listed by name with the reason they are legitimate.
 */
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";

/** Calls that are NOT display formatting, and must stay as they are. */
const ALLOWED = new Set([
  // Builds a YYYY-MM-DD key in Israel time for the daily-quota reset. Changing
  // the locale here changes the key shape and silently resets everyone's quota.
  "src/hooks/usePromptLimits.ts",
  // Same trick: converts "now" into Israel time before slicing a date key.
  "src/app/api/stats/today/route.ts",
  // Renders each template in the locale that template declares.
  "src/components/admin/tabs/SystemPromptsTab.tsx",
  // react-pdf export, deliberately spelled-out Hebrew month.
  "src/lib/export/PromptPdfDocument.tsx",
]);

function grep(pattern: string): string[] {
  try {
    const out = execFileSync(
      "grep",
      ["-rl", "-E", pattern, "--include=*.ts", "--include=*.tsx", "src"],
      { encoding: "utf8" },
    );
    return out.split("\n").filter(Boolean);
  } catch {
    return []; // grep exits 1 when nothing matches
  }
}

describe("locale formatting", () => {
  it("no display formatting uses en-US", () => {
    const offenders = grep('toLocale(Date|Time)?String\\("en-US"').filter(
      // src/lib/dates is the module that documents this rule, so its own
      // comments quote the pattern.
      (f) => !ALLOWED.has(f) && !f.includes("__tests__") && !f.includes("src/lib/dates/"),
    );
    expect(offenders).toEqual([]);
  });

  it("no bare toLocaleString() follows the viewer's browser locale", () => {
    const offenders = grep("\\.toLocaleString\\(\\)").filter(
      (f) => !ALLOWED.has(f) && !f.includes("__tests__") && !f.includes("src/lib/dates/"),
    );
    expect(offenders).toEqual([]);
  });
});
