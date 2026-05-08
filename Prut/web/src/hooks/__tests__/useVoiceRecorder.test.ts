import { describe, it, expect } from "vitest";
import { voiceLangToOutputLang, VOICE_LANGUAGES } from "@/hooks/useVoiceRecorder";

describe("voiceLangToOutputLang", () => {
  it("maps he-IL to hebrew", () => {
    expect(voiceLangToOutputLang("he-IL")).toBe("hebrew");
  });
  it("maps en-US to english", () => {
    expect(voiceLangToOutputLang("en-US")).toBe("english");
  });
  it("maps ar-SA to arabic", () => {
    expect(voiceLangToOutputLang("ar-SA")).toBe("arabic");
  });
  it("maps ru-RU to russian", () => {
    expect(voiceLangToOutputLang("ru-RU")).toBe("russian");
  });
  it("every VOICE_LANGUAGES entry has an outputLang", () => {
    for (const lang of VOICE_LANGUAGES) {
      expect(lang.outputLang).toBeDefined();
    }
  });
});
