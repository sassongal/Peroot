import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockValidateAdminSession = vi.fn();

vi.mock("@/lib/admin/admin-security", () => ({
  validateAdminSession: (...args: unknown[]) => mockValidateAdminSession(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { withAdmin } from "@/lib/api-middleware";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockUser = { id: "admin-user", email: "admin@example.com" };
const mockSupabase = { from: vi.fn() };

function makeReq(url = "http://localhost/api/admin/test") {
  return new NextRequest(url);
}

function successSession() {
  mockValidateAdminSession.mockResolvedValue({
    error: null,
    supabase: mockSupabase,
    user: mockUser,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("withAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    successSession();
  });

  // ── Auth failures ─────────────────────────────────────────────────────────

  it("returns 401 when error is Unauthorized", async () => {
    mockValidateAdminSession.mockResolvedValue({
      error: "Unauthorized",
      supabase: null,
      user: null,
    });
    const handler = withAdmin(async () => NextResponse.json({ ok: true }));
    const res = await handler(makeReq(), undefined);
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "Unauthorized" });
  });

  it("returns 403 when error is a non-Unauthorized string", async () => {
    mockValidateAdminSession.mockResolvedValue({
      error: "Forbidden",
      supabase: null,
      user: null,
    });
    const handler = withAdmin(async () => NextResponse.json({ ok: true }));
    const res = await handler(makeReq(), undefined);
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: "Forbidden" });
  });

  it("returns 403 with Forbidden body when no error string but user is null", async () => {
    mockValidateAdminSession.mockResolvedValue({
      error: null,
      supabase: mockSupabase,
      user: null,
    });
    const handler = withAdmin(async () => NextResponse.json({ ok: true }));
    const res = await handler(makeReq(), undefined);
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: "Forbidden" });
  });

  it("returns 403 when supabase client is null", async () => {
    mockValidateAdminSession.mockResolvedValue({
      error: null,
      supabase: null,
      user: mockUser,
    });
    const handler = withAdmin(async () => NextResponse.json({ ok: true }));
    const res = await handler(makeReq(), undefined);
    expect(res.status).toBe(403);
  });

  // ── Success path ──────────────────────────────────────────────────────────

  it("invokes handler with (req, supabase, user, context) on auth success", async () => {
    const inner = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const handler = withAdmin(inner);
    const req = makeReq();
    await handler(req, undefined);
    expect(inner).toHaveBeenCalledOnce();
    expect(inner).toHaveBeenCalledWith(req, mockSupabase, mockUser, undefined);
  });

  it("forwards handler response as-is", async () => {
    const handler = withAdmin(async () =>
      NextResponse.json({ payload: "hello" }, { status: 201 })
    );
    const res = await handler(makeReq(), undefined);
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ payload: "hello" });
  });

  it("forwards route context as 4th argument", async () => {
    const inner = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const handler = withAdmin(inner);
    const ctx = { params: Promise.resolve({ id: "user-abc" }) };
    await handler(makeReq(), ctx);
    expect(inner).toHaveBeenCalledWith(expect.anything(), mockSupabase, mockUser, ctx);
  });

  // ── Error boundary ────────────────────────────────────────────────────────

  it("returns 500 when the handler throws an unhandled error", async () => {
    const handler = withAdmin(async () => {
      throw new Error("boom");
    });
    const res = await handler(makeReq(), undefined);
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "Internal server error" });
  });

  it("returns 500 when validateAdminSession itself throws", async () => {
    mockValidateAdminSession.mockRejectedValue(new Error("DB unreachable"));
    const handler = withAdmin(async () => NextResponse.json({ ok: true }));
    const res = await handler(makeReq(), undefined);
    expect(res.status).toBe(500);
  });
});
