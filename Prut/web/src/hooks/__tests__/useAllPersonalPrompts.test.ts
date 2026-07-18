// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useAllPersonalPrompts } from "../useAllPersonalPrompts";
import type { PersonalPrompt } from "@/lib/types";

// ── Supabase client mock ─────────────────────────────────────────────────────
// The hook fetches personal_library rows via a chained query builder ending in
// .limit(...) which is awaited. We record whether it ran and control the result.
const limitMock = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: limitMock,
          }),
        }),
      }),
    }),
  }),
}));

const mkPrompt = (id: string): PersonalPrompt =>
  ({ id, user_id: "u1", title: id, prompt: id }) as unknown as PersonalPrompt;

beforeEach(() => {
  limitMock.mockReset();
});

describe("useAllPersonalPrompts", () => {
  it("guest: returns the full local corpus without fetching from the server", () => {
    const guestItems = [mkPrompt("g1"), mkPrompt("g2"), mkPrompt("g3")];
    const { result } = renderHook(() =>
      useAllPersonalPrompts({ enabled: true, userId: undefined, guestItems, totalCount: 3 }),
    );
    expect(result.current.prompts).toEqual(guestItems);
    expect(result.current.total).toBe(3);
    expect(result.current.loading).toBe(false);
    expect(limitMock).not.toHaveBeenCalled();
  });

  it("server: fetches the full corpus once enabled", async () => {
    const rows = [mkPrompt("a"), mkPrompt("b")];
    limitMock.mockResolvedValue({ data: rows, count: 2, error: null });
    const { result } = renderHook(() =>
      useAllPersonalPrompts({ enabled: true, userId: "u1", guestItems: [], totalCount: 2 }),
    );
    await waitFor(() => expect(result.current.prompts).toHaveLength(2));
    expect(result.current.prompts.map((p) => p.id)).toEqual(["a", "b"]);
    expect(result.current.total).toBe(2);
    expect(limitMock).toHaveBeenCalledTimes(1);
  });

  it("server: does not fetch while disabled (lazy)", () => {
    renderHook(() =>
      useAllPersonalPrompts({ enabled: false, userId: "u1", guestItems: [], totalCount: 0 }),
    );
    expect(limitMock).not.toHaveBeenCalled();
  });

  it("server: reports truncation when the row cap is smaller than the total count", async () => {
    const rows = Array.from({ length: 2 }, (_, i) => mkPrompt(`r${i}`));
    limitMock.mockResolvedValue({ data: rows, count: 5000, error: null });
    const { result } = renderHook(() =>
      useAllPersonalPrompts({ enabled: true, userId: "u1", guestItems: [], totalCount: 5000 }),
    );
    await waitFor(() => expect(result.current.total).toBe(5000));
    expect(result.current.truncatedAt).toEqual({ shown: 2, total: 5000 });
  });
});
