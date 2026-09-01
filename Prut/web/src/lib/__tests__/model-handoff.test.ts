import { describe, it, expect } from "vitest";
import { planModelHandoff, handoffMessage } from "@/lib/model-handoff";

describe("planModelHandoff", () => {
  it("prefills ChatGPT with the prompt in the query", () => {
    const plan = planModelHandoff("chatgpt", "כתוב לי מייל שיווקי");
    expect(plan.prefilled).toBe(true);
    expect(plan.url).toContain("chatgpt.com/?q=");
    expect(decodeURIComponent(plan.url.split("?q=")[1])).toBe("כתוב לי מייל שיווקי");
  });

  it("prefills Claude with the prompt in the query", () => {
    const plan = planModelHandoff("claude", "write a marketing email");
    expect(plan.prefilled).toBe(true);
    expect(plan.url).toBe("https://claude.ai/new?q=write%20a%20marketing%20email");
  });

  it("does NOT claim prefill for Gemini, which has no such parameter", () => {
    const plan = planModelHandoff("gemini", "כתוב לי מייל");
    expect(plan.prefilled).toBe(false);
    expect(plan.fallbackReason).toBe("unsupported");
    expect(plan.url).not.toContain("?");
  });

  it("falls back to copy-then-open when the encoded prompt would blow the URL budget", () => {
    // Hebrew encodes to 6 chars per letter, so ~1200 letters exceeds the
    // 7000-char budget. Truncation here would silently send half a prompt.
    const long = "א".repeat(1500);
    const plan = planModelHandoff("chatgpt", long);
    expect(plan.prefilled).toBe(false);
    expect(plan.fallbackReason).toBe("too_long");
    expect(plan.url).toBe("https://chatgpt.com/");
  });

  it("keeps a long-but-fitting prompt on the prefill path", () => {
    const fits = "א".repeat(1000); // 6000 encoded chars, under the budget
    expect(planModelHandoff("chatgpt", fits).prefilled).toBe(true);
  });

  it("treats an empty prompt as a plain open, never a broken query", () => {
    const plan = planModelHandoff("claude", "   ");
    expect(plan.prefilled).toBe(false);
    expect(plan.url).toBe("https://claude.ai/new");
  });

  it("encodes characters that would otherwise break the URL", () => {
    const plan = planModelHandoff("chatgpt", "a&b=c?d #e");
    expect(plan.prefilled).toBe(true);
    expect(plan.url).not.toContain("&b=");
    expect(decodeURIComponent(plan.url.split("?q=")[1])).toBe("a&b=c?d #e");
  });
});

describe("handoffMessage", () => {
  it("promises only Send when the prompt really is prefilled", () => {
    const msg = handoffMessage(planModelHandoff("chatgpt", "שלום"));
    expect(msg).toContain("נשאר רק לשלוח");
  });

  it("says the prompt was copied when it could not be prefilled", () => {
    expect(handoffMessage(planModelHandoff("gemini", "שלום"))).toContain("הועתק");
    expect(handoffMessage(planModelHandoff("chatgpt", "א".repeat(1500)))).toContain("ארוך מדי");
  });
});
