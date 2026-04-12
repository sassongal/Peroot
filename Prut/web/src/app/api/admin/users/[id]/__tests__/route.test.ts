import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockValidateAdminSession = vi.fn();
const mockLogAdminAction = vi.fn();
const mockParseAdminInput = vi.fn();
const mockAdminAdjustCredits = vi.fn();

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

// ─── Chainable query builder ─────────────────────────────────────────────────

function mockQueryBuilder(
  resolveValue: { data?: unknown; error?: unknown; count?: number } = { data: null }
) {
  const builder: Record<string, unknown> = {};
  const methods = [
    "select", "eq", "in", "or", "order", "limit", "gte", "ilike",
    "insert", "update", "upsert", "delete", "maybeSingle", "single",
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

// ─── Supabase mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
const mockAdminUser = { id: "admin-uuid-0000-0000-000000000000", email: "admin@example.com" };

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
    mockFrom.mockReturnValue(mockQueryBuilder({ data: null, error: null }));
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

  it("returns 200 on change_tier with a valid tier", async () => {
    setupParseInput("change_tier", "pro");
    mockFrom.mockReturnValue(mockQueryBuilder({ error: null }));

    const res = await POST(makePostRequest({ action: "change_tier", value: "pro" }), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ success: true, action: "change_tier", target_user_id: VALID_UUID });
  });

  it("returns 400 on change_tier with an invalid tier", async () => {
    setupParseInput("change_tier", "enterprise");

    const res = await POST(makePostRequest({ action: "change_tier", value: "enterprise" }), makeContext());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/free|pro|premium/);
  });

  it("returns 500 when the change_tier DB update fails", async () => {
    setupParseInput("change_tier", "pro");
    mockFrom.mockReturnValue(mockQueryBuilder({ error: { message: "DB error" } }));

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

    const res = await POST(makePostRequest({ action: "grant_credits", value: 10001 }), makeContext());
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

  // ── grant_admin ───────────────────────────────────────────────────────────

  it("returns 200 on grant_admin and upserts admin role", async () => {
    setupParseInput("grant_admin");
    const upsertBuilder = mockQueryBuilder({ error: null });
    mockFrom.mockReturnValue(upsertBuilder);

    const res = await POST(makePostRequest({ action: "grant_admin" }), makeContext());
    expect(res.status).toBe(200);
    expect(upsertBuilder.upsert).toHaveBeenCalledWith(
      { user_id: VALID_UUID, role: "admin" },
      { onConflict: "user_id" }
    );
  });

  it("returns 500 when grant_admin upsert fails", async () => {
    setupParseInput("grant_admin");
    mockFrom.mockReturnValue(mockQueryBuilder({ error: { message: "DB error" } }));

    const res = await POST(makePostRequest({ action: "grant_admin" }), makeContext());
    expect(res.status).toBe(500);
  });

  // ── revoke_admin ──────────────────────────────────────────────────────────

  it("returns 200 on revoke_admin and deletes admin role row", async () => {
    setupParseInput("revoke_admin");
    const deleteBuilder = mockQueryBuilder({ error: null });
    mockFrom.mockReturnValue(deleteBuilder);

    const res = await POST(makePostRequest({ action: "revoke_admin" }), makeContext());
    expect(res.status).toBe(200);
    expect(deleteBuilder.delete).toHaveBeenCalled();
    expect(deleteBuilder.eq).toHaveBeenCalledWith("user_id", VALID_UUID);
    expect(deleteBuilder.eq).toHaveBeenCalledWith("role", "admin");
  });

  it("returns 500 when revoke_admin delete fails", async () => {
    setupParseInput("revoke_admin");
    mockFrom.mockReturnValue(mockQueryBuilder({ error: { message: "DB error" } }));

    const res = await POST(makePostRequest({ action: "revoke_admin" }), makeContext());
    expect(res.status).toBe(500);
  });

  // ── Audit logging ─────────────────────────────────────────────────────────

  it("calls logAdminAction with correct args on successful action", async () => {
    setupParseInput("ban");
    mockFrom.mockReturnValue(mockQueryBuilder({ error: null }));

    await POST(makePostRequest({ action: "ban" }), makeContext());

    expect(mockLogAdminAction).toHaveBeenCalledWith(
      mockAdminUser.id,
      "user_ban",
      expect.objectContaining({ target_user_id: VALID_UUID })
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
