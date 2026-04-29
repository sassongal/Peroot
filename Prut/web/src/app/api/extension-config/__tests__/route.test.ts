import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/engines/model-profiles", () => ({
  getActiveModelProfiles: vi.fn(async () => [
    {
      slug: "gpt-5",
      displayName: "ChatGPT (GPT-5)",
      displayNameHe: "ChatGPT (GPT-5)",
      hostMatch: ["chatgpt.com"],
      systemPromptHe: "x",
      outputFormatRules: {},
      dimensionWeights: {},
      isActive: true,
      sortOrder: 10,
    },
  ]),
}));

import { GET } from "../route";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

function mockConfigRow() {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: {
      version: "2026-04-29-1",
      cache_version: 1,
      selectors: { chatgpt: { hosts: ["chatgpt.com"] } },
      feature_flags: { score_gate_threshold: 80 },
    },
    error: null,
  });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });
}

function mockAuth(userId: string | null) {
  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
    auth: {
      getUser: async () => ({
        data: { user: userId ? { id: userId } : null },
        error: null,
      }),
    },
  });
}

describe("GET /api/extension-config", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockConfigRow();
    mockAuth("u1");
    // bust module-level memo cache between tests
    const mod = await import("../route");
    void mod;
  });

  it("returns 401 for unauthenticated user", async () => {
    mockAuth(null);
    const res = await GET(new Request("http://localhost/api/extension-config"));
    expect(res.status).toBe(401);
  });

  it("returns the active config + active profile metadata", async () => {
    const res = await GET(new Request("http://localhost/api/extension-config"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.version).toBe("2026-04-29-1");
    expect(json.cache_version).toBe(1);
    expect(json.selectors.chatgpt.hosts).toContain("chatgpt.com");
    expect(json.feature_flags.score_gate_threshold).toBe(80);
    expect(json.model_profiles).toHaveLength(1);
    expect(json.model_profiles[0].slug).toBe("gpt-5");
  });
});
