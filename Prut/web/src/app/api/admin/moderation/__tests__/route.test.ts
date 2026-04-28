import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockValidateAdminSession = vi.fn();
const mockLogAdminAction = vi.fn();

vi.mock("@/lib/admin/admin-security", () => ({
  validateAdminSession: (...args: unknown[]) => mockValidateAdminSession(...args),
  logAdminAction: (...args: unknown[]) => mockLogAdminAction(...args),
}));

// withAdminWrite calls checkRateLimit; without this mock the route hits
// real Upstash and the test stalls / fails unpredictably.
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    success: true,
    limit: 120,
    remaining: 119,
    reset: Date.now() + 60_000,
  }),
}));

// The POST handler builds its own service-role client (it must bypass RLS
// to write to rows owned by other users). Route the service client's `from`
// to the same mockFrom the tests instrument.
const mockFrom = vi.fn();
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: (...args: unknown[]) => mockFrom(...args) }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
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
    "contains",
    "not",
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

const mockUser = { id: "admin-id", email: "admin@example.com" };

function setupAuth() {
  mockValidateAdminSession.mockResolvedValue({
    error: null,
    supabase: { from: mockFrom },
    user: mockUser,
  });
}

// ─── Import route handlers after mocks ───────────────────────────────────────

import { POST } from "../route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/moderation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const EXISTING_PROMPT = {
  id: "11111111-2222-3333-4444-555555555555",
  user_id: "user-1",
  is_public: true,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/admin/moderation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
    mockLogAdminAction.mockResolvedValue(undefined);
    // Default: prompt exists, any query resolves cleanly
    mockFrom.mockReturnValue(mockQueryBuilder({ data: EXISTING_PROMPT, error: null }));
  });

  // ── Input validation ──────────────────────────────────────────────────────

  it("returns 400 when action is missing", async () => {
    const res = await POST(makePostRequest({ prompt_id: EXISTING_PROMPT.id }), undefined);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/required/i);
  });

  it("returns 400 when prompt_id is missing", async () => {
    const res = await POST(makePostRequest({ action: "approve" }), undefined);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/required/i);
  });

  it("returns 400 when both action and prompt_id are missing", async () => {
    const res = await POST(makePostRequest({}), undefined);
    expect(res.status).toBe(400);
  });

  it("returns 400 for an unrecognised action", async () => {
    const res = await POST(
      makePostRequest({ action: "delete", prompt_id: EXISTING_PROMPT.id }),
      undefined,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    // Error message lists the valid options
    expect(body.error).toMatch(/approve|remove|flag/);
  });

  // ── Not found ─────────────────────────────────────────────────────────────

  it("returns 404 when the prompt does not exist", async () => {
    mockFrom.mockReturnValue(mockQueryBuilder({ data: null, error: null }));
    const res = await POST(
      makePostRequest({
        action: "approve",
        prompt_id: "99999999-9999-9999-9999-999999999999",
      }),
      undefined,
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });

  // ── approve ───────────────────────────────────────────────────────────────

  it("returns 200 with status=approved on approve", async () => {
    const res = await POST(
      makePostRequest({ action: "approve", prompt_id: EXISTING_PROMPT.id }),
      undefined,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.action).toBe("approve");
    expect(body.status).toBe("approved");
    expect(body.prompt_id).toBe(EXISTING_PROMPT.id);
  });

  it("does not update is_public on approve", async () => {
    await POST(makePostRequest({ action: "approve", prompt_id: EXISTING_PROMPT.id }), undefined);
    // Only one from() call (the select), no update call
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  // ── flag ──────────────────────────────────────────────────────────────────

  it("returns 200 with status=flagged on flag", async () => {
    const res = await POST(
      makePostRequest({ action: "flag", prompt_id: EXISTING_PROMPT.id }),
      undefined,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("flagged");
  });

  // ── remove ────────────────────────────────────────────────────────────────

  it("sets is_public=false and returns 200 on remove", async () => {
    const selectBuilder = mockQueryBuilder({ data: EXISTING_PROMPT, error: null });
    const updateBuilder = mockQueryBuilder({ data: [{ id: EXISTING_PROMPT.id }], error: null });

    mockFrom
      .mockReturnValueOnce(selectBuilder) // prompt existence check
      .mockReturnValueOnce(updateBuilder); // is_public update

    const res = await POST(
      makePostRequest({ action: "remove", prompt_id: EXISTING_PROMPT.id }),
      undefined,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("removed");
    expect(updateBuilder.update).toHaveBeenCalledWith({ is_public: false });
  });

  it("returns 500 when the is_public update fails", async () => {
    const selectBuilder = mockQueryBuilder({ data: EXISTING_PROMPT, error: null });
    const updateBuilder = mockQueryBuilder({ error: { message: "DB write error" } });

    mockFrom.mockReturnValueOnce(selectBuilder).mockReturnValueOnce(updateBuilder);

    const res = await POST(
      makePostRequest({ action: "remove", prompt_id: EXISTING_PROMPT.id }),
      undefined,
    );
    expect(res.status).toBe(500);
  });

  // ── Audit logging ─────────────────────────────────────────────────────────

  it("calls logAdminAction with correct args on approve", async () => {
    await POST(makePostRequest({ action: "approve", prompt_id: EXISTING_PROMPT.id }), undefined);
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      mockUser.id,
      "moderation_review",
      expect.objectContaining({
        action: "approve",
        prompt_id: EXISTING_PROMPT.id,
        status: "approved",
        prompt_owner_id: EXISTING_PROMPT.user_id,
      }),
    );
  });

  it("calls logAdminAction with correct status on remove", async () => {
    const selectBuilder = mockQueryBuilder({ data: EXISTING_PROMPT, error: null });
    const updateBuilder = mockQueryBuilder({ data: [{ id: EXISTING_PROMPT.id }], error: null });
    mockFrom.mockReturnValueOnce(selectBuilder).mockReturnValueOnce(updateBuilder);

    await POST(makePostRequest({ action: "remove", prompt_id: EXISTING_PROMPT.id }), undefined);
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      mockUser.id,
      "moderation_review",
      expect.objectContaining({ status: "removed" }),
    );
  });
});
