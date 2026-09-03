import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGenerateObject, mockFrom } = vi.hoisted(() => ({
  mockGenerateObject: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("ai", () => ({ generateObject: mockGenerateObject }));
vi.mock("@/lib/ai/models", () => ({ google: (id: string) => ({ modelId: id }) }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => ({ from: mockFrom }) }));
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));

import { analyzeUserStyle } from "@/lib/intelligence/personality-analyzer";

const LIBRARY = [
  { title: "א", prompt: "פרומפט ראשון", use_case: null, personal_category: "כללי" },
  { title: "ב", prompt: "פרומפט שני", use_case: null, personal_category: "כללי" },
  { title: "ג", prompt: "פרומפט שלישי", use_case: null, personal_category: "כללי" },
];

function mockLibrary(rows: unknown[] | null, upsertError: unknown = null) {
  const upsert = vi.fn().mockResolvedValue({ error: upsertError });
  mockFrom.mockImplementation((table: string) => {
    if (table === "personal_library") {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({ limit: () => Promise.resolve({ data: rows, error: null }) }),
          }),
        }),
      };
    }
    return { upsert };
  });
  return upsert;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("analyzeUserStyle", () => {
  it("persists the structured persona via the service client", async () => {
    const upsert = mockLibrary(LIBRARY);
    mockGenerateObject.mockResolvedValue({
      object: { tokens: ["מומחה"], preferred_format: "רשימות", personality_brief: "תמציתי" },
    });
    const result = await analyzeUserStyle("u1");
    expect(result?.tokens).toEqual(["מומחה"]);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "u1", style_tokens: ["מומחה"] }),
      { onConflict: "user_id" },
    );
  });

  it("returns null (legit skip) for a thin library", async () => {
    mockLibrary(LIBRARY.slice(0, 2));
    expect(await analyzeUserStyle("u1")).toBeNull();
    expect(mockGenerateObject).not.toHaveBeenCalled();
  });

  it("throws when the model call fails so the job retries", async () => {
    mockLibrary(LIBRARY);
    mockGenerateObject.mockRejectedValue(new Error("schema validation failed"));
    await expect(analyzeUserStyle("u1")).rejects.toThrow("schema validation failed");
  });

  it("throws when persisting fails so the job retries", async () => {
    mockLibrary(LIBRARY, { message: "rls denied" });
    mockGenerateObject.mockResolvedValue({
      object: { tokens: [], preferred_format: "", personality_brief: "" },
    });
    await expect(analyzeUserStyle("u1")).rejects.toThrow(/persist failed/);
  });
});

describe("analyzeUserStyle, the persona's language (spec C.9)", () => {
  it("asks for the brief in the language the library is written in", async () => {
    mockLibrary([
      {
        title: "Пост",
        prompt: "Напишите пост для LinkedIn о запуске продукта",
        use_case: null,
        personal_category: "общее",
      },
      {
        title: "Письмо",
        prompt: "Составьте письмо клиенту с извинениями за задержку",
        use_case: null,
        personal_category: "общее",
      },
      {
        title: "План",
        prompt: "Подготовьте план контента на месяц для малого бизнеса",
        use_case: null,
        personal_category: "общее",
      },
    ]);
    mockGenerateObject.mockResolvedValue({
      object: { tokens: [], preferred_format: "списки", personality_brief: "деловой" },
    });
    await analyzeUserStyle("u1");
    const call = mockGenerateObject.mock.calls[0][0] as { prompt: string };
    expect(call.prompt).toContain("in Russian");
    expect(call.prompt).not.toContain("in Hebrew");
  });

  it("defaults to Hebrew for a Hebrew library", async () => {
    mockLibrary(LIBRARY);
    mockGenerateObject.mockResolvedValue({
      object: { tokens: [], preferred_format: "", personality_brief: "" },
    });
    await analyzeUserStyle("u1");
    const call = mockGenerateObject.mock.calls[0][0] as { prompt: string };
    expect(call.prompt).toContain("in Hebrew");
  });
});
