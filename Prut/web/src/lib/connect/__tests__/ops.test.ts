import { describe, it, expect, vi } from "vitest";

// connectQuota (called after a successful enhance) uses the service client —
// make it fail so the .catch(() => null) path runs; quota fields become null.
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: { message: "mock" } }),
        }),
      }),
    }),
  }),
}));

import { ConnectEnhanceSchema, ConnectOpError, connectEnhance } from "@/lib/connect/ops";
import { TRAILER } from "@/lib/prompt-stream/trailer";

const KEY = "prk_live_" + "a".repeat(40);

describe("ConnectEnhanceSchema", () => {
  it("defaults mode to STANDARD and accepts the platform's target_model values", () => {
    const parsed = ConnectEnhanceSchema.parse({ prompt: "שפר לי את זה" });
    expect(parsed.mode).toBe("STANDARD");
    for (const m of ["chatgpt", "claude", "gemini", "general"]) {
      expect(ConnectEnhanceSchema.parse({ prompt: "x", target_model: m }).target_model).toBe(m);
    }
  });

  it("rejects oversized prompts and unknown modes", () => {
    expect(() => ConnectEnhanceSchema.parse({ prompt: "x".repeat(8001) })).toThrow();
    expect(() => ConnectEnhanceSchema.parse({ prompt: "x", mode: "MAGIC" })).toThrow();
  });
});

describe("connectEnhance", () => {
  it("maps v1 input to the pipeline body and parses the trailer out of the stream", async () => {
    let seen: Record<string, unknown> = {};
    const handler = async (req: Request) => {
      seen = await req.json();
      const raw =
        "פרומפט משודרג ומורחב.\n" +
        `${TRAILER.TITLE_OPEN}כותרת יפה${TRAILER.TITLE_CLOSE}\n` +
        `${TRAILER.QUESTIONS}\n[]`;
      return new Response(raw, {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    };

    const input = ConnectEnhanceSchema.parse({
      prompt: "כתוב פוסט",
      mode: "VIDEO_GENERATION",
      target_model: "claude",
      model_profile_slug: "claude-sonnet-4",
      mode_options: { camera_movement: "dolly", duration: "8s" },
    });
    const res = await connectEnhance(input, KEY, "user-1", handler);

    // Request mapping — the platform's model choice flows through verbatim.
    expect(seen.capability_mode).toBe("VIDEO_GENERATION");
    expect(seen.target_model).toBe("claude");
    expect(seen.model_profile_slug).toBe("claude-sonnet-4");
    expect(seen.mode_params).toEqual({ camera_movement: "dolly", duration: "8s" });

    // Response: trailer stripped, title extracted, quota gracefully null.
    expect(res.enhanced_prompt).toBe("פרומפט משודרג ומורחב.");
    expect(res.title).toBe("כותרת יפה");
    expect(res.cache_hit).toBe(false);
    expect(res.credits_remaining).toBeNull();
  });

  it("marks cache hits from the X-Peroot-Cache header", async () => {
    const handler = async () =>
      new Response("תוצאה מהמטמון", {
        status: 200,
        headers: { "X-Peroot-Cache": "hit" },
      });
    const res = await connectEnhance(
      ConnectEnhanceSchema.parse({ prompt: "x" }),
      KEY,
      "user-1",
      handler,
    );
    expect(res.cache_hit).toBe(true);
  });

  it("maps credit exhaustion to 402 no_credits", async () => {
    const handler = async () =>
      new Response(JSON.stringify({ error: "נגמרה המכסה", code: "insufficient_credits" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    await expect(
      connectEnhance(ConnectEnhanceSchema.parse({ prompt: "x" }), KEY, "user-1", handler),
    ).rejects.toMatchObject({ status: 402, code: "no_credits" });
  });

  it("passes through other pipeline errors with their status", async () => {
    const handler = async () =>
      new Response(JSON.stringify({ error: "יותר מדי בקשות", code: "rate_limited" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    await expect(
      connectEnhance(ConnectEnhanceSchema.parse({ prompt: "x" }), KEY, "user-1", handler),
    ).rejects.toBeInstanceOf(ConnectOpError);
  });
});

describe("fillTemplateText", () => {
  it("fills Hebrew {variables} and reports the ones still missing", async () => {
    const { fillTemplateText } = await import("@/lib/connect/ops");
    const tpl = "כתוב תוכנית השקה עבור {שם_המוצר} המיועד ל{קהל_יעד} מול {מתחרה_עיקרי}";
    const { filled, missing } = fillTemplateText(tpl, ["שם_המוצר", "קהל_יעד", "מתחרה_עיקרי"], {
      שם_המוצר: "פירוט",
      קהל_יעד: "משווקים",
    });
    expect(filled).toContain("עבור פירוט");
    expect(filled).toContain("למשווקים");
    expect(missing).toEqual(["מתחרה_עיקרי"]);
  });

  it("replaces every occurrence and returns empty missing when complete", async () => {
    const { fillTemplateText } = await import("@/lib/connect/ops");
    const { filled, missing } = fillTemplateText("{x} ועוד {x}", ["x"], { x: "אחת" });
    expect(filled).toBe("אחת ועוד אחת");
    expect(missing).toEqual([]);
  });
});
