/**
 * Bundled refresh-bypass tests for four admin endpoints:
 *   - GET /api/admin/analytics
 *   - GET /api/admin/costs
 *   - GET /api/admin/funnel
 *   - GET /api/admin/revenue
 *
 * Each describe block verifies:
 *   1. Cached path  — no ?refresh=1: redis.get is called and we return early
 *      (redis.set is NOT called when cache hits).
 *   2. Refresh path — ?refresh=1: redis.get is skipped, redis.set IS called.
 *
 * Pattern mirrors src/app/api/admin/dashboard/__tests__/refresh-bypass.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Shared Redis mock ────────────────────────────────────────────────────────

const { redisGet, redisSet } = vi.hoisted(() => ({
  redisGet: vi.fn(),
  redisSet: vi.fn(),
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    get: redisGet,
    set: redisSet,
  },
}));

// ─── Chainable Supabase query builder ────────────────────────────────────────

function makeQuery() {
  const q: Record<string, unknown> = {};
  const chain = () => q;
  q.select = chain;
  q.neq = chain;
  q.eq = chain;
  q.in = chain;
  q.gte = chain;
  q.lte = chain;
  q.or = chain;
  q.order = chain;
  q.limit = chain;
  q.head = chain;
  q.then = (resolve: (v: unknown) => void) =>
    Promise.resolve({ count: 0, data: [], error: null }).then(resolve);
  return q;
}

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => makeQuery(),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    auth: {
      admin: {
        updateUserById: vi.fn().mockResolvedValue({ error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    },
  }),
}));

// ─── admin-security mock (used by withAdmin and revenue's validateAdminSession) ─

vi.mock("@/lib/admin/admin-security", () => ({
  validateAdminSession: vi.fn().mockResolvedValue({
    error: null,
    supabase: {
      from: () => makeQuery(),
      auth: {
        admin: {
          updateUserById: vi.fn().mockResolvedValue({ error: null }),
          signOut: vi.fn().mockResolvedValue({ error: null }),
        },
      },
    },
    user: { id: "admin-user-id" },
  }),
  logAdminAction: vi.fn().mockResolvedValue(undefined),
  parseAdminInput: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Revenue uses @lemonsqueezy/lemonsqueezy.js — stub it out
vi.mock("@lemonsqueezy/lemonsqueezy.js", () => ({
  lemonSqueezySetup: vi.fn(),
  listSubscriptions: vi.fn().mockResolvedValue({ data: { data: [] } }),
}));

// ─── Analytics ───────────────────────────────────────────────────────────────

import { GET as analyticsGET } from "../analytics/route";

describe("GET /api/admin/analytics", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns cached payload and does NOT call redis.set on cache hit", async () => {
    const cached = { engineBreakdown: [], dau: 1, wau: 2, mau: 3, generatedAt: "x" };
    redisGet.mockResolvedValue(cached);

    const req = new NextRequest("http://localhost:3000/api/admin/analytics");
    const res = await analyticsGET(req, undefined as never);

    expect(redisGet).toHaveBeenCalledTimes(1);
    expect(redisSet).not.toHaveBeenCalled();
    const json = await res.json();
    expect(json).toEqual(cached);
  });

  it("skips redis.get and calls redis.set when ?refresh=1", async () => {
    redisGet.mockResolvedValue(null);
    redisSet.mockResolvedValue("OK");

    const req = new NextRequest("http://localhost:3000/api/admin/analytics?refresh=1");
    const res = await analyticsGET(req, undefined as never);

    expect(redisGet).not.toHaveBeenCalled();
    expect(redisSet).toHaveBeenCalledTimes(1);
    const json = await res.json();
    expect(typeof json.generatedAt).toBe("string");
  });
});

// ─── Costs ───────────────────────────────────────────────────────────────────

import { GET as costsGET } from "../costs/route";

describe("GET /api/admin/costs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns cached payload and does NOT call redis.set on cache hit", async () => {
    const cached = { summary: {}, byProvider: [], byUser: [], monthly: [], truncated: false };
    redisGet.mockResolvedValue(cached);

    const req = new NextRequest("http://localhost:3000/api/admin/costs");
    const res = await costsGET(req, undefined as never);

    expect(redisGet).toHaveBeenCalledTimes(1);
    expect(redisSet).not.toHaveBeenCalled();
    const json = await res.json();
    expect(json).toEqual(cached);
  });

  it("skips redis.get and calls redis.set when ?refresh=1", async () => {
    redisGet.mockResolvedValue(null);
    redisSet.mockResolvedValue("OK");

    const req = new NextRequest("http://localhost:3000/api/admin/costs?refresh=1");
    const res = await costsGET(req, undefined as never);

    expect(redisGet).not.toHaveBeenCalled();
    expect(redisSet).toHaveBeenCalledTimes(1);
    const json = await res.json();
    expect(json).toHaveProperty("summary");
  });
});

// ─── Funnel ───────────────────────────────────────────────────────────────────

import { GET as funnelGET } from "../funnel/route";

describe("GET /api/admin/funnel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns cached payload and does NOT call redis.set on cache hit", async () => {
    const cached = { stages: [], timeRange: "all", generatedAt: "x" };
    redisGet.mockResolvedValue(cached);

    const req = new NextRequest("http://localhost:3000/api/admin/funnel");
    const res = await funnelGET(req, undefined as never);

    expect(redisGet).toHaveBeenCalledTimes(1);
    expect(redisSet).not.toHaveBeenCalled();
    const json = await res.json();
    expect(json).toEqual(cached);
  });

  it("skips redis.get and calls redis.set when ?refresh=1", async () => {
    redisGet.mockResolvedValue(null);
    redisSet.mockResolvedValue("OK");

    const req = new NextRequest("http://localhost:3000/api/admin/funnel?refresh=1");
    const res = await funnelGET(req, undefined as never);

    expect(redisGet).not.toHaveBeenCalled();
    expect(redisSet).toHaveBeenCalledTimes(1);
    const json = await res.json();
    expect(json).toHaveProperty("stages");
    expect(typeof json.generatedAt).toBe("string");
  });
});

// ─── Revenue ─────────────────────────────────────────────────────────────────

import { GET as revenueGET } from "../revenue/route";

describe("GET /api/admin/revenue", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns cached payload and does NOT call redis.set on cache hit", async () => {
    const cached = { kpi: {}, monthly: [], timestamp: "x" };
    // Revenue checks PAYLOAD_CACHE_KEY first — return it on first redis.get call.
    redisGet.mockResolvedValue(cached);

    const req = new NextRequest("http://localhost:3000/api/admin/revenue");
    const res = await revenueGET(req);

    expect(redisGet).toHaveBeenCalledTimes(1);
    expect(redisSet).not.toHaveBeenCalled();
    const json = await res.json();
    expect(json).toEqual(cached);
  });

  it("skips redis.get and calls redis.set when ?refresh=1", async () => {
    // With skipCache=true both PAYLOAD_CACHE_KEY and LS_MRR_CACHE_KEY are skipped.
    redisGet.mockResolvedValue(null);
    redisSet.mockResolvedValue("OK");

    const req = new NextRequest("http://localhost:3000/api/admin/revenue?refresh=1");
    const res = await revenueGET(req);

    expect(redisGet).not.toHaveBeenCalled();
    // redis.set is called at minimum for the payload (LS MRR set may not fire if
    // LEMONSQUEEZY_API_KEY is absent in test env — so check >= 1).
    expect(redisSet.mock.calls.length).toBeGreaterThanOrEqual(1);
    const json = await res.json();
    expect(json).toHaveProperty("kpi");
  });
});
