import { describe, it, expect, vi } from "vitest";

// Admins bypass the credit gate on enhance, so quota must report unlimited
// (credits_remaining: null) — a finite number here misled the owner into
// thinking an admin account was nearly out of credits.
const { mockSingle } = vi.hoisted(() => ({ mockSingle: vi.fn() }));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ single: mockSingle }) }) }),
  }),
}));
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));

import { connectQuota } from "@/lib/connect/ops";

describe("connectQuota, admin", () => {
  it("reports unlimited (null) for admin tier regardless of balance", async () => {
    mockSingle.mockResolvedValue({ data: { plan_tier: "admin", credits_balance: 6 }, error: null });
    const q = await connectQuota("admin-user");
    expect(q).toEqual({ tier: "admin", credits_remaining: null, quota_resets_at: null });
  });

  it("still reports the finite balance for free tier", async () => {
    mockSingle.mockResolvedValue({ data: { plan_tier: "free", credits_balance: 1 }, error: null });
    const q = await connectQuota("free-user");
    expect(q.credits_remaining).toBe(1);
  });
});
