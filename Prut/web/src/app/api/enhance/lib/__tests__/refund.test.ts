import { describe, it, expect, vi, beforeEach } from "vitest";
import { refundEnhanceCredit } from "../refund";
import { refundCredit } from "@/lib/services/credit-service";
import { refundGuestCredit } from "@/lib/guest-service";
import * as Sentry from "@sentry/nextjs";

vi.mock("@/lib/services/credit-service", () => ({
  refundCredit: vi.fn(async () => ({ success: true })),
}));
vi.mock("@/lib/guest-service", () => ({
  refundGuestCredit: vi.fn(async () => undefined),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

const rc = vi.mocked(refundCredit);
const rg = vi.mocked(refundGuestCredit);
const sentry = vi.mocked(Sentry.captureException);

beforeEach(() => {
  rc.mockReset().mockResolvedValue({ success: true });
  rg.mockReset().mockResolvedValue(undefined);
  sentry.mockReset();
});

describe("refundEnhanceCredit — the enhance-flow refund matrix", () => {
  // (userId, guestId, isRefinement) → who gets refunded
  it("authenticated user → refunds the user, never the guest (regardless of guestId/isRefinement)", async () => {
    for (const guestId of [null, "guest-1"]) {
      for (const isRefinement of [false, true]) {
        rc.mockClear();
        rg.mockClear();
        const outcome = await refundEnhanceCredit({ userId: "u1", guestId, isRefinement });
        expect(outcome).toBe("user");
        expect(rc).toHaveBeenCalledExactlyOnceWith("u1");
        expect(rg).not.toHaveBeenCalled();
      }
    }
  });

  it("guest, non-refinement → refunds the guest, never the user", async () => {
    const outcome = await refundEnhanceCredit({
      userId: null,
      guestId: "guest-1",
      isRefinement: false,
    });
    expect(outcome).toBe("guest");
    expect(rg).toHaveBeenCalledExactlyOnceWith("guest-1");
    expect(rc).not.toHaveBeenCalled();
  });

  it("guest, REFINEMENT → refunds no one (guests are not charged for refinements)", async () => {
    const outcome = await refundEnhanceCredit({
      userId: null,
      guestId: "guest-1",
      isRefinement: true,
    });
    expect(outcome).toBe("none");
    expect(rc).not.toHaveBeenCalled();
    expect(rg).not.toHaveBeenCalled();
  });

  it("no user, no guest (e.g. admin) → refunds no one", async () => {
    const outcome = await refundEnhanceCredit({ userId: null, guestId: null, isRefinement: false });
    expect(outcome).toBe("none");
    expect(rc).not.toHaveBeenCalled();
    expect(rg).not.toHaveBeenCalled();
  });

  it("authed refund FAILURE → reports to Sentry with context, still returns 'user'", async () => {
    rc.mockResolvedValue({ success: false, error: "rpc boom" });
    const outcome = await refundEnhanceCredit({
      userId: "u1",
      guestId: null,
      isRefinement: false,
      context: { finishReason: "error" },
    });
    expect(outcome).toBe("user");
    expect(sentry).toHaveBeenCalledOnce();
    const [, opts] = sentry.mock.calls[0] as [unknown, { extra: Record<string, unknown> }];
    expect(opts.extra).toMatchObject({ userId: "u1", finishReason: "error", error: "rpc boom" });
  });

  it("authed refund SUCCESS → does not touch Sentry", async () => {
    await refundEnhanceCredit({ userId: "u1", guestId: null, isRefinement: false });
    expect(sentry).not.toHaveBeenCalled();
  });
});
