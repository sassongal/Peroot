/**
 * The persona control panel (master plan 3.3).
 *
 * The two behaviours worth pinning are the ones a refactor would quietly
 * break: the opt-out must be recorded even for a user who has never been
 * analyzed (no row yet, so an UPDATE would touch nothing and report success),
 * and every verb must run on the caller's own RLS-scoped client, never the
 * service client.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const calls: { op: string; table: string; arg?: unknown }[] = [];
let personaRow: Record<string, unknown> | null = null;

const db = {
  from(table: string) {
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            calls.push({ op: "select", table });
            return { data: personaRow, error: null };
          },
        }),
      }),
      upsert(row: Record<string, unknown>) {
        calls.push({ op: "upsert", table, arg: row });
        personaRow = { ...(personaRow ?? {}), ...row };
        return {
          select: () => ({ maybeSingle: async () => ({ data: personaRow, error: null }) }),
        };
      },
    };
  },
};

const enqueued: { type: string; payload: unknown }[] = [];

vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/jobs/queue", () => ({
  enqueueJob: async (type: string, payload: unknown) => {
    enqueued.push({ type, payload });
  },
}));
// A service client on this path would be a bug, so importing it fails loudly.
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => {
    throw new Error("the persona routes must stay on the caller's RLS client");
  },
}));
vi.mock("@/lib/api-middleware", () => ({
  withUser: (handler: (req: unknown, ctx: unknown) => Promise<Response>) => (req: unknown) =>
    handler(req, { user: { id: "u1" }, db }),
}));

const { GET, PATCH, POST } = await import("../route");

function call(fn: unknown, body?: unknown) {
  return (fn as (r: unknown) => Promise<Response>)({ json: async () => body });
}

describe("/api/me/persona", () => {
  beforeEach(() => {
    calls.length = 0;
    enqueued.length = 0;
    personaRow = null;
  });

  it("returns null rather than failing when the user has no persona yet", async () => {
    const res = await call(GET);
    expect(res.status).toBe(200);
    expect((await res.json()).persona).toBeNull();
  });

  it("records an opt-out for a user who has never been analyzed", async () => {
    const res = await call(PATCH, { injection_enabled: false });
    expect(res.status).toBe(200);
    // An UPDATE would have matched nothing and reported success, leaving the
    // persona injected for someone who asked for it to stop.
    const upsert = calls.find((c) => c.op === "upsert");
    expect(upsert).toBeTruthy();
    expect(upsert!.arg).toMatchObject({ user_id: "u1", injection_enabled: false });
  });

  it("refuses an empty patch", async () => {
    const res = await call(PATCH, {});
    expect(res.status).toBe(422);
    expect(calls.some((c) => c.op === "upsert")).toBe(false);
  });

  it("refuses a brief longer than the analyzer's own cap", async () => {
    const res = await call(PATCH, { personality_brief: "א".repeat(1001) });
    expect(res.status).toBe(422);
  });

  it("queues an analysis instead of claiming one ran", async () => {
    const res = await call(POST);
    expect(await res.json()).toEqual({ queued: true });
    expect(enqueued).toEqual([{ type: "style_analysis", payload: { userId: "u1" } }]);
  });
});
