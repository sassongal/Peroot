/**
 * CreditService Tests
 *
 * This is the money path for peroot.space. Credits are deducted before AI
 * calls and refunded on error. Getting this wrong means users lose credits
 * unfairly or get free usage.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock: logger (silences console output during tests)
// ---------------------------------------------------------------------------
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Mock helpers: build chainable Supabase-style mocks
// ---------------------------------------------------------------------------

/** Creates a mock RPC function that resolves to { data, error }. */
function mockRpc(data: unknown = null, error: unknown = null) {
  return vi.fn().mockResolvedValue({ data, error });
}

/**
 * Builds a minimal Supabase client mock with `.rpc()` and chainable
 * `.from().select().eq().single()` / `.from().update().eq()`.
 */
function buildQueryClient(
  overrides: {
    rpc?: ReturnType<typeof vi.fn>;
    fromSelectReturn?: { data: unknown; error: unknown };
    fromUpdateReturn?: { data: unknown; error: unknown };
  } = {},
) {
  const singleFn = vi
    .fn()
    .mockResolvedValue(overrides.fromSelectReturn ?? { data: null, error: null });
  const eqSelectFn = vi.fn().mockReturnValue({ single: singleFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqSelectFn });

  const eqUpdateFn = vi
    .fn()
    .mockResolvedValue(overrides.fromUpdateReturn ?? { data: null, error: null });
  const updateFn = vi.fn().mockReturnValue({ eq: eqUpdateFn });

  const fromFn = vi.fn().mockReturnValue({
    select: selectFn,
    update: updateFn,
  });

  return {
    rpc: overrides.rpc ?? mockRpc(),
    from: fromFn,
    // Expose internals for assertion
    __internals: { singleFn, eqSelectFn, selectFn, eqUpdateFn, updateFn, fromFn },
  } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

// ---------------------------------------------------------------------------
// Mock: createServiceClient (used by refundCredit, adminAdjust, logCreditChange)
// ---------------------------------------------------------------------------

let serviceClientMock: ReturnType<typeof buildQueryClient>;

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => serviceClientMock,
}));

// ---------------------------------------------------------------------------
// Import after mocks are wired up
// ---------------------------------------------------------------------------

import {
  checkAndDecrementCredits,
  refundCredit,
  adminAdjustCredits,
  logCreditChange,
} from "../credit-service";

// ---------------------------------------------------------------------------
// Test Suites
// ---------------------------------------------------------------------------

