/**
 * Guardrails for vendor-accurate copy in engine prompts (video/image).
 * Prevents regressions like outdated durations or absolute marketing claims.
 *
 * Run: pnpm vitest run src/lib/engines/__tests__/platform-prompt-accuracy.test.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { getShippedImageEngineBaseline } from "@/lib/engines/image-engine";
import { getShippedVideoEngineBaseline } from "@/lib/engines/video-engine";

const root = process.cwd();

function src(...segments: string[]) {
  return readFileSync(join(root, "src", ...segments), "utf8");
}

describe("platform prompt accuracy (source guardrails)", () => {
  it("video-engine.ts: Runway duration aligns with official Gen-4 (5 or 10s)", () => {
    const f = src("lib", "engines", "video-engine.ts");
    expect(f).toMatch(/5 or 10 seconds/);
    expect(f).not.toMatch(/~4-second clips/i);
  });

  it("video-engine.ts: no absolute 'only platform' audio claim", () => {
    const f = src("lib", "engines", "video-engine.ts");
    expect(f).not.toMatch(/ONLY platform with native audio/i);
  });

  it("video-engine.ts: Kling block does not promise Motion Brush or blanket native 4K output", () => {
    const f = src("lib", "engines", "video-engine.ts");
    expect(f).not.toContain("Motion Brush");
    expect(f).not.toMatch(/Resolution:\s*Native 4K output/i);
  });

  it("video-engine.ts: Veo duration references Gemini API seconds (4/6/8), not 5–15", () => {
    const f = src("lib", "engines", "video-engine.ts");
    expect(f).toMatch(/durationSeconds|"4", "6", or "8"/);
    expect(f).not.toMatch(/\(5-15 seconds supported\)/);
  });

  it("image-engine.ts: Midjourney quality uses --q/--quality docs, not 'deprecated'", () => {
    const f = src("lib", "engines", "image-engine.ts");
    expect(f).toMatch(/--quality or --q/);
    expect(f).not.toMatch(/deprecated in v7/i);
  });

  it("skills/video/runway.ts: reflects Gen-4.5 duration and audio guidance", () => {
    const f = src("lib", "engines", "skills", "video", "runway.ts");
    expect(f).toMatch(/60s/);
    expect(f).toMatch(/Audio block/i);
    expect(f).not.toMatch(/~4s unless using multi-scene Director/i);
    expect(f).not.toMatch(/4-16s/);
  });

  it("skills/video/veo.ts: example durations use API-aligned seconds (no 10s prompts)", () => {
    const f = src("lib", "engines", "skills", "video", "veo.ts");
    expect(f).not.toMatch(/Duration:\s*10s/);
  });

  it("image-engine.ts: FLUX.2 block stresses subject-first and hex binding", () => {
    const f = src("lib", "engines", "image-engine.ts");
    expect(f).toMatch(/FLUX\.2/);
    expect(f).toMatch(/hex|#/i);
    expect(f).toMatch(/Subject|subject-first|word order/i);
  });

  it("image-engine.ts: Imagen 4 narrative guidance present", () => {
    const f = src("lib", "engines", "image-engine.ts");
    expect(f).toMatch(/Imagen 4|Google Imagen/);
    expect(f).toMatch(/480/);
  });

  it("skills/image/flux.ts: examples bind hex colors to objects", () => {
    const f = src("lib", "engines", "skills", "image", "flux.ts");
    expect(f).toMatch(/#\w{6}/);
  });

  it("skills/video/kling.ts: examples include Negative: line", () => {
    const f = src("lib", "engines", "skills", "video", "kling.ts");
    expect(f).toMatch(/Negative:/);
  });

  it("skills/video/higgsfield.ts: uses labeled directive blocks for timing", () => {
    const f = src("lib", "engines", "skills", "video", "higgsfield.ts");
    expect(f).toMatch(/\[Camera:/);
    expect(f).toMatch(/\[Motion:/);
  });
});

describe("shipped engine baselines (admin drift API)", () => {
  it("exposes non-empty video + image general templates", () => {
    const v = getShippedVideoEngineBaseline();
    expect(v.system_prompt_template.length).toBeGreaterThan(200);
    expect(v.user_prompt_template.length).toBeGreaterThan(50);
    const i = getShippedImageEngineBaseline();
    expect(i.system_prompt_template.length).toBeGreaterThan(200);
    expect(i.user_prompt_template.length).toBeGreaterThan(50);
  });
});
