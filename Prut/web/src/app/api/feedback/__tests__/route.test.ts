/**
 * Contract test for the feedback endpoint (master plan 3.9).
 *
 * Two behaviours are load bearing and easy to break silently:
 *
 *   1. A guest may vote. The row is written with the service client because
 *      prompt_feedback's INSERT policy is `auth.uid() = user_id`, so an
 *      anonymous write through the SSR client is refused by RLS and the vote
 *      disappears with a 500 the user never sees.
 *   2. A reason only travels with a rejection. A thumbs-up carrying a stale
 *      reason from a previous render would poison the only signal we have
 *      about why results get rejected.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const inserts: { client: "user" | "service"; row: Record<string, unknown> }[] = [];

function makeDb(client: "user" | "service") {
  return {
    from: () => ({
      insert: async (row: Record<string, unknown>) => {
        inserts.push({ client, row });
        return { error: null };
      },
    }),
  };
}

vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => makeDb("service") }));

// The real withUser owns auth; here it hands the handler whatever the test set.
let currentUser: { id: string } | null = null;
vi.mock("@/lib/api-middleware", () => ({
  withUser: (handler: (req: unknown, ctx: unknown) => Promise<Response>) => (req: unknown) =>
    handler(req, { user: currentUser, db: makeDb("user") }),
}));

const { POST } = await import("../route");

function post(body: unknown) {
  return (POST as unknown as (r: unknown) => Promise<Response>)({
    json: async () => body,
  });
}

describe("POST /api/feedback", () => {
  beforeEach(() => {
    inserts.length = 0;
    currentUser = null;
  });

  it("accepts a guest vote and writes it with the service client", async () => {
    const res = await post({ rating: -1, reason: "too_short" });
    expect(res.status).toBe(200);
    expect(inserts).toHaveLength(1);
    // RLS would refuse this row through the user client.
    expect(inserts[0].client).toBe("service");
    expect(inserts[0].row.user_id).toBeNull();
    expect(inserts[0].row.reason).toBe("too_short");
  });

  it("writes a signed-in vote through the user client, under RLS", async () => {
    currentUser = { id: "u1" };
    const res = await post({ rating: 1 });
    expect(res.status).toBe(200);
    expect(inserts[0].client).toBe("user");
    expect(inserts[0].row.user_id).toBe("u1");
  });

  it("drops a reason sent alongside a thumbs-up", async () => {
    currentUser = { id: "u1" };
    await post({ rating: 1, reason: "too_generic" });
    expect(inserts[0].row.reason).toBeNull();
  });

  it("rejects a reason the database constraint would refuse", async () => {
    const res = await post({ rating: -1, reason: "just_bad" });
    expect(res.status).toBe(422);
    expect(inserts).toHaveLength(0);
  });

  it("rejects a rating that is neither 1 nor -1", async () => {
    const res = await post({ rating: 5 });
    expect(res.status).toBe(422);
    expect(inserts).toHaveLength(0);
  });
});
