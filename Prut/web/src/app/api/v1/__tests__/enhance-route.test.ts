import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/lib/connect/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/connect/auth")>();
  return {
    ...actual,
    authenticateConnect: (...a: unknown[]) => mockAuth(...a),
    logConnectUsage: vi.fn(),
  };
});

const mockEnhance = vi.fn();
vi.mock("@/lib/connect/ops", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/connect/ops")>();
  return { ...actual, connectEnhance: (...a: unknown[]) => mockEnhance(...a) };
});

const { redisGet, redisSet, mockRefund } = vi.hoisted(() => ({
  redisGet: vi.fn(),
  redisSet: vi.fn(),
  mockRefund: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/lib/redis", () => ({ redis: { get: redisGet, set: redisSet } }));
vi.mock("@/lib/services/credit-service", () => ({
  refundCredit: (...a: unknown[]) => mockRefund(...a),
}));

import { POST } from "@/app/api/v1/enhance/route";

const RESULT = {
  enhanced_prompt: "משודרג",
  title: null,
  mode: "STANDARD",
  cache_hit: false,
  credits_remaining: 5,
  quota_resets_at: null,
};

function reqWith(headers: Record<string, string> = {}): Request {
  return new Request("https://www.peroot.space/api/v1/enhance", {
    method: "POST",
    headers: {
      authorization: "Bearer prk_live_" + "a".repeat(40),
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify({ prompt: "שפר לי" }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: "u1", keyId: "k1", kind: "key" });
  mockEnhance.mockResolvedValue(RESULT);
  redisGet.mockResolvedValue(null);
});

describe("/api/v1/enhance hardening", () => {
  it("caches the result under Idempotency-Key and replays it without re-running", async () => {
    const first = await POST(reqWith({ "Idempotency-Key": "retry-123" }));
    expect(first.status).toBe(200);
    expect(redisSet).toHaveBeenCalledWith(
      expect.stringMatching(/^connect:idem:u1:[0-9a-f]{64}$/),
      RESULT,
      { ex: 900 },
    );

    redisGet.mockResolvedValueOnce(RESULT);
    const replay = await POST(reqWith({ "Idempotency-Key": "retry-123" }));
    const body = await replay.json();
    expect(body.idempotent_replay).toBe(true);
    expect(body.enhanced_prompt).toBe("משודרג");
    expect(mockEnhance).toHaveBeenCalledTimes(1); // second call never hit the pipeline
  });

  it("works without the header and skips the cache entirely", async () => {
    const res = await POST(reqWith());
    expect(res.status).toBe(200);
    expect(redisGet).not.toHaveBeenCalled();
    expect(redisSet).not.toHaveBeenCalled();
  });

  it("a redis failure degrades gracefully (still enhances)", async () => {
    redisGet.mockRejectedValueOnce(new Error("redis down"));
    const res = await POST(reqWith({ "Idempotency-Key": "x" }));
    expect(res.status).toBe(200);
    expect(mockEnhance).toHaveBeenCalledTimes(1);
  });

  it("hard-stops a hung pipeline with 504 timeout and refunds the credit", async () => {
    vi.useFakeTimers();
    try {
      mockEnhance.mockImplementation(() => new Promise(() => {})); // never resolves
      const pending = POST(reqWith());
      await vi.advanceTimersByTimeAsync(55_001);
      const res = await pending;
      expect(res.status).toBe(504);
      const body = await res.json();
      expect(body.code).toBe("timeout");
      expect(mockRefund).toHaveBeenCalledWith("u1", 1, "auto");
    } finally {
      vi.useRealTimers();
    }
  });
});
