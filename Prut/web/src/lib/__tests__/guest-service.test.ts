/**
 * Guest service tests — Redis-backed rolling 24h quota for anonymous users.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Two stores: one for hash-backed guest state, one for legacy JSON/string keys
// and the IP backup map.
const redisHashStore = new Map<string, Record<string, string>>();
const redisStringStore = new Map<string, string>();

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn(async (key: string) => {
      const v = redisStringStore.get(key);
      if (!v) return null;
      try {
        return JSON.parse(v);
      } catch {
        return v;
      }
    }),
    set: vi.fn(async (key: string, value: string) => {
      redisStringStore.set(key, value);
      return "OK";
    }),
    hgetall: vi.fn(async (key: string) => redisHashStore.get(key) ?? null),
    hset: vi.fn(async (key: string, obj: Record<string, string | number>) => {
      const existing = redisHashStore.get(key) ?? {};
      for (const [k, v] of Object.entries(obj)) existing[k] = String(v);
      redisHashStore.set(key, existing);
      return Object.keys(obj).length;
    }),
    expire: vi.fn(async () => 1),
    // Minimal in-memory emulation of the Lua decrement script used by
    // checkAndDecrementGuestCredits.
    eval: vi.fn(
      async (
        _script: string,
        keys: string[],
        args: string[],
      ): Promise<[number, number, number]> => {
        const key = keys[0];
        const now = Number(args[0]);
        const window = Number(args[1]);
        const limit = Number(args[2]);
        const existing = redisHashStore.get(key) ?? {};
        let b = existing.b !== undefined ? Number(existing.b) : limit;
        const t = existing.t !== undefined ? Number(existing.t) : 0;
        if (t > 0 && now - t >= window) b = limit;
        if (b < 1) return [0, b, t];
        b -= 1;
        redisHashStore.set(key, { b: String(b), t: String(now) });
        return [1, b, now];
      },
    ),
  },
}));

import {
  resolveGuestId,
  checkAndDecrementGuestCredits,
  getGuestQuotaStatus,
  GUEST_CONSTANTS,
} from "../guest-service";

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/", { headers });
}

beforeEach(() => {
  redisHashStore.clear();
  redisStringStore.clear();
  vi.clearAllMocks();
});

describe("resolveGuestId", () => {
  it("creates a new UUID when cookie is missing", async () => {
    const { id, needsCookie } = await resolveGuestId(makeRequest());
    expect(needsCookie).toBe(true);
    expect(id).toMatch(/^[a-f0-9-]{36}$/i);
  });

  it("reuses cookie id when present and valid", async () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const { id, needsCookie } = await resolveGuestId(
      makeRequest({ cookie: `peroot_guest_id=${uuid}` }),
    );
    expect(id).toBe(uuid);
    expect(needsCookie).toBe(false);
  });

  it("rejects malformed cookie value and issues a new id", async () => {
    const { id, needsCookie } = await resolveGuestId(
      makeRequest({ cookie: "peroot_guest_id=not-a-uuid" }),
    );
    expect(id).not.toBe("not-a-uuid");
    expect(needsCookie).toBe(true);
  });

  it("falls back to IP backup when cookie is missing", async () => {
    const backedUp = "550e8400-e29b-41d4-a716-446655440000";
    // Pre-seed the IP backup entry — key format matches hashIp() output
    const req = makeRequest({ "x-forwarded-for": "1.2.3.4" });
    // First call seeds the IP backup via cookie path
    await resolveGuestId(
      makeRequest({ cookie: `peroot_guest_id=${backedUp}`, "x-forwarded-for": "1.2.3.4" }),
    );
    // Now a cookie-less request from same IP should recover the same id
    const { id, needsCookie } = await resolveGuestId(req);
    expect(id).toBe(backedUp);
    expect(needsCookie).toBe(true);
  });
});

describe("checkAndDecrementGuestCredits", () => {
  it("allows the first prompt for a new guest", async () => {
    const r = await checkAndDecrementGuestCredits("guest-a");
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(0);
    expect(r.refreshAt).toBeInstanceOf(Date);
  });

  it("blocks the second prompt within the 24h window", async () => {
    await checkAndDecrementGuestCredits("guest-b");
    const r = await checkAndDecrementGuestCredits("guest-b");
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
    expect(r.error).toMatch(/exhausted/i);
    expect(r.refreshAt).toBeInstanceOf(Date);
  });

  it("resets balance after 24h rolling window", async () => {
    const pastMs = Date.now() - (GUEST_CONSTANTS.ROLLING_WINDOW_MS + 1000);
    redisHashStore.set("guest:guest-c", { b: "0", t: String(pastMs) });
    const r = await checkAndDecrementGuestCredits("guest-c");
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(0); // 1 - 1 = 0 after the allowed spend
  });
});

describe("getGuestQuotaStatus", () => {
  it("returns full quota for a never-seen guest", async () => {
    const s = await getGuestQuotaStatus("fresh");
    expect(s.remaining).toBe(GUEST_CONSTANTS.DAILY_LIMIT);
    expect(s.refreshAt).toBeNull();
    expect(s.dailyLimit).toBe(GUEST_CONSTANTS.DAILY_LIMIT);
  });

  it("returns refreshAt when quota is exhausted", async () => {
    const now = new Date();
    redisHashStore.set("guest:ex", { b: "0", t: String(now.getTime()) });
    const s = await getGuestQuotaStatus("ex");
    expect(s.remaining).toBe(0);
    expect(s.refreshAt).toBeInstanceOf(Date);
    expect(s.refreshAt!.getTime()).toBeGreaterThan(now.getTime());
  });

  it("returns reset state after rolling window elapses", async () => {
    const pastMs = Date.now() - (GUEST_CONSTANTS.ROLLING_WINDOW_MS + 1000);
    redisHashStore.set("guest:stale", { b: "0", t: String(pastMs) });
    const s = await getGuestQuotaStatus("stale");
    expect(s.remaining).toBe(GUEST_CONSTANTS.DAILY_LIMIT);
    expect(s.refreshAt).toBeNull();
  });
});
