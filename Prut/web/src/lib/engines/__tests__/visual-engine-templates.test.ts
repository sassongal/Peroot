import { describe, it, expect } from "vitest";
import { ImageEngine } from "../image-engine";
import { VideoEngine } from "../video-engine";
import { CapabilityMode } from "@/lib/capability-mode";

describe("ImageEngine template source", () => {
  it("uses config templates for general platform", () => {
    const engine = new ImageEngine({
      mode: CapabilityMode.IMAGE_GENERATION,
      name: "Test",
      system_prompt_template: "CUSTOM_SYS_MARKER {{input}} {{tone}}",
      user_prompt_template: "CUSTOM_USER_MARKER {{input}}",
    });
    const out = engine.generate({
      prompt: "test prompt",
      tone: "Pro",
      category: "c",
      mode: CapabilityMode.IMAGE_GENERATION,
      modeParams: { image_platform: "general" },
    });
    expect(out.systemPrompt).toContain("CUSTOM_SYS_MARKER");
    expect(out.userPrompt).toContain("CUSTOM_USER_MARKER");
  });

  it("uses platform_overrides JSON when present", () => {
    const engine = new ImageEngine({
      mode: CapabilityMode.IMAGE_GENERATION,
      name: "Test",
      system_prompt_template: "GENERAL_SYS {{input}}",
      user_prompt_template: "GENERAL_USER {{input}}",
      default_params: {
        platform_overrides: {
          midjourney: {
            system_template: "OVERRIDE_MJ_SYS {{input}} {{tone}}",
            user_template: "OVERRIDE_MJ_USER {{input}}",
          },
        },
      },
    });
    const out = engine.generate({
      prompt: "x",
      tone: "T",
      category: "c",
      mode: CapabilityMode.IMAGE_GENERATION,
      modeParams: { image_platform: "midjourney" },
    });
    expect(out.systemPrompt).toContain("OVERRIDE_MJ_SYS");
    expect(out.userPrompt).toContain("OVERRIDE_MJ_USER");
  });
});

describe("VideoEngine template source", () => {
  it("uses config system shell and merges platform_override variable", () => {
    const engine = new VideoEngine({
      mode: CapabilityMode.VIDEO_GENERATION,
      name: "Test",
      system_prompt_template:
        "SHELL_START {{platform_override}} {{input}} {{aspect_ratio_hint}} Tone: {{tone}}.",
      user_prompt_template: "USER_SHELL {{input}}",
    });
    const out = engine.generate({
      prompt: "concept",
      tone: "Pro",
      category: "c",
      mode: CapabilityMode.VIDEO_GENERATION,
      modeParams: { video_platform: "general" },
    });
    expect(out.systemPrompt).toContain("SHELL_START");
    expect(out.userPrompt).toContain("USER_SHELL");
  });
});
