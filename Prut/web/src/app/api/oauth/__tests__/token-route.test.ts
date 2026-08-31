import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockConsume, mockIssue, mockRotate, mockVerifyPkce, mockRateLimit } = vi.hoisted(() => ({
  mockConsume: vi.fn(),
  mockIssue: vi.fn(),
  mockRotate: vi.fn(),
  mockVerifyPkce: vi.fn(),
  mockRateLimit: vi.fn(),
}));

vi.mock("@/lib/connect/oauth", () => ({
  consumeAuthCode: mockConsume,
  issueTokens: mockIssue,
  rotateRefreshToken: mockRotate,
  verifyPkce: mockVerifyPkce,
}));
vi.mock("@/lib/ratelimit", () => ({ checkRateLimit: mockRateLimit }));
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));

import { POST } from "@/app/api/oauth/token/route";

const TOKENS = {
  access_token: "pot_" + "a".repeat(40),
  refresh_token: "por_" + "b".repeat(40),
  token_type: "Bearer",
  expires_in: 2592000,
  scope: "connect",
};

function formReq(params: Record<string, string>) {
  return new Request("http://test/api/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit.mockResolvedValue({ success: true, reset: 0 });
});

describe("POST /api/oauth/token, authorization_code", () => {
  const goodParams = {
    grant_type: "authorization_code",
    code: "pac_x",
    code_verifier: "v".repeat(43),
    client_id: "pcl_1",
    redirect_uri: "https://claude.ai/cb",
  };
  const payload = {
    userId: "u1",
    clientId: "pcl_1",
    redirectUri: "https://claude.ai/cb",
    codeChallenge: "ch",
    scope: "connect",
  };

  it("exchanges a valid code+PKCE for tokens", async () => {
    mockConsume.mockResolvedValue(payload);
    mockVerifyPkce.mockReturnValue(true);
    mockIssue.mockResolvedValue(TOKENS);
    const res = await POST(formReq(goodParams));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.access_token).toBe(TOKENS.access_token);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(mockIssue).toHaveBeenCalledWith("u1", "pcl_1", "connect");
  });

  it("rejects an unknown/replayed code with invalid_grant", async () => {
    mockConsume.mockResolvedValue(null);
    const res = await POST(formReq(goodParams));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_grant");
  });

  it("rejects a client_id mismatch", async () => {
    mockConsume.mockResolvedValue({ ...payload, clientId: "pcl_OTHER" });
    const res = await POST(formReq(goodParams));
    expect((await res.json()).error).toBe("invalid_grant");
  });

  it("rejects a failed PKCE check", async () => {
    mockConsume.mockResolvedValue(payload);
    mockVerifyPkce.mockReturnValue(false);
    const res = await POST(formReq(goodParams));
    expect((await res.json()).error).toBe("invalid_grant");
    expect(mockIssue).not.toHaveBeenCalled();
  });

  it("rejects a redirect_uri mismatch", async () => {
    mockConsume.mockResolvedValue(payload);
    mockVerifyPkce.mockReturnValue(true);
    const res = await POST(formReq({ ...goodParams, redirect_uri: "https://evil.com/cb" }));
    expect((await res.json()).error).toBe("invalid_grant");
  });
});

describe("POST /api/oauth/token, refresh_token", () => {
  it("rotates a valid refresh token", async () => {
    mockRotate.mockResolvedValue(TOKENS);
    const res = await POST(
      formReq({ grant_type: "refresh_token", refresh_token: "por_x", client_id: "pcl_1" }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).refresh_token).toBe(TOKENS.refresh_token);
    expect(mockRotate).toHaveBeenCalledWith("por_x", "pcl_1");
  });

  it("rejects an invalid refresh token", async () => {
    mockRotate.mockResolvedValue(null);
    const res = await POST(
      formReq({ grant_type: "refresh_token", refresh_token: "por_bad", client_id: "pcl_1" }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_grant");
  });
});

describe("POST /api/oauth/token, protocol errors", () => {
  it("rejects unsupported grant types", async () => {
    const res = await POST(formReq({ grant_type: "password", client_id: "pcl_1" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("unsupported_grant_type");
  });

  it("requires client_id", async () => {
    const res = await POST(formReq({ grant_type: "authorization_code", code: "x" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_request");
  });

  it("accepts JSON bodies too", async () => {
    mockRotate.mockResolvedValue(TOKENS);
    const res = await POST(
      new Request("http://test/api/oauth/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: "por_x",
          client_id: "pcl_1",
        }),
      }),
    );
    expect(res.status).toBe(200);
  });

  it("returns 429 when rate limited", async () => {
    mockRateLimit.mockResolvedValue({ success: false, reset: Date.now() + 1000 });
    const res = await POST(formReq({ grant_type: "refresh_token", client_id: "pcl_1" }));
    expect(res.status).toBe(429);
  });
});
