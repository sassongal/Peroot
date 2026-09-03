import { describe, it, expect } from "vitest";
import { summarizeAttachments } from "../attachment-summary";
import type { ContextAttachment } from "../types";

const att = (status: ContextAttachment["status"], id: string = status): ContextAttachment =>
  ({ id, type: "file", name: `${id}.pdf`, status }) as ContextAttachment;

describe("summarizeAttachments (the tools-button status)", () => {
  it("is idle with nothing attached", () => {
    expect(summarizeAttachments([]).state).toBe("idle");
    expect(summarizeAttachments([]).label).toBe("");
  });

  it("loading wins while anything is still uploading", () => {
    const s = summarizeAttachments([att("ready"), att("loading"), att("error")]);
    expect(s.state).toBe("loading");
    expect(s.label).toBe("מעלה קובץ אחד...");
  });

  it("error wins over ready once nothing is loading", () => {
    const s = summarizeAttachments([att("ready"), att("error")]);
    expect(s.state).toBe("error");
    expect(s.label).toBe("העלאה אחת נכשלה");
  });

  it("ready counts the attached items", () => {
    expect(summarizeAttachments([att("ready", "a"), att("ready", "b")]).label).toBe(
      "2 קבצים מצורפים ומוכנים",
    );
  });
});
