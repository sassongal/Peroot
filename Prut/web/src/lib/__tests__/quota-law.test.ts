/**
 * Enforces the project quota law (CLAUDE.md):
 *
 *   1. A daily quota number is never written into user-facing copy.
 *   2. A quota fallback is never invented at a call site; it comes from
 *      `quota-policy.ts`.
 *
 * Without this test the law is a sentence in a document, and it has already
 * failed that way once: the free allowance moved to 1/day while the onboarding
 * overlay, the guest banner, the FAQ and the pricing page went on advertising
 * their own different numbers, none of which matched the database. A grep is
 * the only thing that notices.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import {
  QUOTA_FALLBACK,
  resolveDailyLimit,
  creditsPhrase,
  enhancementsPhrase,
  dailyEnhancementsPhrase,
} from "../quota-policy";

const SRC = join(__dirname, "..", "..");

/** The one module allowed to name a quota number. */
const POLICY_MODULE = "lib/quota-policy.ts";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry) && !full.includes("__tests__")) out.push(full);
  }
  return out;
}

const FILES = walk(SRC).map((f) => ({ path: f, rel: relative(SRC, f).replace(/\\/g, "/") }));

describe("quota law", () => {
  it("scans a meaningful number of source files", () => {
    // Guard against the walk silently matching nothing and the suite passing
    // vacuously, which is the classic way a lint-style test stops working.
    expect(FILES.length).toBeGreaterThan(300);
  });

  it("no daily quota number is written into user-facing copy", () => {
    // Hebrew phrasings that state an allowance per day. The digit form and the
    // spelled-out form are both covered: "2 שיפורים ביום" and "קרדיט אחד ליום"
    // are the same mistake.
    const patterns: RegExp[] = [
      /\d+\s*(קרדיטים|קרדיט|שיפורים|שיפור|שדרוגים|שדרוג|פרומפטים|פרומפט)\s*(ביום|ליום)/,
      /(קרדיט|שיפור|שדרוג)\s+אחד\s+(ביום|ליום)/,
      /(שני|שתי)\s+(קרדיטים|שיפורים|שדרוגים)\s+(ביום|ליום)/,
      /\d+\s*(ליום|ביום)\s*(\)|,|\.|"|')/,
    ];

    const offenders: string[] = [];
    for (const { path, rel } of FILES) {
      if (rel === POLICY_MODULE) continue;
      const lines = readFileSync(path, "utf8").split("\n");
      lines.forEach((line, i) => {
        // Comments are not user-facing; the law is about rendered copy.
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
        // A line that interpolates from the policy module is the correct form.
        if (/creditsPhrase|enhancementsPhrase|freeDaily|guestDaily|dailyLimit/.test(line)) return;
        if (patterns.some((p) => p.test(line))) offenders.push(`${rel}:${i + 1}  ${line.trim()}`);
      });
    }

    expect(
      offenders,
      `Quota numbers must come from site_settings, not from copy.\nUse creditsPhrase()/enhancementsPhrase() from lib/quota-policy.ts.\n\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("no quota fallback is invented outside the policy module", () => {
    // `settings?.daily_free_limit ?? 2` at a call site is how eight routes
    // ended up disagreeing about the free allowance.
    const pattern = /(daily_free_limit|guest_daily_limit|dailyLimit|daily_limit)\s*\?\?\s*\d+/;

    const offenders: string[] = [];
    for (const { path, rel } of FILES) {
      if (rel === POLICY_MODULE) continue;
      readFileSync(path, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (pattern.test(line)) offenders.push(`${rel}:${i + 1}  ${line.trim()}`);
        });
    }

    expect(
      offenders,
      `Use resolveDailyLimit(value, QUOTA_FALLBACK.freeDaily) from lib/quota-policy.ts.\n\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("the guest limit is not a compiled-in constant", () => {
    const guestService = readFileSync(join(SRC, "lib", "guest-service.ts"), "utf8");
    expect(guestService).not.toMatch(/const\s+GUEST_DAILY_LIMIT\s*=\s*\d+/);
    expect(guestService).toContain("guest_daily_limit");
  });
});

describe("quota policy values", () => {
  it("pins the owner's decision: guest 1/day, registered free 2/day", () => {
    // These are the fallbacks; the live values live in site_settings and are
    // asserted against production separately. If the owner changes the policy,
    // this test is the deliberate place to record it.
    expect(QUOTA_FALLBACK.guestDaily).toBe(1);
    expect(QUOTA_FALLBACK.freeDaily).toBe(2);
    expect(QUOTA_FALLBACK.freeDaily).toBeGreaterThan(QUOTA_FALLBACK.guestDaily);
  });

  it("never lets an unusable setting become a real quota", () => {
    for (const bad of [null, undefined, "", "abc", NaN, -1, {}, []]) {
      expect(resolveDailyLimit(bad, 2)).toBe(2);
    }
    // Zero is a legitimate value: it is how an admin closes the free tier.
    expect(resolveDailyLimit(0, 2)).toBe(0);
    expect(resolveDailyLimit("3", 2)).toBe(3);
    expect(resolveDailyLimit(2.9, 1)).toBe(2);
  });

  it("inflects Hebrew quota copy correctly", () => {
    expect(creditsPhrase(1)).toBe("קרדיט אחד");
    expect(creditsPhrase(2)).toBe("שני קרדיטים");
    expect(creditsPhrase(5)).toBe("5 קרדיטים");
    expect(enhancementsPhrase(1)).toBe("שיפור אחד");
    expect(dailyEnhancementsPhrase(2)).toBe("שני שיפורים ביום");
  });
});
