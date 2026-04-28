import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockValidateAdminSession = vi.fn();
const mockLogAdminAction = vi.fn();
const mockParseAdminInput = vi.fn();
const mockAdminAdjustCredits = vi.fn();
const mockCheckRateLimit = vi.fn();

vi.mock("@/lib/admin/admin-security", () => ({
  validateAdminSession: (...args: unknown[]) => mockValidateAdminSession(...args),
  logAdminAction: (...args: unknown[]) => mockLogAdminAction(...args),
  parseAdminInput: (...args: unknown[]) => mockParseAdminInput(...args),
}));

vi.mock("@/lib/services/credit-service", () => ({
  adminAdjustCredits: (...args: unknown[]) => mockAdminAdjustCredits(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

// ─── Chainable query builder ─────────────────────────────────────────────────

function mockQueryBuilder(
  resolveValue: { data?: unknown; error?: unknown; count?: number } = { data: null },
) {
  const builder: Record<string, unknown> = {};
  const methods = [
    "select",
    "eq",
    "in",
    "or",
    "order",
    "limit",
    "gte",
    "ilike",
    "insert",
    "update",
    "upsert",
    "delete",
    "maybeSingle",
    "single",
  ];
  for (const m of methods) {
    builder[m] = vi.fn().mockReturnValue(builder);
  }
  builder.then = (resolve: (v: unknown) => void) => {
    resolve(resolveValue);
    return Promise.resolve(resolveValue);
  };
  return builder;
}

// ─── Supabase service client mock ────────────────────────────────────────────

const mockFrom = vi.fn();
const mockRpc = vi.fn();
const mockUpdateUserById = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: mockFrom,
    rpc: mockRpc,
    auth: {
      admin: {
        updateUserById: mockUpdateUserById,
        signOut: mockSignOut,
      },
    },
  }),
}));

const mockAdminUser = { id: "ad000000-0000-0000-0000-000000000000", email: "admin@example.com" };

function setupAuth() {
  mockValidateAdminSession.mockResolvedValue({
    error: null,
    supabase: { from: mockFrom },
    user: mockAdminUser,
  });
}

// ─── Import route handlers after mocks ───────────────────────────────────────