describe("CreditService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset service client to a clean default before each test
    serviceClientMock = buildQueryClient({
      rpc: mockRpc({ success: true, current_balance: 10 }),
      fromSelectReturn: { data: { credits_balance: 10 }, error: null },
    });
  });

  // =========================================================================
  // checkAndDecrementCredits
  // =========================================================================
  describe("checkAndDecrementCredits", () => {
    it("returns success when user has credits", async () => {
      const client = buildQueryClient({
        rpc: mockRpc({ success: true, current_balance: 4 }),
      });
      // Primary RPC runs through createServiceClient(), not the user-scoped
      // queryClient — alias the two so the test's mock drives both paths.
      serviceClientMock = client;

      const result = await checkAndDecrementCredits("user-1", "pro", client);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.error).toBeUndefined();
      expect(client.rpc).toHaveBeenCalledWith("refresh_and_decrement_credits", {
        target_user_id: "user-1",
        amount_to_spend: 1,
        user_tier: "pro",
      });
    });

    it("returns failure (402-path) when user has 0 credits", async () => {
      const client = buildQueryClient({
        rpc: mockRpc({ success: false, current_balance: 0, error: "Insufficient credits" }),
      });
      serviceClientMock = client;

      const result = await checkAndDecrementCredits("user-1", "free", client);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.error).toBe("Insufficient credits");
    });

    it("handles free tier daily reset via legacy fallback", async () => {
      // The legacy fallback is gated on ALLOW_LEGACY_CREDIT_FALLBACK to keep
      // the non-atomic path off in prod. Tests must opt in explicitly.
      process.env.ALLOW_LEGACY_CREDIT_FALLBACK = "1";

      // Modern RPC runs on the service client. Make it report "function
      // does not exist" so the implementation falls into the legacy path.
      serviceClientMock = buildQueryClient({
        rpc: mockRpc(null, {
          message:
            "function refresh_and_decrement_credits(unknown, unknown, unknown) does not exist",
        }),
      });

      // The legacy RPC runs on the passed-in queryClient.
      const rpcFn = vi.fn().mockResolvedValueOnce({
        data: { success: true, current_balance: 1 },
        error: null,
      });

      // The legacy path has two chain patterns:
      //   from("site_settings").select("daily_free_limit").single()
      //   from("profiles").select("credits_refreshed_at, credits_balance").eq("id", userId).single()
      //   from("profiles").update({...}).eq("id", userId)

      const profileSingleFn = vi.fn().mockResolvedValue({
        data: {
          credits_refreshed_at: "2020-01-01T00:00:00Z", // old date triggers reset
          credits_balance: 0,
        },
        error: null,
      });
      const profileEqFn = vi.fn().mockReturnValue({ single: profileSingleFn });

      const settingsSingleFn = vi.fn().mockResolvedValue({
        data: { daily_free_limit: 3 },
        error: null,
      });

      const updateEqFn = vi.fn().mockResolvedValue({ data: null, error: null });

      const fromFn = vi.fn().mockImplementation((table: string) => {
        if (table === "site_settings") {
          return {
            select: vi.fn().mockReturnValue({
              single: settingsSingleFn,
              eq: vi.fn(), // not used for site_settings
            }),
          };
        }
        // profiles table
        return {
          select: vi.fn().mockReturnValue({
            eq: profileEqFn,
            single: vi.fn(), // not used directly for profiles select
          }),
          update: vi.fn().mockReturnValue({ eq: updateEqFn }),
        };
      });

      const client = {
        rpc: rpcFn,
        from: fromFn,
      } as unknown as import("@supabase/supabase-js").SupabaseClient;

      const result = await checkAndDecrementCredits("user-free", "free", client);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
      // The legacy RPC runs on the queryClient, not serviceClient.
      expect(rpcFn).toHaveBeenCalledTimes(1);
      expect(rpcFn).toHaveBeenCalledWith("check_and_decrement_credits", {
        target_user_id: "user-free",
        amount_to_spend: 1,
      });
      delete process.env.ALLOW_LEGACY_CREDIT_FALLBACK;
    });

    it("pro tier uses monthly credits (primary atomic RPC)", async () => {
      const client = buildQueryClient({
        rpc: mockRpc({ success: true, current_balance: 99 }),
      });
      serviceClientMock = client;

      const result = await checkAndDecrementCredits("user-pro", "pro", client);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);
      expect(client.rpc).toHaveBeenCalledWith("refresh_and_decrement_credits", {
        target_user_id: "user-pro",
        amount_to_spend: 1,
        user_tier: "pro",
      });
    });

    it("admin bypasses credit check (RPC decides based on tier)", async () => {
      // The admin tier is passed to the RPC which handles the bypass logic.
      // When the DB RPC returns success for admin, credits are unlimited.
      const client = buildQueryClient({
        rpc: mockRpc({ success: true, current_balance: 999999 }),
      });
      serviceClientMock = client;

      const result = await checkAndDecrementCredits("admin-1", "admin", client);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(999999);
      expect(client.rpc).toHaveBeenCalledWith("refresh_and_decrement_credits", {
        target_user_id: "admin-1",
        amount_to_spend: 1,
        user_tier: "admin",
      });
    });

    it("returns default error message when RPC gives no error string", async () => {
      const client = buildQueryClient({
        rpc: mockRpc({ success: false, current_balance: 0 }),
      });
      serviceClientMock = client;

      const result = await checkAndDecrementCredits("user-1", "free", client);

      expect(result.allowed).toBe(false);
      expect(result.error).toBe("Insufficient credits or profile not found");
    });

    it("passes custom amount to the RPC", async () => {
      const client = buildQueryClient({
        rpc: mockRpc({ success: true, current_balance: 7 }),
      });
      serviceClientMock = client;

      await checkAndDecrementCredits("user-1", "pro", client, 3);

      expect(client.rpc).toHaveBeenCalledWith("refresh_and_decrement_credits", {
        target_user_id: "user-1",
        amount_to_spend: 3,
        user_tier: "pro",
      });
    });

    it("returns remaining 0 when creditRes is null", async () => {
      // RPC returns null data and no error -- edge case
      const client = buildQueryClient({
        rpc: mockRpc(null, null),
      });
      serviceClientMock = client;

      const result = await checkAndDecrementCredits("user-1", "free", client);

      // null data means !creditRes?.success is true, so falls into "genuine error"
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('handles non-"not found" RPC errors as genuine failures', async () => {
      const client = buildQueryClient({
        rpc: mockRpc(null, { message: "connection timeout" }),
      });
      serviceClientMock = client;

      const result = await checkAndDecrementCredits("user-1", "pro", client);

      // Error does not match the "function does not exist" pattern,
      // so it should NOT fall into legacy path -- just fail.
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  // =========================================================================
  // Atomic decrement: concurrent calls cannot go negative
  // =========================================================================
  describe("atomic decrement prevents negative credits", () => {
    it("two concurrent calls both get the RPC result (DB atomicity)", async () => {
      // Simulate two concurrent calls: the first succeeds, the second fails
      // because the DB-level atomic RPC prevents going below zero.
      // Dispatch by RPC name so the implicit logCreditChange call (which
      // also runs through createServiceClient) doesn't consume a sequenced
      // mockResolvedValueOnce slot.
      let primaryCalls = 0;
      const rpcFn = vi.fn().mockImplementation((name: string) => {
        if (name === "refresh_and_decrement_credits") {
          primaryCalls++;
          if (primaryCalls === 1) {
            return Promise.resolve({
              data: { success: true, current_balance: 0 },
              error: null,
            });
          }
          return Promise.resolve({
            data: { success: false, current_balance: 0, error: "Insufficient credits" },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const client1 = buildQueryClient({ rpc: rpcFn });
      const client2 = {
        ...client1,
        rpc: rpcFn,
      } as unknown as import("@supabase/supabase-js").SupabaseClient;
      // Both calls go through createServiceClient(); alias both to the
      // shared rpc mock so its sequential mockResolvedValueOnce returns
      // are consumed in order.
      serviceClientMock = client1;

      const [r1, r2] = await Promise.all([
        checkAndDecrementCredits("user-1", "free", client1),
        checkAndDecrementCredits("user-1", "free", client2),
      ]);

      // First call succeeds, second is blocked by the atomic RPC
      expect(r1.allowed).toBe(true);
      expect(r2.allowed).toBe(false);
      expect(r2.error).toBe("Insufficient credits");
      // Only count the primary RPC calls; logCreditChange shares the mock.
      const primaryRpcCalls = rpcFn.mock.calls.filter(
        ([name]) => name === "refresh_and_decrement_credits",
      );
      expect(primaryRpcCalls).toHaveLength(2);
    });
  });

  // =========================================================================
  // Credit ledger entry on decrement
  // =========================================================================
  describe("credit ledger entry created on decrement", () => {
    it("calls logCreditChange after successful decrement", async () => {
      // Both refresh_and_decrement_credits and log_credit_change run via
      // createServiceClient(); dispatch by the RPC name on a single mock.
      const rpcFn = vi.fn().mockImplementation((name: string) => {
        if (name === "refresh_and_decrement_credits") {
          return Promise.resolve({
            data: { success: true, current_balance: 9 },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });
      const client = buildQueryClient({ rpc: rpcFn });
      serviceClientMock = client;

      await checkAndDecrementCredits("user-1", "pro", client);

      await vi.waitFor(() => {
        expect(rpcFn).toHaveBeenCalledWith("log_credit_change", {
          p_user_id: "user-1",
          p_delta: -1,
          p_balance_after: 9,
          p_reason: "spend",
          p_source: "system",
        });
      });
    });

    it("does not block the response if ledger logging fails", async () => {
      // Primary RPC succeeds; ledger RPC rejects. Same service client.
      const rpcFn = vi.fn().mockImplementation((name: string) => {
        if (name === "refresh_and_decrement_credits") {
          return Promise.resolve({
            data: { success: true, current_balance: 5 },
            error: null,
          });
        }
        return Promise.reject(new Error("ledger DB down"));
      });
      const client = buildQueryClient({ rpc: rpcFn });
      serviceClientMock = client;

      const result = await checkAndDecrementCredits("user-1", "pro", client);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });
  });

  // =========================================================================
  // refundCredit
  // =========================================================================
  describe("refundCredit", () => {
    it("increments credit count via refund_credit RPC", async () => {
      const rpcFn = mockRpc(null, null);
      serviceClientMock = buildQueryClient({
        rpc: rpcFn,
        fromSelectReturn: { data: { credits_balance: 6 }, error: null },
      });

      await refundCredit("user-1", 1);

      expect(rpcFn).toHaveBeenCalledWith("refund_credit", {
        target_user_id: "user-1",
        amount: 1,
      });
    });

    it("handles non-existent user gracefully (no throw)", async () => {
      const rpcFn = vi.fn().mockRejectedValue(new Error("user not found"));
      serviceClientMock = buildQueryClient({ rpc: rpcFn });

      // Should not throw — the function catches internally and now returns
      // a structured { success: false, error } so callers can react.
      const result = await refundCredit("nonexistent-user");
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/user not found/);
    });

    it("uses service-role client (not user-scoped)", async () => {
      const rpcFn = mockRpc(null, null);
      serviceClientMock = buildQueryClient({
        rpc: rpcFn,
        fromSelectReturn: { data: { credits_balance: 11 }, error: null },
      });

      await refundCredit("user-1", 2);

      // Verify it called the service client (our mock), not a passed-in client
      expect(rpcFn).toHaveBeenCalledWith("refund_credit", {
        target_user_id: "user-1",
        amount: 2,
      });
    });

    it("defaults amount to 1 when not specified", async () => {
      const rpcFn = mockRpc(null, null);
      serviceClientMock = buildQueryClient({
        rpc: rpcFn,
        fromSelectReturn: { data: { credits_balance: 5 }, error: null },
      });

      await refundCredit("user-1");

      expect(rpcFn).toHaveBeenCalledWith("refund_credit", {
        target_user_id: "user-1",
        amount: 1,
      });
    });
  });

  // =========================================================================
  // Credit ledger entry created on refund
  // =========================================================================
  describe("credit ledger entry created on refund", () => {
    it("logs credit change after successful refund", async () => {
      const rpcFn = vi
        .fn()
        // 1st call: refund_credit
        .mockResolvedValueOnce({ data: null, error: null })
        // 2nd call: log_credit_change
        .mockResolvedValueOnce({ data: null, error: null });

      const singleFn = vi.fn().mockResolvedValue({
        data: { credits_balance: 11 },
        error: null,
      });
      const eqFn = vi.fn().mockReturnValue({ single: singleFn });
      const selectFn = vi.fn().mockReturnValue({ eq: eqFn });

      serviceClientMock = {
        rpc: rpcFn,
        from: vi.fn().mockReturnValue({ select: selectFn }),
      } as unknown as ReturnType<typeof buildQueryClient>;

      await refundCredit("user-1", 1);

      // Wait for the async ledger write
      await vi.waitFor(() => {
        expect(rpcFn).toHaveBeenCalledWith("log_credit_change", {
          p_user_id: "user-1",
          p_delta: 1,
          p_balance_after: 11,
          p_reason: "refund",
          p_source: "system",
        });
      });
    });

    it("skips ledger if profile fetch returns null", async () => {
      const rpcFn = vi.fn().mockResolvedValueOnce({ data: null, error: null }); // refund_credit

      const singleFn = vi.fn().mockResolvedValue({
        data: null, // profile not found
        error: null,
      });
      const eqFn = vi.fn().mockReturnValue({ single: singleFn });
      const selectFn = vi.fn().mockReturnValue({ eq: eqFn });

      serviceClientMock = {
        rpc: rpcFn,
        from: vi.fn().mockReturnValue({ select: selectFn }),
      } as unknown as ReturnType<typeof buildQueryClient>;

      await refundCredit("user-1", 1);

      // log_credit_change should never be called since profile is null
      expect(rpcFn).toHaveBeenCalledTimes(1); // only refund_credit
      expect(rpcFn).not.toHaveBeenCalledWith("log_credit_change", expect.anything());
    });
  });

  // =========================================================================
  // logCreditChange
  // =========================================================================
  describe("logCreditChange", () => {
    it("calls log_credit_change RPC with correct params", async () => {
      const rpcFn = mockRpc(null, null);
      serviceClientMock = buildQueryClient({ rpc: rpcFn });

      await logCreditChange("user-1", -1, 9, "spend", "api");

      expect(rpcFn).toHaveBeenCalledWith("log_credit_change", {
        p_user_id: "user-1",
        p_delta: -1,
        p_balance_after: 9,
        p_reason: "spend",
        p_source: "api",
      });
    });

    it('defaults source to "system"', async () => {
      const rpcFn = mockRpc(null, null);
      serviceClientMock = buildQueryClient({ rpc: rpcFn });

      await logCreditChange("user-1", 5, 15, "admin_grant");

      expect(rpcFn).toHaveBeenCalledWith(
        "log_credit_change",
        expect.objectContaining({
          p_source: "system",
        }),
      );
    });

    it("never throws even if RPC fails", async () => {
      serviceClientMock = buildQueryClient({
        rpc: vi.fn().mockRejectedValue(new Error("DB on fire")),
      });

      // Should swallow the error
      await expect(logCreditChange("user-1", -1, 0, "spend")).resolves.toBeUndefined();
    });
  });

  // =========================================================================
  // adminAdjustCredits
  // =========================================================================
  describe("adminAdjustCredits", () => {
    it("grants credits via admin_adjust_credits RPC", async () => {
      const rpcFn = vi
        .fn()
        .mockResolvedValueOnce({ data: null, error: null })
        // log_credit_change after adjust
        .mockResolvedValueOnce({ data: null, error: null });

      serviceClientMock = buildQueryClient({
        rpc: rpcFn,
        fromSelectReturn: { data: { credits_balance: 50 }, error: null },
      });

      const result = await adminAdjustCredits("user-1", 10);

      expect(result.success).toBe(true);
      expect(rpcFn).toHaveBeenCalledWith("admin_adjust_credits", {
        target_user_id: "user-1",
        delta: 10,
      });
    });

    it("falls back to increment_credits when admin_adjust_credits fails", async () => {
      const rpcFn = vi
        .fn()
        // 1st: admin_adjust_credits fails
        .mockResolvedValueOnce({ data: null, error: { message: "function does not exist" } })
        // 2nd: increment_credits succeeds
        .mockResolvedValueOnce({ data: null, error: null })
        // 3rd: log_credit_change
        .mockResolvedValueOnce({ data: null, error: null });

      serviceClientMock = buildQueryClient({
        rpc: rpcFn,
        fromSelectReturn: { data: { credits_balance: 20 }, error: null },
      });

      const result = await adminAdjustCredits("user-1", 5);

      expect(result.success).toBe(true);
      expect(rpcFn).toHaveBeenCalledWith("increment_credits", {
        row_id: "user-1",
        amount: 5,
      });
    });

    it("returns failure when both RPCs fail", async () => {
      const rpcFn = vi
        .fn()
        .mockResolvedValueOnce({ data: null, error: { message: "nope" } })
        .mockResolvedValueOnce({ data: null, error: { message: "also nope" } });

      serviceClientMock = buildQueryClient({ rpc: rpcFn });

      const result = await adminAdjustCredits("user-1", 10);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to adjust credits");
    });

    it("returns internal error on thrown exception", async () => {
      serviceClientMock = buildQueryClient({
        rpc: vi.fn().mockRejectedValue(new Error("network down")),
      });

      const result = await adminAdjustCredits("user-1", 10);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Internal error adjusting credits");
    });

    it("handles negative delta for revoking credits", async () => {
      const rpcFn = vi
        .fn()
        .mockResolvedValueOnce({ data: null, error: null }) // admin_adjust_credits
        .mockResolvedValueOnce({ data: null, error: null }); // log_credit_change

      serviceClientMock = buildQueryClient({
        rpc: rpcFn,
        fromSelectReturn: { data: { credits_balance: 5 }, error: null },
      });

      const result = await adminAdjustCredits("user-1", -3);

      expect(result.success).toBe(true);
      expect(rpcFn).toHaveBeenCalledWith("admin_adjust_credits", {
        target_user_id: "user-1",
        delta: -3,
      });
    });
  });

  // =========================================================================
  // Legacy fallback path edge cases
  // =========================================================================
  describe("legacy fallback path", () => {
    it("legacy check_and_decrement_credits failure returns correct shape", async () => {
      process.env.ALLOW_LEGACY_CREDIT_FALLBACK = "1";
      // Modern RPC on service client → function does not exist.
      serviceClientMock = buildQueryClient({
        rpc: mockRpc(null, {
          message: "function refresh_and_decrement_credits does not exist",
        }),
      });
      // Legacy RPC on queryClient → returns failure shape.
      const rpcFn = vi.fn().mockResolvedValueOnce({
        data: { success: false, current_balance: 0, error: "No credits" },
        error: null,
      });

      const profileSingleFn = vi.fn().mockResolvedValue({
        data: {
          credits_refreshed_at: new Date().toISOString(),
          credits_balance: 0,
        },
        error: null,
      });
      const profileEqFn = vi.fn().mockReturnValue({ single: profileSingleFn });

      const settingsSingleFn = vi.fn().mockResolvedValue({
        data: { daily_free_limit: 2 },
        error: null,
      });

      const fromFn = vi.fn().mockImplementation((table: string) => {
        if (table === "site_settings") {
          return {
            select: vi.fn().mockReturnValue({
              single: settingsSingleFn,
              eq: vi.fn(),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: profileEqFn,
            single: vi.fn(),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      });

      const client = {
        rpc: rpcFn,
        from: fromFn,
      } as unknown as import("@supabase/supabase-js").SupabaseClient;

      const result = await checkAndDecrementCredits("user-1", "free", client);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.error).toBe("No credits");
      delete process.env.ALLOW_LEGACY_CREDIT_FALLBACK;
    });

    it("pro tier skips daily reset in legacy fallback", async () => {
      process.env.ALLOW_LEGACY_CREDIT_FALLBACK = "1";
      serviceClientMock = buildQueryClient({
        rpc: mockRpc(null, {
          message: "function refresh_and_decrement_credits does not exist",
        }),
      });
      const rpcFn = vi.fn().mockResolvedValueOnce({
        data: { success: true, current_balance: 50 },
        error: null,
      });

      const client = {
        rpc: rpcFn,
        from: vi.fn(), // should NOT be called for pro tier
      } as unknown as import("@supabase/supabase-js").SupabaseClient;

      const result = await checkAndDecrementCredits("user-pro", "pro", client);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(50);
      // from() should not be called since pro tier skips daily reset
      expect(client.from).not.toHaveBeenCalled();
      delete process.env.ALLOW_LEGACY_CREDIT_FALLBACK;
    });

    it("legacy fallback handles null fallbackRes gracefully", async () => {
      process.env.ALLOW_LEGACY_CREDIT_FALLBACK = "1";
      serviceClientMock = buildQueryClient({
        rpc: mockRpc(null, {
          message: "function refresh_and_decrement_credits does not exist",
        }),
      });
      const rpcFn = vi.fn().mockResolvedValueOnce({
        data: null, // null response from check_and_decrement_credits
        error: null,
      });

      const client = {
        rpc: rpcFn,
        from: vi.fn(),
      } as unknown as import("@supabase/supabase-js").SupabaseClient;

      const result = await checkAndDecrementCredits("user-1", "pro", client);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.error).toBe("Insufficient credits or profile not found");
      delete process.env.ALLOW_LEGACY_CREDIT_FALLBACK;
    });
  });
});
