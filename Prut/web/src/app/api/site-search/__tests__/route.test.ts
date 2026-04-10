import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: () => mockGetUser(),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  })),
}));

const mockCheckRateLimit = vi.fn().mockResolvedValue({
  success: true,
  limit: 30,
  remaining: 29,
  reset: Date.now() + 60000,
});

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

function chainBuilder(result: { data: unknown; error?: unknown }) {
  const b: Record<string, unknown> = {};
  const methods = ["select", "eq", "or", "order", "limit"];
  for (const m of methods) {
    b[m] = vi.fn().mockReturnValue(b);
  }
  b.then = (resolve: (v: unknown) => void) => {
    resolve(result);
    return Promise.resolve(result);
  };
  return b;
}

describe("GET /api/site-search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 30,
      remaining: 29,
      reset: Date.now() + 60000,
    });
  });

  it("returns empty for short query", async () => {
    const req = new NextRequest("http://localhost/api/site-search?q=a");
    const res = await GET(req);
    const json = await res.json();
    expect(json.results).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });

  it("does not apply rate limit when sanitization yields empty query", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = new NextRequest("http://localhost/api/site-search?q=...");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.results).toEqual([]);
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });

  it("guest: returns blog-only payload with guestRestricted", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "blog_posts") {
        return chainBuilder({
          data: [
            {
              slug: "test-post",
              title: "מאמר בדיקה",
              excerpt: "תקציר",
              category: "טיפים",
            },
          ],
        });
      }
      return chainBuilder({ data: [] });
    });

    const req = new NextRequest("http://localhost/api/site-search?q=מאמר");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.guestRestricted).toBe(true);
    expect(json.loginCta).toBeTruthy();
    expect(json.results).toHaveLength(1);
    expect(json.results[0].source).toBe("blog");
    expect(json.results[0].href).toBe("/blog/test-post");
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      success: false,
      limit: 30,
      remaining: 0,
      reset: Date.now() + 5000,
    });
    const req = new NextRequest("http://localhost/api/site-search?q=hello");
    const res = await GET(req);
    expect(res.status).toBe(429);
  });

  it("authenticated: merges multiple sources", async () => {
    const userId = "00000000-0000-0000-0000-000000000001";
    mockGetUser.mockResolvedValue({
      data: { user: { id: userId } },
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "blog_posts") {
        return chainBuilder({
          data: [{ slug: "b1", title: "בלוג", excerpt: null, category: null }],
        });
      }
      if (table === "prompt_favorites") {
        return chainBuilder({ data: [] });
      }
      if (table === "public_library_prompts") {
        return chainBuilder({
          data: [
            {
              id: "pub-1",
              title: "פרומפט ציבורי",
              use_case: "בדיקה",
              prompt: "טקסט",
              category_id: null,
            },
          ],
        });
      }
      if (table === "personal_library") {
        return chainBuilder({
          data: [{ id: "per-1", title: "אישי", use_case: "שימוש" }],
        });
      }
      return chainBuilder({ data: [] });
    });

    const req = new NextRequest("http://localhost/api/site-search?q=בדיקה");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.guestRestricted).toBe(false);
    expect(json.results.length).toBeGreaterThanOrEqual(3);
    const sources = json.results.map((r: { source: string }) => r.source);
    expect(sources).toContain("blog");
    expect(sources).toContain("public_prompt");
    expect(sources).toContain("personal");
  });
});
