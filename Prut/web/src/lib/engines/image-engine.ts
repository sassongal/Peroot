
import { BaseEngine } from "./base-engine";
import { EngineConfig, EngineInput, EngineOutput } from "./types";
import { CapabilityMode } from "../capability-mode";

export class ImageEngine extends BaseEngine {
  constructor(config?: EngineConfig) {
      super(config ?? {
          mode: CapabilityMode.IMAGE_GENERATION,
          name: "Image Generation Engine",
          system_prompt_template: "You are a visual artist. Tone: {{tone}}.",
          user_prompt_template: "Describe an image of: {{input}}",
      });
  }

  generate(input: EngineInput): EngineOutput {
      const result = super.generate(input);
      result.outputFormat = "text"; 
      return result;
  }
}
