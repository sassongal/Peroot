import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";

const { redisGetdel, redisSet, mockFrom } = vi.hoisted(() => ({
  redisGetdel: vi.fn(),
  redisSet: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/redis", () => ({
  redis: { getdel: redisGetdel, set: redisSet },
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: mockFrom }),
}));
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}));

import {
  verifyPkce,
  isAllowedRedirectUri,
  createAuthCode,
  consumeAuthCode,
  issueTokens,
  validateOAuthToken,
  OAUTH_ACCESS_PATTERN,
  OAUTH_REFRESH_PATTERN,
} from "@/lib/connect/oauth";
import { hashApiKey } from "@/lib/api-keys";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("verifyPkce", () => {
  it("accepts a matching S256 verifier/challenge pair", () => {
    const verifier = "a".repeat(43);
    const challenge = createHash("sha256").update(verifier, "ascii").digest("base64url");
    expect(verifyPkce(verifier, challenge)).toBe(true);
  });

  it("rejects a wrong verifier and malformed input", () => {
    const challenge = createHash("sha256").update("a".repeat(43), "ascii").digest("base64url");
    expect(verifyPkce("b".repeat(43), challenge)).toBe(false);
    expect(verifyPkce("short", challenge)).toBe(false);
    expect(verifyPkce("bad chars!".padEnd(43, "x"), challenge)).toBe(false);
  });
});

describe("isAllowedRedirectUri", () => {
  it("allows https anywhere and http on localhost only", () => {
    expect(isAllowedRedirectUri("https://claude.ai/api/mcp/auth_callback")).toBe(true);
    expect(isAllowedRedirectUri("http://localhost:3334/oauth/callback")).toBe(true);
    expect(isAllowedRedirectUri("http://127.0.0.1:8080/cb")).toBe(true);
    expect(isAllowedRedirectUri("http://evil.com/cb")).toBe(false);
    expect(isAllowedRedirectUri("javascript:alert(1)")).toBe(false);
    expect(isAllowedRedirectUri("not-a-url")).toBe(false);
  });
});

describe("auth codes", () => {
  it("creates a code in Redis with a 10-minute TTL", async () => {
    const payload = {
      userId: "u1",
      clientId: "pcl_x",
      redirectUri: "https://claude.ai/cb",
      codeChallenge: "ch",
      scope: "connect",
    };
    const code = await createAuthCode(payload);
    expect(code.startsWith("pac_")).toBe(true);
    expect(redisSet).toHaveBeenCalledWith(expect.stringContaining("connect:oauth:code:"), payload, {
      ex: 600,
    });
    // The Redis key stores a HASH of the code, never the code itself.
    expect(redisSet.mock.calls[0][0]).not.toContain(code);
  });

  it("consume is one-time via atomic GETDEL (no TOCTOU window)", async () => {
    redisGetdel.mockResolvedValue({ userId: "u1" });
    const payload = await consumeAuthCode("pac_abc");
    expect(payload).toEqual({ userId: "u1" });
    expect(redisGetdel).toHaveBeenCalledTimes(1);
  });

  it("consume returns null for an unknown/expired code", async () => {
    redisGetdel.mockResolvedValue(null);
    expect(await consumeAuthCode("pac_missing")).toBeNull();
  });
});

describe("issueTokens", () => {
  it("issues pot_/por_ pair and stores only hashes", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert });
    const t = await issueTokens("u1", "pcl_x");
    expect(t.access_token).toMatch(OAUTH_ACCESS_PATTERN);
    expect(t.refresh_token).toMatch(OAUTH_REFRESH_PATTERN);
    expect(t.token_type).toBe("Bearer");
    expect(t.expires_in).toBe(30 * 24 * 60 * 60);

    const rows = insert.mock.calls[0][0] as Array<Record<string, string>>;
    expect(rows).toHaveLength(2);
    expect(rows[0].token_hash).toBe(hashApiKey(t.access_token));
    expect(rows[1].token_hash).toBe(hashApiKey(t.refresh_token));
    for (const row of rows) {
      expect(JSON.stringify(row)).not.toContain(t.access_token);
      expect(JSON.stringify(row)).not.toContain(t.refresh_token);
    }
  });
});

describe("validateOAuthToken", () => {
  const raw = "pot_" + "ab".repeat(20);

  function tokenRow(overrides: Record<string, unknown> = {}) {
    return {
      id: "row1",
      token_hash: hashApiKey(raw),
      token_type: "access",
      user_id: "u1",
      client_id: "pcl_x",
      scope: "connect",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      revoked: false,
      ...overrides,
    };
  }

  function mockSelectReturning(rows: unknown[], error: unknown = null) {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      then: undefined as unknown,
    };
    // The lookup awaits the eq() chain; resolve it like a Supabase response.
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ data: rows, error }),
          }),
        }),
      }),
      update: () => ({
        eq: () => ({ then: (fn: (r: { error: null }) => void) => fn({ error: null }) }),
      }),
    });
    return chain;
  }

  it("rejects malformed tokens without touching the DB", async () => {
    expect(await validateOAuthToken("prk_live_" + "a".repeat(40))).toEqual({ valid: false });
    expect(await validateOAuthToken("pot_short")).toEqual({ valid: false });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("accepts a live token and returns the user", async () => {
    mockSelectReturning([tokenRow()]);
    const r = await validateOAuthToken(raw);
    expect(r.valid).toBe(true);
    expect(r.userId).toBe("u1");
    expect(r.clientId).toBe("pcl_x");
  });

  it("rejects an expired token", async () => {
    mockSelectReturning([tokenRow({ expires_at: new Date(Date.now() - 1000).toISOString() })]);
    expect((await validateOAuthToken(raw)).valid).toBe(false);
  });

  it("rejects a token whose hash does not match (prefix collision)", async () => {
    mockSelectReturning([tokenRow({ token_hash: hashApiKey("pot_" + "cd".repeat(20)) })]);
    expect((await validateOAuthToken(raw)).valid).toBe(false);
  });

  it("fails closed on a DB lookup error", async () => {
    mockSelectReturning([], { message: "boom" });
    expect((await validateOAuthToken(raw)).valid).toBe(false);
  });
});
