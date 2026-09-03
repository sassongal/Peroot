import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// style_analysis is the only job type left since achievements were removed.
const analyzeUserStyle = vi.fn().mockResolvedValue({ tokens: [] });
vi.mock("@/lib/intelligence/personality-analyzer", () => ({ analyzeUserStyle }));

const rpc = vi.fn();
const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ rpc, from: () => ({ update }) }),
}));

import { GET } from "@/app/api/jobs/process/route";

function cronReq(secret?: string): Request {
  return new Request("https://www.peroot.space/api/jobs/process", {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
}

const origEnv = process.env;
beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...origEnv, CRON_SECRET: "test-secret" };
});
afterEach(() => {
  process.env = origEnv;
});

describe("jobs worker (batch)", () => {
  it("rejects missing/wrong CRON_SECRET", async () => {
    expect((await GET(cronReq())).status).toBe(401);
    expect((await GET(cronReq("wrong"))).status).toBe(401);
  });

  it("processes MULTIPLE jobs in one invocation until the queue drains", async () => {
    rpc
      // The referral sweep runs first on every invocation.
      .mockResolvedValueOnce({
        data: { activated: 0, granted: 0, mode: "activation" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ j_id: "1", j_type: "style_analysis", j_payload: { userId: "u1" }, j_attempts: 0 }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ j_id: "2", j_type: "style_analysis", j_payload: { userId: "u2" }, j_attempts: 0 }],
        error: null,
      })
      .mockResolvedValueOnce({ data: [], error: null });

    const res = await GET(cronReq("test-secret"));
    const body = await res.json();

    expect(body).toMatchObject({ processed: 2, completed: 2, failed: 0 });
    expect(analyzeUserStyle).toHaveBeenCalledWith("u1");
    expect(analyzeUserStyle).toHaveBeenCalledWith("u2");
    // both jobs marked completed
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: "completed" }));
    expect(update).toHaveBeenCalledTimes(2);
  });

  it("a failing job goes back to pending with backoff, and the loop continues", async () => {
    analyzeUserStyle.mockRejectedValueOnce(new Error("llm down"));
    rpc
      // The referral sweep runs first on every invocation.
      .mockResolvedValueOnce({
        data: { activated: 0, granted: 0, mode: "activation" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ j_id: "1", j_type: "style_analysis", j_payload: { userId: "u1" }, j_attempts: 1 }],
        error: null,
      })
      .mockResolvedValueOnce({ data: [], error: null });

    const res = await GET(cronReq("test-secret"));
    const body = await res.json();

    expect(body).toMatchObject({ processed: 1, completed: 0, failed: 1 });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending", last_error: "llm down" }),
    );
  });

  it("exhausted attempts mark the job failed (no infinite retry)", async () => {
    analyzeUserStyle.mockRejectedValueOnce(new Error("boom"));
    rpc
      // The referral sweep runs first on every invocation.
      .mockResolvedValueOnce({
        data: { activated: 0, granted: 0, mode: "activation" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ j_id: "9", j_type: "style_analysis", j_payload: { userId: "u9" }, j_attempts: 5 }],
        error: null,
      })
      .mockResolvedValueOnce({ data: [], error: null });

    await GET(cronReq("test-secret"));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: "failed" }));
  });
});
