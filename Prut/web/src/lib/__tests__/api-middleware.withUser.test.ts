import { describe, it, expect, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { withUser, type WithUserDeps } from "@/lib/api-middleware";

// --- fakes -----------------------------------------------------------------

const rlsSentinel = { __kind: "rls" } as unknown as SupabaseClient;
const serviceSentinel = { __kind: "service" } as unknown as SupabaseClient;

function makeUser(overrides: Partial<User> = {}): User {
  return { id: "u1", aud: "authenticated", ...overrides } as User;
}

function makeDeps(overrides: Partial<WithUserDeps> = {}): WithUserDeps {
  return {
    resolveAuth: vi.fn(async () => ({ status: "ok", user: makeUser(), isBearer: false }) as const),
    createRlsClient: vi.fn(async () => rlsSentinel),
    createServiceClient: vi.fn(() => serviceSentinel),
    resolveTier: vi.fn(async () => ({ tier: "free" as const, isAdmin: false })),
    checkRateLimit: vi.fn(async () => ({ success: true, limit: 10, remaining: 9, reset: 0 })),
    chargeCredits: vi.fn(async () => ({ allowed: true, remaining: 5 })),
    refundCredits: vi.fn(async () => {}),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    ...overrides,
  };
}

function makeReq(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/test", { headers });
}

const ok = async () => NextResponse.json({ ok: true });

// --- auth ------------------------------------------------------------------

describe("withUser · auth", () => {
  it("401 auth_required when no user and guests not allowed", async () => {
    const deps = makeDeps({
      resolveAuth: vi.fn(async () => ({ status: "ok", user: null, isBearer: false }) as const),
    });
    const handler = vi.fn(ok);
    const res = await withUser(handler, { rateLimit: "favorites" }, deps)(makeReq(), {});
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("auth_required");
    expect(handler).not.toHaveBeenCalled();
  });

  it("allows guest (ctx.user null) when allowGuest", async () => {
    const deps = makeDeps({
      resolveAuth: vi.fn(async () => ({ status: "ok", user: null, isBearer: false }) as const),
    });
    let seen: User | null = makeUser();
    const handler = vi.fn(async (_req, ctx) => {
      seen = ctx.user;
      return ok();
    });
    const res = await withUser(
      handler,
      { rateLimit: "guest", allowGuest: true },
      deps,
    )(makeReq({ "x-real-ip": "1.2.3.4" }), {});
    expect(res.status).toBe(200);
    expect(seen).toBeNull();
  });

  it("cookie auth → ctx.db is the RLS client", async () => {
    const deps = makeDeps();
    let db: SupabaseClient | undefined;
    const handler = vi.fn(async (_req, ctx) => {
      db = ctx.db;
      return ok();
    });
    await withUser(handler, { rateLimit: "favorites" }, deps)(makeReq(), {});
    expect(db).toBe(rlsSentinel);
  });

  it("bearer auth → ctx.db is the service-role client", async () => {
    const deps = makeDeps({
      resolveAuth: vi.fn(async () => ({ status: "ok", user: makeUser(), isBearer: true }) as const),
    });
    let db: SupabaseClient | undefined;
    const handler = vi.fn(async (_req, ctx) => {
      db = ctx.db;
      return ok();
    });
    await withUser(
      handler,
      { rateLimit: "favorites" },
      deps,
    )(makeReq({ authorization: "Bearer t" }), {});
    expect(db).toBe(serviceSentinel);
  });

  it("401 invalid_token when bearer token is rejected", async () => {
    const deps = makeDeps({
      resolveAuth: vi.fn(async () => ({ status: "invalid_token" }) as const),
    });
    const handler = vi.fn(ok);
    const res = await withUser(
      handler,
      { rateLimit: "favorites" },
      deps,
    )(makeReq({ authorization: "Bearer bad" }), {});
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("invalid_token");
    expect(handler).not.toHaveBeenCalled();
  });
});

// --- tier resolution -------------------------------------------------------

describe("withUser · tier resolution is lazy", () => {
  it("does not resolve tier for a static-bucket, no-credit route", async () => {
    const deps = makeDeps();
    await withUser(ok, { rateLimit: "favorites" }, deps)(makeReq(), {});
    expect(deps.resolveTier).not.toHaveBeenCalled();
  });

  it("resolves tier for a tier-varying bucket and selects by tier", async () => {
    const deps = makeDeps({
      resolveTier: vi.fn(async () => ({ tier: "pro" as const, isAdmin: false })),
    });
    await withUser(
      ok,
      { rateLimit: (t) => (t === "pro" ? "chainPro" : "chainFree") },
      deps,
    )(makeReq(), {});
    expect(deps.resolveTier).toHaveBeenCalledTimes(1);
    expect(deps.checkRateLimit).toHaveBeenCalledWith("u1", "chainPro");
  });
});

// --- rate limiting ---------------------------------------------------------

describe("withUser · rate limiting", () => {
  it("keys on user id and 429s on failure with Retry-After", async () => {
    const deps = makeDeps({
      checkRateLimit: vi.fn(async () => ({ success: false, limit: 10, remaining: 0, reset: 999 })),
    });
    const handler = vi.fn(ok);
    const res = await withUser(handler, { rateLimit: "favorites" }, deps)(makeReq(), {});
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("999");
    expect(handler).not.toHaveBeenCalled();
  });

  it("keys guests on validated client IP", async () => {
    const deps = makeDeps({
      resolveAuth: vi.fn(async () => ({ status: "ok", user: null, isBearer: false }) as const),
    });
    await withUser(
      ok,
      { rateLimit: "guest", allowGuest: true },
      deps,
    )(makeReq({ "x-real-ip": "9.9.9.9" }), {});
    expect(deps.checkRateLimit).toHaveBeenCalledWith("9.9.9.9", "guest");
  });

  it("400 unidentified_source for a guest with no usable IP", async () => {
    const deps = makeDeps({
      resolveAuth: vi.fn(async () => ({ status: "ok", user: null, isBearer: false }) as const),
    });
    const res = await withUser(ok, { rateLimit: "guest", allowGuest: true }, deps)(makeReq(), {});
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("unidentified_source");
  });

  it("skips rate limiting when rateLimit is 'none'", async () => {
    const deps = makeDeps();
    await withUser(ok, { rateLimit: "none" }, deps)(makeReq(), {});
    expect(deps.checkRateLimit).not.toHaveBeenCalled();
  });

  it("uses a custom rate-limit key when rateLimitKey is provided", async () => {
    const deps = makeDeps();
    await withUser(
      ok,
      { rateLimit: "free", rateLimitKey: ({ user }) => `achievement:${user!.id}` },
      deps,
    )(makeReq(), {});
    expect(deps.checkRateLimit).toHaveBeenCalledWith("achievement:u1", "free");
  });

  it("passes the client IP to rateLimitKey for guests", async () => {
    const deps = makeDeps({
      resolveAuth: vi.fn(async () => ({ status: "ok", user: null, isBearer: false }) as const),
    });
    await withUser(
      ok,
      { rateLimit: "guest", allowGuest: true, rateLimitKey: ({ ip }) => `evt:${ip}` },
      deps,
    )(makeReq({ "x-real-ip": "5.5.5.5" }), {});
    expect(deps.checkRateLimit).toHaveBeenCalledWith("evt:5.5.5.5", "guest");
  });
});

// --- credits: charged only on a 2xx ---------------------------------------

describe("withUser · credits", () => {
  it("402 insufficient_credits with balance; handler not called", async () => {
    const deps = makeDeps({
      chargeCredits: vi.fn(async () => ({ allowed: false, remaining: 0, error: "no" })),
    });
    const handler = vi.fn(ok);
    const res = await withUser(
      handler,
      { rateLimit: "chainFree", credits: 2 },
      deps,
    )(makeReq(), {});
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.code).toBe("insufficient_credits");
    expect(body.balance).toBe(0);
    expect(handler).not.toHaveBeenCalled();
    expect(deps.refundCredits).not.toHaveBeenCalled();
  });

  it("keeps the charge on a 2xx (no refund)", async () => {
    const deps = makeDeps();
    await withUser(ok, { rateLimit: "chainFree", credits: 2 }, deps)(makeReq(), {});
    expect(deps.chargeCredits).toHaveBeenCalledTimes(1);
    expect(deps.refundCredits).not.toHaveBeenCalled();
  });

  it("refunds when the handler throws, and returns 500", async () => {
    const deps = makeDeps();
    const handler = vi.fn(async () => {
      throw new Error("boom");
    });
    const res = await withUser(
      handler,
      { rateLimit: "chainFree", credits: 2 },
      deps,
    )(makeReq(), {});
    expect(res.status).toBe(500);
    expect(deps.refundCredits).toHaveBeenCalledTimes(1);
  });

  it("refunds when the handler returns >= 400, passing the response through", async () => {
    const deps = makeDeps();
    const handler = vi.fn(async () => NextResponse.json({ error: "bad" }, { status: 400 }));
    const res = await withUser(
      handler,
      { rateLimit: "chainFree", credits: 2 },
      deps,
    )(makeReq(), {});
    expect(res.status).toBe(400);
    expect(deps.refundCredits).toHaveBeenCalledTimes(1);
  });

  it("exposes an idempotent ctx.refund() for streaming failures", async () => {
    const deps = makeDeps();
    const handler = vi.fn(async (_req, ctx) => {
      await ctx.refund();
      await ctx.refund();
      return ok();
    });
    await withUser(handler, { rateLimit: "chainFree", credits: 2 }, deps)(makeReq(), {});
    expect(deps.refundCredits).toHaveBeenCalledTimes(1);
  });
});

// --- admin bypass ----------------------------------------------------------

describe("withUser · admin bypass", () => {
  it("skips credit charge and rate limit for admins, and logs it", async () => {
    const deps = makeDeps({
      resolveTier: vi.fn(async () => ({ tier: "admin" as const, isAdmin: true })),
    });
    const res = await withUser(ok, { rateLimit: "chainFree", credits: 2 }, deps)(makeReq(), {});
    expect(res.status).toBe(200);
    expect(deps.chargeCredits).not.toHaveBeenCalled();
    expect(deps.checkRateLimit).not.toHaveBeenCalled();
    expect(deps.logger.info).toHaveBeenCalled();
  });
});

// --- unhandled errors ------------------------------------------------------

describe("withUser · error handling", () => {
  it("catches an unhandled throw as a shaped 500 even without credits", async () => {
    const deps = makeDeps();
    const handler = vi.fn(async () => {
      throw new Error("kaboom");
    });
    const res = await withUser(handler, { rateLimit: "favorites" }, deps)(makeReq(), {});
    expect(res.status).toBe(500);
    expect((await res.json()).code).toBe("server_error");
  });
});
