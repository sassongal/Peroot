import { describe, it, expect, beforeEach, vi } from "vitest";
import { __resetCacheForTest, getModelProfile, getActiveModelProfiles } from "../model-profiles";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";

function mockSupabase(rows: Record<string, unknown>[] | null, error: Error | null = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: rows?.[0] ?? null, error });
  const order = vi.fn().mockResolvedValue({ data: rows ?? [], error });
  const eq = vi.fn(() => ({ maybeSingle, order }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });
}

describe("model-profiles loader", () => {
  beforeEach(() => {
    __resetCacheForTest();
    vi.clearAllMocks();
  });

  it("returns the profile when slug is found", async () => {
    mockSupabase([
      {
        slug: "gpt-5",
        display_name: "ChatGPT (GPT-5)",
        display_name_he: "ChatGPT (GPT-5)",
        host_match: ["chatgpt.com"],
        system_prompt_he: "x",
        output_format_rules: { prefer: "markdown_headers" },
        dimension_weights: { structure: 1.2 },
        is_active: true,
        sort_order: 10,
      },
    ]);
    const profile = await getModelProfile("gpt-5");
    expect(profile?.slug).toBe("gpt-5");
    expect(profile?.outputFormatRules.prefer).toBe("markdown_headers");
  });

  it("returns null for an unknown slug", async () => {
    mockSupabase([]);
    expect(await getModelProfile("nope")).toBeNull();
  });

  it("returns null and logs on DB error (graceful fallback)", async () => {
    mockSupabase(null, new Error("conn refused"));
    expect(await getModelProfile("gpt-5")).toBeNull();
  });

  it("caches successful loads (second call hits cache)", async () => {
    mockSupabase([
      {
        slug: "gpt-5",
        display_name: "x",
        display_name_he: "x",
        host_match: [],
        system_prompt_he: "x",
        output_format_rules: {},
        dimension_weights: {},
        is_active: true,
        sort_order: 10,
      },
    ]);
    await getModelProfile("gpt-5");
    await getModelProfile("gpt-5");
    expect(createServiceClient).toHaveBeenCalledTimes(1);
  });

  it("getActiveModelProfiles returns active profiles", async () => {
    mockSupabase([
      {
        slug: "a",
        sort_order: 30,
        is_active: true,
        display_name: "A",
        display_name_he: "A",
        host_match: [],
        system_prompt_he: "",
        output_format_rules: {},
        dimension_weights: {},
      },
      {
        slug: "b",
        sort_order: 10,
        is_active: true,
        display_name: "B",
        display_name_he: "B",
        host_match: [],
        system_prompt_he: "",
        output_format_rules: {},
        dimension_weights: {},
      },
    ]);
    const list = await getActiveModelProfiles();
    expect(list.map((p) => p.slug)).toEqual(["a", "b"]);
  });
});
