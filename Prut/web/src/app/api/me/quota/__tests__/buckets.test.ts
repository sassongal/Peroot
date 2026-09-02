/**
 * The quota endpoint reports both buckets (owner decision, 2026-09-02).
 *
 * The daily allowance is a ceiling that resets; the referral bonus is a
 * separate wallet that expires. The pill shows them apart ("2 today + 3
 * bonus") and the gate looks at the sum, so the endpoint has to return both
 * numbers and their sum, and has to treat an expired bonus as zero so no UI
 * ever promises a credit the RPC will refuse.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const settingsRow = { daily_free_limit: 2 };
let profileRow: Record<string, unknown> = {};

vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/services/credit-service", () => ({ getRefreshAt: async () => null }));

const db = {
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null }) }),
        maybeSingle: async () => ({ data: table === "profiles" ? profileRow : null }),
      }),
      maybeSingle: async () => ({ data: table === "site_settings" ? settingsRow : null }),
    }),
  }),
};

vi.mock("@/lib/api-middleware", () => ({
  withUser: (handler: (req: unknown, ctx: unknown) => Promise<Response>) => () =>
    handler({}, { user: { id: "u1" }, db }),
}));

const { GET } = await import("../route");

async function body() {
  const res = await (GET as unknown as () => Promise<Response>)();
  return res.json();
}

describe("GET /api/me/quota, two buckets", () => {
  beforeEach(() => {
    profileRow = {
      plan_tier: "free",
      credits_balance: 2,
      last_prompt_at: new Date().toISOString(),
      bonus_credits: 3,
      bonus_expires_at: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
    };
  });

  it("returns the daily bucket, the bonus bucket and their sum", async () => {
    const q = await body();
    expect(q.credits_balance).toBe(2);
    expect(q.bonus_credits).toBe(3);
    expect(q.total_available).toBe(5);
  });

  it("an expired bonus is worth nothing", async () => {
    profileRow.bonus_expires_at = new Date(Date.now() - 60_000).toISOString();
    const q = await body();
    expect(q.bonus_credits).toBe(0);
    expect(q.bonus_expires_at).toBeNull();
    expect(q.total_available).toBe(2);
  });

  it("the daily refill never touches the bonus", async () => {
    // Last prompt was two days ago: the daily bucket reads as refilled to
    // the limit, and the bonus is exactly what it was, not limit + bonus.
    profileRow.credits_balance = 0;
    profileRow.last_prompt_at = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const q = await body();
    expect(q.credits_balance).toBe(2);
    expect(q.bonus_credits).toBe(3);
    expect(q.total_available).toBe(5);
  });

  it("a user with no bonus columns at all still gets numbers", async () => {
    delete profileRow.bonus_credits;
    delete profileRow.bonus_expires_at;
    const q = await body();
    expect(q.bonus_credits).toBe(0);
    expect(q.total_available).toBe(2);
  });
});
