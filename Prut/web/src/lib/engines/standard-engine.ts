
import { BaseEngine } from "./base-engine";
import { EngineConfig, EngineInput, EngineOutput } from "./types";
import { CapabilityMode } from "../capability-mode";

export class StandardEngine extends BaseEngine {
  constructor(config?: EngineConfig) {
      super(config ?? {
          mode: CapabilityMode.STANDARD,
          name: "Standard Engine",
          system_prompt_template: "You are a helpful AI assistant. Tone: {{tone}}.",
          user_prompt_template: "{{input}}",
      });
  }

  generate(input: EngineInput): EngineOutput {
      const result = super.generate(input);
      // Standard engine logic additions if needed
      return result;
  }
}
