import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const insertMock = vi.fn().mockResolvedValue({ error: null });
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(() => ({ from: () => ({ insert: insertMock }) })),
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn(async () => ({ success: true, limit: 10, remaining: 9, reset: 0 })),
}));

import { POST } from "../route";
import { checkRateLimit } from "@/lib/ratelimit";
import { createClient } from "@/lib/supabase/server";

function mockAuth(userId: string | null) {
  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
    auth: {
      getUser: async () => ({
        data: { user: userId ? { id: userId } : null },
        error: null,
      }),
    },
  });
}

function makeReq(body: unknown) {
  return new Request("http://localhost/api/extension-telemetry", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/extension-telemetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertMock.mockClear();
    insertMock.mockResolvedValue({ error: null });
    mockAuth("u1");
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: 0,
    });
  });

  it("inserts a valid event", async () => {
    const res = await POST(
      makeReq({
        event: "selector_miss",
        site: "chatgpt",
        ext_version: "2.0.0",
        chain_index: -1,
        target_model: "gpt-5",
        latency_ms: 12,
        success: false,
      }),
    );
    expect(res.status).toBe(204);
    expect(insertMock).toHaveBeenCalledTimes(1);
    const row = insertMock.mock.calls[0][0];
    expect(row.event).toBe("selector_miss");
    expect(row.user_id).toBe("u1");
  });

  it("rejects unknown event types with 400", async () => {
    const res = await POST(makeReq({ event: "haxx" }));
    expect(res.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns 429 on rate limit", async () => {
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      success: false,
      limit: 10,
      remaining: 0,
      reset: 60,
    });
    const res = await POST(makeReq({ event: "chip_click", site: "claude" }));
    expect(res.status).toBe(429);
  });

  it("returns 401 for unauthenticated", async () => {
    mockAuth(null);
    const res = await POST(makeReq({ event: "chip_click" }));
    expect(res.status).toBe(401);
  });
});
