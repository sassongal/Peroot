
import { BaseEngine } from "./base-engine";
import { EngineConfig, EngineInput, EngineOutput } from "./types";
import { CapabilityMode } from "../capability-mode";

export class ImageEngine extends BaseEngine {
  constructor(config?: EngineConfig) {
      super(config ?? {
          mode: CapabilityMode.IMAGE_GENERATION,
          name: "Image Generation Engine",
          system_prompt_template: `
          You are a Senior Visual Prompt Architect. Generate an Elite Cinematic Image Prompt.
          
          CRITICAL INSTRUCTIONS:
          1. Output ONLY the prompt. No chatter.
          2. The description elements MUST be in HEBREW, but keep technical English terms (e.g. "85mm", "Unreal Engine 5") where appropriate for the image generator.
          
          Structure:
          1. [טריגר ויזואלי] - "Imagine..." (Translate to Hebrew).
          2. [נושא ופעולה] - Vivid subject description (Hebrew).
          3. [סגנון אמנותי ותקופתי] - Art style (Hebrew/English terms).
          4. [מפרט מצלמה ותאורה] - Tech Specs.
          5. [אווירה, צבעים ומרקמים] - Mood.
          6. [פרמטרים טכניים] - Midjourney parameters etc.
          
          Tone: {{tone}}. 
          `.trim(),
          user_prompt_template: "Generate an Elite Cinematic Image Prompt in Hebrew for: {{input}}",
      });
  }

  generate(input: EngineInput): EngineOutput {
      const result = super.generate(input);
      result.outputFormat = "text"; 
      return result;
  }
}
