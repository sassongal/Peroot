/**
 * Contract test for the registered half of the quota law.
 *
 * The free allowance a signed-in user sees must come from
 * `site_settings.daily_free_limit`, never from a number compiled into this
 * route. This endpoint drives the credit pill, the exhausted-quota modal and
 * the extension, so a wrong number here is what the user actually believes.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QUOTA_FALLBACK } from "@/lib/quota-policy";

const settingsRow: { daily_free_limit: number | null } = { daily_free_limit: 2 };
const profileRow = {
  plan_tier: "free",
  credits_balance: 2,
  // Recent, so the rolling reset does not fire and the raw balance is returned.
  last_prompt_at: new Date().toISOString(),
};

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

// withUser normally owns auth + client scoping; here it just injects the stub.
vi.mock("@/lib/api-middleware", () => ({
  withUser:
    (
      handler: (
        req: unknown,
        ctx: { user: { id: string }; db: unknown },
      ) => Promise<Response> | Response,
    ) =>
    () =>
      handler({}, { user: { id: "u1" }, db }),
}));

import { GET } from "../route";

describe("GET /api/me/quota, quota law", () => {
  beforeEach(() => {
    settingsRow.daily_free_limit = 2;
  });

  it("reports the registered free allowance from site_settings", async () => {
    const body = await (await (GET as unknown as () => Promise<Response>)()).json();
    expect(body.daily_limit).toBe(2);
    expect(body.plan_tier).toBe("free");
  });

  it("tracks the setting rather than a compiled-in number", async () => {
    settingsRow.daily_free_limit = 7;
    const body = await (await (GET as unknown as () => Promise<Response>)()).json();
    expect(body.daily_limit).toBe(7);
  });

  it("falls back to the documented policy when the column is unreadable", async () => {
    settingsRow.daily_free_limit = null;
    const body = await (await (GET as unknown as () => Promise<Response>)()).json();
    expect(body.daily_limit).toBe(QUOTA_FALLBACK.freeDaily);
  });
});
