/**
 * GET /api/announcements: the "מה חדש" feed. Read as the anonymous role so
 * the CDN can cache it, ordered by priority then recency, and never more
 * than a handful of rows.
 */
import { describe, it, expect, vi } from "vitest";

const rows = [
  {
    id: "a",
    title: "ראשון",
    body: "",
    href: null,
    href_label: null,
    audience: "all",
    lang: "he",
    starts_at: "2026-09-02T00:00:00Z",
  },
];
const calls: Array<[string, unknown]> = [];
const query = {
  select: (cols: string) => {
    calls.push(["select", cols]);
    return query;
  },
  order: (col: string, opts: unknown) => {
    calls.push(["order", `${col}:${JSON.stringify(opts)}`]);
    return query;
  },
  limit: async (n: number) => {
    calls.push(["limit", n]);
    return { data: rows, error: null };
  },
};

vi.mock("@/lib/supabase/anon", () => ({
  createAnonClient: () => ({ from: (table: string) => (calls.push(["from", table]), query) }),
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

describe("GET /api/announcements", () => {
  it("reads live rows as anon, highest priority first, and caches for an hour", async () => {
    const { GET, revalidate } = await import("../route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(rows);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=3600");
    expect(revalidate).toBe(3600);
    expect(calls).toContainEqual(["from", "announcements"]);
    expect(calls[2]).toEqual(["order", 'priority:{"ascending":false}']);
    expect(calls[3]).toEqual(["order", 'starts_at:{"ascending":false}']);
    expect(calls[4]).toEqual(["limit", 5]);
  });
});
