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
  in: (col: string, values: unknown) => {
    calls.push(["in", `${col}:${JSON.stringify(values)}`]);
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

function makeReq(url: string) {
  return { nextUrl: new URL(url) } as unknown as import("next/server").NextRequest;
}

describe("GET /api/announcements", () => {
  it("reads live rows as anon, highest priority first, and caches for an hour", async () => {
    const { GET, revalidate } = await import("../route");
    const res = await GET(makeReq("https://peroot.space/api/announcements"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(rows);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=3600");
    expect(revalidate).toBe(3600);
    expect(calls).toContainEqual(["from", "announcements"]);
    // No viewer param → guest audience filter, server-side.
    expect(calls[2]).toEqual(["in", 'audience:["all","guests"]']);
    expect(calls[3]).toEqual(["order", 'priority:{"ascending":false}']);
    expect(calls[4]).toEqual(["order", 'starts_at:{"ascending":false}']);
    expect(calls[5]).toEqual(["limit", 5]);
  });

  it("audience-restricted notes never ship to the wrong viewer", async () => {
    const { GET } = await import("../route");
    calls.length = 0;
    await GET(makeReq("https://peroot.space/api/announcements?viewer=pro"));
    expect(calls[2]).toEqual(["in", 'audience:["all","users","pro"]']);
    calls.length = 0;
    await GET(makeReq("https://peroot.space/api/announcements?viewer=user"));
    expect(calls[2]).toEqual(["in", 'audience:["all","users"]']);
    calls.length = 0;
    // Garbage viewer values degrade to guest, never to a wider audience.
    await GET(makeReq("https://peroot.space/api/announcements?viewer=admin"));
    expect(calls[2]).toEqual(["in", 'audience:["all","guests"]']);
  });
});
