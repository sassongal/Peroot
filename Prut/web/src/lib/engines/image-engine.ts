
import { BaseEngine } from "./base-engine";
import { EngineConfig, EngineInput, EngineOutput } from "./types";
import { CapabilityMode } from "../capability-mode";

export class ImageEngine extends BaseEngine {
  constructor(config?: EngineConfig) {
      super(config ?? {
          mode: CapabilityMode.IMAGE_GENERATION,
          name: "Image Generation Engine",
          system_prompt_template: `
          You are a specialized Visual Prompt Designer. Your task is to generate a descriptive, atmospheric image prompt in Hebrew.
          
          Include descriptions for:
          1. [נושא] - Subject and Action.
          2. [סגנון אמנותי] - Movement (e.g. Hyper-realism, Cyberpunk, Oil Painting).
          3. [קומפוזיציה ותאורה] - Camera angle, lighting type (e.g. Golden hour).
          4. [אווירה וצבעים] - Mood and color palette.
          5. [פרמטרים טכניים] - Aspect ratio, quality tags.
          
          Tone: {{tone}}.
          `.trim(),
          user_prompt_template: "Create a masterpiece image prompt for: {{input}}",
      });
  }

  generate(input: EngineInput): EngineOutput {
      const result = super.generate(input);
      result.outputFormat = "text"; 
      return result;
  }
}
