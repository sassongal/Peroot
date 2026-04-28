import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/api-middleware", () => ({
  withAdmin: (handler: (req: NextRequest) => Promise<Response>) => handler,
}));

vi.mock("@/lib/sanitize", () => ({
  escapePostgrestValue: (s: string) => s,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

// ─── Chainable Supabase query builder ────────────────────────────────────────

function makeBuilder(resolveValue: { data?: unknown; error?: unknown; count?: number } = { data: null }) {
  const b: Record<string, unknown> = {};
  const chainMethods = [
    "select", "eq", "in", "or", "order", "range", "limit", "gte",
    "ilike", "insert", "update", "upsert", "delete", "not", "contains",
  ];
  for (const m of chainMethods) {
    b[m] = vi.fn().mockReturnValue(b);
  }
  // maybeSingle resolves to the value directly
  b.maybeSingle = vi.fn().mockResolvedValue(resolveValue);
  // Make awaiting the builder itself resolve too (for chained awaits)
  b.then = (resolve: (v: unknown) => void) => {
    resolve(resolveValue);
    return Promise.resolve(resolveValue);
  };
  return b;
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const YESTERDAY = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();

const PROFILE = {
  id: "user-1111-1111-1111-111111111111",
  email: "test@example.com",
  plan_tier: "free",
  credits_balance: 0,
  created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  last_prompt_at: null,
  last_sign_in_at: null,
};

const LEDGER_ROW = {
  user_id: PROFILE.id,
  created_at: YESTERDAY,
  reason: "spend",
};

// ─── Supabase service client mock ─────────────────────────────────────────────

const mockFrom = vi.fn();
const mockListUsers = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: mockFrom,
    auth: {
      admin: {
        listUsers: mockListUsers,
      },
    },
  }),
}));

// ─── Import route handler after mocks ────────────────────────────────────────

import { GET } from "../route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeGetRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/admin/users");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString());
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/admin/users — enriched credit fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // auth.admin.listUsers returns empty (no last_sign_in_at to merge)
    mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });

    // Default from() mock — overridden per-call below
    mockFrom.mockReturnValue(makeBuilder({ data: [], error: null }));
  });

  it("returns users array with daily_limit, last_spend_at, refresh_at, and usage_last_7_days", async () => {
    // Call 1: profiles — returns 1 free user
    const profilesBuilder = makeBuilder({ data: [PROFILE], count: 1, error: null });

    // Call 2: user_roles — empty
    const rolesBuilder = makeBuilder({ data: [], error: null });

    // Call 3: subscriptions — empty (no active sub, user stays free)
    const subsBuilder = makeBuilder({ data: [], error: null });

    // Call 4 (second wave): history — empty
    const historyBuilder = makeBuilder({ data: [], error: null });

    // Call 5 (second wave): credit_ledger — one spend row yesterday
    const ledgerBuilder = makeBuilder({ data: [LEDGER_ROW], error: null });

    // Call 6 (second wave): site_settings — daily_free_limit = 2
    const siteSettingsBuilder = makeBuilder({ data: { daily_free_limit: 2 }, error: null });
    // maybeSingle is already set in makeBuilder; override to return the right data
    siteSettingsBuilder.maybeSingle = vi.fn().mockResolvedValue({ data: { daily_free_limit: 2 }, error: null });

    // Wire up mockFrom to return the right builder per table
    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case "profiles":      return profilesBuilder;
        case "user_roles":    return rolesBuilder;
        case "subscriptions": return subsBuilder;
        case "history":       return historyBuilder;
        case "credit_ledger": return ledgerBuilder;
        case "site_settings": return siteSettingsBuilder;
        default:              return makeBuilder({ data: [], error: null });
      }
    });

    const res = await GET(makeGetRequest(), {} as never);
    expect(res.status).toBe(200);

    const body = await res.json();

    // Should be an array
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);

    const user = body[0];

    // daily_limit: free user → 2
    expect(user.daily_limit).toBe(2);

    // last_spend_at: truthy (yesterday's ledger row)
    expect(user.last_spend_at).toBeTruthy();
    expect(typeof user.last_spend_at).toBe("string");

    // refresh_at: set because free + balance 0 < 2 + recent spend
    expect(user.refresh_at).toBeTruthy();
    expect(typeof user.refresh_at).toBe("string");

    // usage_last_7_days: exactly 7 elements
    expect(Array.isArray(user.usage_last_7_days)).toBe(true);
    expect(user.usage_last_7_days).toHaveLength(7);

    // At least one day has a spend count >= 1
    const total = (user.usage_last_7_days as number[]).reduce((s: number, v: number) => s + v, 0);
    expect(total).toBeGreaterThanOrEqual(1);
  });

  it("sets daily_limit to -1 for admin role users", async () => {
    const profilesBuilder = makeBuilder({ data: [PROFILE], count: 1, error: null });
    const rolesBuilder = makeBuilder({ data: [{ user_id: PROFILE.id, role: "admin" }], error: null });
    const subsBuilder = makeBuilder({ data: [], error: null });
    const historyBuilder = makeBuilder({ data: [], error: null });
    const ledgerBuilder = makeBuilder({ data: [], error: null });
    const siteSettingsBuilder = makeBuilder({ data: { daily_free_limit: 2 }, error: null });
    siteSettingsBuilder.maybeSingle = vi.fn().mockResolvedValue({ data: { daily_free_limit: 2 }, error: null });

    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case "profiles":      return profilesBuilder;
        case "user_roles":    return rolesBuilder;
        case "subscriptions": return subsBuilder;
        case "history":       return historyBuilder;
        case "credit_ledger": return ledgerBuilder;
        case "site_settings": return siteSettingsBuilder;
        default:              return makeBuilder({ data: [], error: null });
      }
    });

    const res = await GET(makeGetRequest(), {} as never);
    const body = await res.json();
    expect(body[0].daily_limit).toBe(-1);
  });

  it("sets daily_limit to 150 for pro plan users", async () => {
    const profilesBuilder = makeBuilder({ data: [{ ...PROFILE, plan_tier: "pro" }], count: 1, error: null });
    const rolesBuilder = makeBuilder({ data: [], error: null });
    const subsBuilder = makeBuilder({ data: [{ user_id: PROFILE.id, plan_name: "pro", status: "active", customer_name: "Test" }], error: null });
    const historyBuilder = makeBuilder({ data: [], error: null });
    const ledgerBuilder = makeBuilder({ data: [], error: null });
    const siteSettingsBuilder = makeBuilder({ data: { daily_free_limit: 2 }, error: null });
    siteSettingsBuilder.maybeSingle = vi.fn().mockResolvedValue({ data: { daily_free_limit: 2 }, error: null });

    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case "profiles":      return profilesBuilder;
        case "user_roles":    return rolesBuilder;
        case "subscriptions": return subsBuilder;
        case "history":       return historyBuilder;
        case "credit_ledger": return ledgerBuilder;
        case "site_settings": return siteSettingsBuilder;
        default:              return makeBuilder({ data: [], error: null });
      }
    });

    const res = await GET(makeGetRequest(), {} as never);
    const body = await res.json();
    expect(body[0].daily_limit).toBe(150);
  });
});
