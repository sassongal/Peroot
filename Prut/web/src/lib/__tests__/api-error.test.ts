import { describe, it, expect } from "vitest";
import { apiError, errors } from "@/lib/api-error";

describe("apiError primitive", () => {
  it("sets status, error, and snake_case code on the body", async () => {
    const res = apiError({ status: 418, error: "אני קומקום", code: "teapot" });
    expect(res.status).toBe(418);
    const body = await res.json();
    expect(body).toEqual({ error: "אני קומקום", code: "teapot" });
  });

  it("merges extra fields into the body", async () => {
    const res = apiError({ status: 402, error: "x", code: "c", extra: { balance: 7 } });
    const body = await res.json();
    expect(body.balance).toBe(7);
  });

  it("applies provided headers", () => {
    const res = apiError({ status: 429, error: "x", code: "c", headers: { "Retry-After": "60" } });
    expect(res.headers.get("Retry-After")).toBe("60");
  });
});

describe("errors — Hebrew message + snake_case code convention", () => {
  it("unauthorized → 401 auth_required, Hebrew message", async () => {
    const res = errors.unauthorized();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe("auth_required");
    expect(body.error).toMatch(/[֐-׿]/); // contains Hebrew
  });

  it("invalidToken → 401 invalid_token", async () => {
    const res = errors.invalidToken();
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe("invalid_token");
  });

  it("forbidden → 403 forbidden", async () => {
    const res = errors.forbidden();
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("forbidden");
  });

  it("insufficientCredits → 402 insufficient_credits with balance", async () => {
    const res = errors.insufficientCredits(3);
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.code).toBe("insufficient_credits");
    expect(body.balance).toBe(3);
  });

  it("rateLimited → 429 rate_limited with Retry-After header", async () => {
    const res = errors.rateLimited({ reset: 1234 });
    expect(res.status).toBe(429);
    expect((await res.json()).code).toBe("rate_limited");
    expect(res.headers.get("Retry-After")).toBe("1234");
  });

  it("badRequest → 400, custom message, default bad_request code", async () => {
    const res = errors.badRequest("שדה חסר");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("שדה חסר");
    expect(body.code).toBe("bad_request");
  });

  it("internal → 500 server_error", async () => {
    const res = errors.internal();
    expect(res.status).toBe(500);
    expect((await res.json()).code).toBe("server_error");
  });

  it("messages are overridable", async () => {
    const res = errors.unauthorized("התחבר בבקשה");
    expect((await res.json()).error).toBe("התחבר בבקשה");
  });
});
