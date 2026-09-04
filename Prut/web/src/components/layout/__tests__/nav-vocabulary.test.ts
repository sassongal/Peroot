/**
 * One word per surface (owner decision 2026-09-04).
 *
 * The public catalogue at /prompts used to carry two names in the same bar:
 * the app-bar item said "ספרייה" and the site link said "פרומפטים", and both
 * went to the same place. The vocabulary is now fixed everywhere a human sees
 * it: "פרומפטים" = the catalogue, "הספרייה שלי" = the user's saved prompts,
 * "תבניות" = only prompts with {משתנים}. This test reads the three nav
 * components as text and fails on a relapse.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const LAYOUT = path.resolve(__dirname, "..");
const read = (file: string) => readFileSync(path.join(LAYOUT, file), "utf8");

const NAV_FILES = ["TopNavBar.tsx", "MobileTabBar.tsx", "PublicNavBar.tsx"];

/** Every `label: "..."` string literal in a file. */
function labels(src: string): string[] {
  return [...src.matchAll(/label:\s*"([^"]*)"/g)].map((m) => m[1]);
}

describe("nav vocabulary", () => {
  it.each(NAV_FILES)("%s has no nav label that says ספרייה or ספרייה אישית", (file) => {
    const found = labels(read(file));
    expect(found.length).toBeGreaterThan(0);
    const offenders = found.filter((l) => l === "ספרייה" || l === "ספרייה אישית");
    expect(offenders, `${file}: ${offenders.join(", ")}`).toEqual([]);
  });

  it.each(NAV_FILES)("%s labels spell the library with two yods and carry no dashes", (file) => {
    for (const label of labels(read(file))) {
      expect(label, `${file}: ${label}`).not.toMatch(/ספריה/);
      expect(label, `${file}: ${label}`).not.toMatch(/[\u2013\u2014]/);
    }
  });

  it("TopNavBar lists /prompts at most once across its link and nav arrays", () => {
    const src = read("TopNavBar.tsx");
    const hits = src.match(/href:\s*"\/prompts"/g) ?? [];
    expect(hits.length).toBeLessThanOrEqual(1);
  });

  it("the catalogue is called פרומפטים in the app bar and the phone tab bar", () => {
    expect(labels(read("TopNavBar.tsx"))).toContain("פרומפטים");
    expect(labels(read("MobileTabBar.tsx"))).toContain("פרומפטים");
    expect(labels(read("PublicNavBar.tsx"))).toContain("פרומפטים");
  });

  it("the saved prompts are called הספרייה שלי in the app bar", () => {
    expect(labels(read("TopNavBar.tsx"))).toContain("הספרייה שלי");
    expect(read("PublicNavBar.tsx")).toContain("הספרייה שלי");
  });
});