import { POST } from "../route";

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_UUID = "12345678-1234-1234-1234-123456789abc";
const INVALID_UUID = "not-a-uuid";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePostRequest(body: unknown) {
  return new NextRequest(`http://localhost/api/admin/users/${VALID_UUID}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeContext(id = VALID_UUID) {
  return { params: Promise.resolve({ id }) };
}

function setupParseInput(action: string, value?: unknown) {
  mockParseAdminInput.mockResolvedValue({
    data: { action, ...(value !== undefined ? { value } : {}) },
    error: null,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/admin/users/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
    mockLogAdminAction.mockResolvedValue(undefined);
    mockCheckRateLimit.mockResolvedValue({ success: true, limit: 120, remaining: 119, reset: 0 });
    mockFrom.mockReturnValue(mockQueryBuilder({ data: null, error: null }));
    mockRpc.mockResolvedValue({ data: null, error: null });
    mockUpdateUserById.mockResolvedValue({ data: null, error: null });
    mockSignOut.mockResolvedValue({ data: null, error: null });
  });

  // ── UUID validation ───────────────────────────────────────────────────────

  it("returns 400 for an invalid UUID", async () => {
    setupParseInput("ban");
    const res = await POST(makePostRequest({ action: "ban" }), makeContext(INVALID_UUID));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid user id/i);
  });

  // ── Body parse error ──────────────────────────────────────────────────────

  it("returns the parse error response when body is invalid", async () => {
    const errorResponse = new Response(JSON.stringify({ error: "Invalid input" }), { status: 400 });
    mockParseAdminInput.mockResolvedValue({ data: null, error: errorResponse });

    const res = await POST(makePostRequest({}), makeContext());
    expect(res.status).toBe(400);
  });

  // ── change_tier ───────────────────────────────────────────────────────────

  it("change_tier free→pro: calls rpc, updateUserById with role=null/plan_tier=pro, signOut, returns 200", async () => {
    setupParseInput("change_tier", "pro");
    // Target user is NOT an admin (no current role)
    mockFrom.mockReturnValue(mockQueryBuilder({ data: null, error: null }));

    const res = await POST(makePostRequest({ action: "change_tier", value: "pro" }), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      success: true,
      action: "change_tier",
      target_user_id: VALID_UUID,
    });

    expect(mockRpc).toHaveBeenCalledWith("admin_change_tier", {
      target_user_id: VALID_UUID,
      new_tier: "pro",
    });
    expect(mockUpdateUserById).toHaveBeenCalledWith(VALID_UUID, {
      app_metadata: { role: null, plan_tier: "pro" },
    });
    expect(mockSignOut).toHaveBeenCalledWith(VALID_UUID, "global");
  });

  it("change_tier free→admin: updateUserById called with role=admin/plan_tier=admin", async () => {
    setupParseInput("change_tier", "admin");
    // No demotion guard needed when promoting to admin
    mockFrom.mockReturnValue(mockQueryBuilder({ data: null, error: null }));

    const res = await POST(
      makePostRequest({ action: "change_tier", value: "admin" }),
      makeContext(),
    );
    expect(res.status).toBe(200);

    expect(mockUpdateUserById).toHaveBeenCalledWith(VALID_UUID, {
      app_metadata: { role: "admin", plan_tier: "admin" },
    });
  });

  it("change_tier: self-demotion refused with 400 /cannot demote self/i", async () => {
    setupParseInput("change_tier", "free");
    // Target IS the admin user themselves AND has role=admin
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_roles") {
        return mockQueryBuilder({ data: { role: "admin" }, error: null });
      }
      return mockQueryBuilder({ data: null, error: null });
    });

    const res = await POST(
      makePostRequest({ action: "change_tier", value: "free" }),
      makeContext(mockAdminUser.id),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/cannot demote self/i);
  });

  it("change_tier: last-admin refusal returns 400 /last remaining admin/i", async () => {
    setupParseInput("change_tier", "free");
    const OTHER_UUID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    // Target is a different user who is an admin; only 1 admin total
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_roles") {
        callCount++;
        if (callCount === 1) {
          // First call: maybeSingle — current role of target
          return mockQueryBuilder({ data: { role: "admin" }, error: null });
        }
        // Second call: count of admins = 1
        return mockQueryBuilder({ data: null, error: null, count: 1 });
      }
      return mockQueryBuilder({ data: null, error: null });
    });

    const res = await POST(
      makePostRequest({ action: "change_tier", value: "free" }),
      makeContext(OTHER_UUID),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/last remaining admin/i);
  });

  it("change_tier: invalid tier value 'premium' returns 400 /value must be one of/", async () => {
    setupParseInput("change_tier", "premium");

    const res = await POST(
      makePostRequest({ action: "change_tier", value: "premium" }),
      makeContext(),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/value must be one of/);
  });

  it("returns 500 when the change_tier RPC fails", async () => {
    setupParseInput("change_tier", "pro");
    mockFrom.mockReturnValue(mockQueryBuilder({ data: null, error: null }));
    mockRpc.mockResolvedValue({ error: { message: "DB error" } });

    const res = await POST(makePostRequest({ action: "change_tier", value: "pro" }), makeContext());
    expect(res.status).toBe(500);
  });

  // ── grant_credits ─────────────────────────────────────────────────────────

  it("returns 200 on grant_credits with a valid amount", async () => {
    setupParseInput("grant_credits", 100);
    mockAdminAdjustCredits.mockResolvedValue({ success: true });

    const res = await POST(makePostRequest({ action: "grant_credits", value: 100 }), makeContext());
    expect(res.status).toBe(200);
    expect(mockAdminAdjustCredits).toHaveBeenCalledWith(VALID_UUID, 100);
  });

  it("returns 400 on grant_credits with 0", async () => {
    setupParseInput("grant_credits", 0);

    const res = await POST(makePostRequest({ action: "grant_credits", value: 0 }), makeContext());
    expect(res.status).toBe(400);
  });

  it("returns 400 on grant_credits exceeding 10,000", async () => {
    setupParseInput("grant_credits", 10001);

    const res = await POST(
      makePostRequest({ action: "grant_credits", value: 10001 }),
      makeContext(),
    );
    expect(res.status).toBe(400);
  });

  it("returns 500 when adminAdjustCredits fails on grant", async () => {
    setupParseInput("grant_credits", 50);
    mockAdminAdjustCredits.mockResolvedValue({ success: false, error: "RPC error" });

    const res = await POST(makePostRequest({ action: "grant_credits", value: 50 }), makeContext());
    expect(res.status).toBe(500);
  });

  // ── revoke_credits ────────────────────────────────────────────────────────

  it("returns 200 on revoke_credits and calls adjust with negative amount", async () => {
    setupParseInput("revoke_credits", 25);
    mockAdminAdjustCredits.mockResolvedValue({ success: true });

    const res = await POST(makePostRequest({ action: "revoke_credits", value: 25 }), makeContext());
    expect(res.status).toBe(200);
    expect(mockAdminAdjustCredits).toHaveBeenCalledWith(VALID_UUID, -25);
  });

  it("returns 400 on revoke_credits with a negative amount", async () => {
    setupParseInput("revoke_credits", -5);

    const res = await POST(makePostRequest({ action: "revoke_credits", value: -5 }), makeContext());
    expect(res.status).toBe(400);
  });

  // ── ban ───────────────────────────────────────────────────────────────────

  it("returns 200 on ban and sets is_banned=true", async () => {
    setupParseInput("ban");
    const updateBuilder = mockQueryBuilder({ error: null });
    mockFrom.mockReturnValue(updateBuilder);

    const res = await POST(makePostRequest({ action: "ban" }), makeContext());
    expect(res.status).toBe(200);
    expect(updateBuilder.update).toHaveBeenCalledWith({ is_banned: true });
  });

  it("returns 500 when ban DB update fails", async () => {
    setupParseInput("ban");
    mockFrom.mockReturnValue(mockQueryBuilder({ error: { message: "DB error" } }));

    const res = await POST(makePostRequest({ action: "ban" }), makeContext());
    expect(res.status).toBe(500);
  });

  // ── unban ─────────────────────────────────────────────────────────────────

  it("returns 200 on unban and sets is_banned=false", async () => {
    setupParseInput("unban");
    const updateBuilder = mockQueryBuilder({ error: null });
    mockFrom.mockReturnValue(updateBuilder);

    const res = await POST(makePostRequest({ action: "unban" }), makeContext());
    expect(res.status).toBe(200);
    expect(updateBuilder.update).toHaveBeenCalledWith({ is_banned: false });
  });

  // ── Audit logging ─────────────────────────────────────────────────────────

  it("calls logAdminAction with correct args on successful action", async () => {
    setupParseInput("ban");
    mockFrom.mockReturnValue(mockQueryBuilder({ error: null }));

    await POST(makePostRequest({ action: "ban" }), makeContext());

    expect(mockLogAdminAction).toHaveBeenCalledWith(
      mockAdminUser.id,
      "user_ban",
      expect.objectContaining({ target_user_id: VALID_UUID }),
    );
  });

  it("still returns 200 when logAdminAction throws", async () => {
    setupParseInput("unban");
    mockFrom.mockReturnValue(mockQueryBuilder({ error: null }));
    mockLogAdminAction.mockRejectedValue(new Error("audit DB down"));

    const res = await POST(makePostRequest({ action: "unban" }), makeContext());
    // Action succeeded even though audit log failed
    expect(res.status).toBe(200);
  });
});
