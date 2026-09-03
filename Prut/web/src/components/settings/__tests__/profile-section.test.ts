/**
 * The settings profile after the 2026-09-02 rework: one place to choose the
 * preferred output language (the same control as the home page, persisted to
 * the profile), no duplicated counters, credits under billing.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("settings profile", () => {
  it("reuses the home page's language picker and saves to the profile", () => {
    const section = read("src/components/settings/SettingsProfileSection.tsx");
    expect(section).toContain("OutputLanguagePicker");
    const page = read("src/app/settings/page.tsx");
    expect(page).toMatch(/\.update\(\{ preferred_output_language: next \}\)/);
    expect(page).toContain("OUTPUT_LANGUAGE_STORAGE_KEY");
  });

  it("one language state feeds both the profile and the referral invitation", () => {
    const page = read("src/app/settings/page.tsx");
    expect(page).not.toContain("shareLanguage");
    expect(page).toContain("language={preferredLanguage}");
    expect(page).toContain("preferredLanguage={preferredLanguage}");
  });

  it("credits live under billing, and old ?tab=credits links still land there", () => {
    const page = read("src/app/settings/page.tsx");
    expect(page).not.toMatch(/id: "credits"/);
    expect(page).toContain('tab === "credits" ? "billing"');
    expect(page).toMatch(/activeSection === "billing"[\s\S]*<CreditsPanel \/>/);
  });

  it("the profile no longer repeats the counters from the stats tab", () => {
    const section = read("src/components/settings/SettingsProfileSection.tsx");
    expect(section).not.toContain("historyLength");
    expect(section).not.toContain("favoritesLength");
  });

  it("every control is a 44px target on a phone", () => {
    const section = read("src/components/settings/SettingsProfileSection.tsx");
    expect(section).toContain("min-h-[44px]");
    expect(section).not.toMatch(/[–—]/);
  });
});
