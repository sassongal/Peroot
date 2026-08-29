import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/lib/connect/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/connect/auth")>();
  return {
    ...actual,
    authenticateConnect: (...args: unknown[]) => mockAuth(...args),
    logConnectUsage: vi.fn(),
  };
});

const mockEnhance = vi.fn();
const mockQuota = vi.fn();
vi.mock("@/lib/connect/ops", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/connect/ops")>();
  return {
    ...actual,
    connectEnhance: (...args: unknown[]) => mockEnhance(...args),
    connectQuota: (...args: unknown[]) => mockQuota(...args),
  };
});

import { POST, GET } from "@/app/api/mcp/route";
import { NextResponse } from "next/server";

function rpc(body: unknown): Request {
  return new Request("https://www.peroot.space/api/mcp", {
    method: "POST",
    headers: {
      authorization: "Bearer prk_live_" + "a".repeat(40),
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ userId: "user-1", keyId: "key-1" });
});

describe("MCP route (stateless Streamable HTTP)", () => {
  it("returns 401 when auth fails (passes the auth response through)", async () => {
    mockAuth.mockResolvedValue(NextResponse.json({ code: "invalid_key" }, { status: 401 }));
    const res = await POST(rpc({ jsonrpc: "2.0", id: 1, method: "initialize" }));
    expect(res.status).toBe(401);
  });

  it("answers initialize with protocol version, capabilities and Hebrew server info", async () => {
    const res = await POST(rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }));
    const body = await res.json();
    expect(body.result.protocolVersion).toBeTruthy();
    expect(body.result.capabilities.tools).toBeDefined();
    expect(body.result.capabilities.prompts).toBeDefined();
    expect(body.result.serverInfo.name).toBe("peroot");
  });

  it("lists the six v1 tools with schemas", async () => {
    const res = await POST(rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" }));
    const body = await res.json();
    const names = body.result.tools.map((t: { name: string }) => t.name);
    expect(names).toEqual([
      "enhance_prompt",
      "save_prompt",
      "search_my_prompts",
      "list_my_prompts",
      "get_prompt",
      "get_quota",
    ]);
    const enhance = body.result.tools[0];
    expect(enhance.inputSchema.properties.target_model.enum).toEqual([
      "chatgpt",
      "claude",
      "gemini",
      "general",
    ]);
    expect(enhance.inputSchema.required).toEqual(["prompt"]);
  });

  it("lists the /peroot: command family as prompts", async () => {
    const res = await POST(rpc({ jsonrpc: "2.0", id: 3, method: "prompts/list" }));
    const body = await res.json();
    const names = body.result.prompts.map((p: { name: string }) => p.name);
    expect(names).toEqual([
      "enhance",
      "image",
      "video",
      "research",
      "agent",
      "save",
      "find",
      "quota",
      "help",
    ]);
  });

  it("prompts/get renders the command with the user's argument", async () => {
    const res = await POST(
      rpc({
        jsonrpc: "2.0",
        id: 4,
        method: "prompts/get",
        params: { name: "video", arguments: { prompt: "חתול רוקד בגשם" } },
      }),
    );
    const body = await res.json();
    const text = body.result.messages[0].content.text as string;
    expect(text).toContain("VIDEO_GENERATION");
    expect(text).toContain("חתול רוקד בגשם");
  });

  it("tools/call enhance_prompt returns text + structuredContent and passes target_model", async () => {
    mockEnhance.mockResolvedValue({
      enhanced_prompt: "פרומפט משודרג",
      title: "כותרת",
      mode: "STANDARD",
      cache_hit: false,
      credits_remaining: 149,
      quota_resets_at: null,
    });
    const res = await POST(
      rpc({
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: {
          name: "enhance_prompt",
          arguments: { prompt: "שפר", target_model: "gemini" },
        },
      }),
    );
    const body = await res.json();
    expect(body.result.isError).toBe(false);
    expect(body.result.content[0].text).toContain("פרומפט משודרג");
    expect(body.result.content[0].text).toContain("149");
    expect(body.result.structuredContent.credits_remaining).toBe(149);
    expect(mockEnhance.mock.calls[0][0]).toMatchObject({ target_model: "gemini" });
  });

  it("tool failures come back as isError results, not protocol errors", async () => {
    const { ConnectOpError } = await import("@/lib/connect/ops");
    mockEnhance.mockRejectedValue(new ConnectOpError(402, "no_credits", "נגמרה המכסה"));
    const res = await POST(
      rpc({
        jsonrpc: "2.0",
        id: 6,
        method: "tools/call",
        params: { name: "enhance_prompt", arguments: { prompt: "שפר" } },
      }),
    );
    const body = await res.json();
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toContain("no_credits");
  });

  it("rejects unknown methods and batch requests; GET is 405", async () => {
    const unknown = await POST(rpc({ jsonrpc: "2.0", id: 7, method: "nope" }));
    expect((await unknown.json()).error.code).toBe(-32601);
    const batch = await POST(rpc([{ jsonrpc: "2.0", id: 8, method: "ping" }]));
    expect((await batch.json()).error.code).toBe(-32600);
    expect(GET().status).toBe(405);
  });
});
