/**
 * "מה חדש" placement and plumbing (owner decision, 2026-09-02, spec section D):
 * one line UNDER the "הידעת?" banner, in the same slot, never a ticker at the
 * top of the page; fed by the announcements table with public read of live
 * rows only and admin writes; reachable from the admin nav and /whats-new.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (rel: string) => readFileSync(path.resolve(__dirname, "../..", rel), "utf8");

describe("what's new line", () => {
  it("renders below DidYouKnowBanner, inside the same reserved slot", () => {
    const src = read("components/features/home/HomeViewChrome.tsx");
    const didYouKnow = src.indexOf("<DidYouKnowBanner />");
    const whatsNew = src.indexOf("<WhatsNewBanner");
    expect(didYouKnow).toBeGreaterThan(-1);
    expect(whatsNew).toBeGreaterThan(didYouKnow);
    // Both live under the same guard: never while a result is on screen.
    const guard = src.lastIndexOf("!hasCompletion && !isLoading", whatsNew);
    expect(guard).toBeGreaterThan(-1);
    expect(src.slice(guard, whatsNew)).not.toContain("</div>\n        )}");
  });

  it("dismisses per note in localStorage and respects reduced motion", () => {
    const src = read("components/ui/WhatsNewBanner.tsx");
    expect(src).toContain("localStorage");
    expect(src).toContain("motion-reduce:transition-none");
    expect(src).toContain('role="status"');
    expect(src).not.toMatch(/animate-marquee|marquee|overflow-x-scroll/);
  });

  it("the table is public for live rows only and admin for writes", () => {
    const sql = readFileSync(
      path.resolve(__dirname, "../../../supabase/migrations/20260902200000_announcements.sql"),
      "utf8",
    );
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toMatch(
      /FOR SELECT TO anon, authenticated[\s\S]*is_active = true[\s\S]*starts_at <= now\(\)/,
    );
    expect(sql).toMatch(/FOR ALL TO authenticated[\s\S]*public\.is_admin\(\)/);
  });

  it("is reachable from the admin nav and the sitemap", () => {
    expect(read("components/admin/AdminLayout.tsx")).toContain('href: "/admin/whats-new"');
    expect(read("app/sitemap.ts")).toContain("/whats-new");
  });
});
