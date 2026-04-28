/**
 * Tests for GET /api/admin/dashboard
 *
 * Covers:
 * 1. Cached path  — no ?refresh=1: redis.get is called, redis.set is NOT called
 *    when the cache returns a non-null value.
 * 2. Refresh path — ?refresh=1: redis.get is skipped, redis.set IS called and
 *    the response payload includes authProfileMismatch from the RPC.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock @/lib/redis ────────────────────────────────────────────────────────
// Use vi.hoisted so the spy references are available inside the vi.mock factory
// (vi.mock factories are hoisted to the top of the file by Vitest).

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

// ─── Mock @/lib/supabase/service ─────────────────────────────────────────────

// A chainable query builder that resolves to { count: 0, data: [], error: null }
function makeQuery() {
  const q: Record<string, unknown> = {};
  const chain = () => q;
  q.select = chain;
  q.neq = chain;
  q.eq = chain;
  q.gte = chain;
  q.lte = chain;
  q.order = chain;
  q.limit = chain;
  q.head = chain;
  // Make it thenable so await works
  q.then = (resolve: (v: unknown) => void) =>
    Promise.resolve({ count: 0, data: [], error: null }).then(resolve);
  return q;
}

const rpcMock = vi.fn().mockResolvedValue({
  data: [{ auth_count: 97, profile_count: 96, missing: 1 }],
  error: null,
});

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => makeQuery(),
    rpc: rpcMock,
  }),
}));

// ─── Mock @/lib/admin/admin-security (used internally by withAdmin) ───────────

vi.mock("@/lib/admin/admin-security", () => ({
  validateAdminSession: vi.fn().mockResolvedValue({
    error: null,
    supabase: {},
    user: { id: "admin-user-id" },
  }),
}));

// ─── Mock @/lib/logger (suppress console noise) ──────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ─── Import route under test (after mocks are established) ───────────────────

// We import the raw handler and call it directly with our own Request, so we
// bypass the withAdmin wrapping by having validateAdminSession always succeed.
import { GET } from "../route";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/admin/dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-apply the RPC default after clearAllMocks
    rpcMock.mockResolvedValue({
      data: [{ auth_count: 97, profile_count: 96, missing: 1 }],
      error: null,
    });
  });

  it("returns cached payload and does NOT call redis.set when cache hit", async () => {
    const cachedPayload = {
      totalUsers: 42,
      fromCache: true,
      generatedAt: "2026-01-01T00:00:00.000Z",
    };
    redisGet.mockResolvedValue(cachedPayload);

    const req = new NextRequest("http://localhost:3000/api/admin/dashboard");
    const res = await GET(req, undefined as never);

    // redis.get must have been called
    expect(redisGet).toHaveBeenCalledTimes(1);
    expect(redisGet).toHaveBeenCalledWith("admin:dashboard:v1");

    // redis.set must NOT have been called (we returned early from cache)
    expect(redisSet).not.toHaveBeenCalled();

    // Response body should be the cached payload
    const json = await res.json();
    expect(json).toEqual(cachedPayload);
  });

  it("skips redis.get, calls redis.set, and includes authProfileMismatch when ?refresh=1", async () => {
    redisGet.mockResolvedValue(null); // should not be reached

    const req = new NextRequest(
      "http://localhost:3000/api/admin/dashboard?refresh=1"
    );
    const res = await GET(req, undefined as never);

    // redis.get must NOT have been called (skipCache = true)
    expect(redisGet).not.toHaveBeenCalled();

    // redis.set must have been called once to persist the fresh payload
    expect(redisSet).toHaveBeenCalledTimes(1);

    // Response must include the authProfileMismatch block populated by the RPC
    const json = await res.json();
    expect(json.authProfileMismatch).toEqual({
      authCount: 97,
      profileCount: 96,
      missing: 1,
    });

    // Basic sanity: generatedAt should be present
    expect(typeof json.generatedAt).toBe("string");
  });
});
