
import { BaseEngine } from "./base-engine";
import { EngineConfig, EngineInput, EngineOutput } from "./types";
import { CapabilityMode } from "../capability-mode";

export class ResearchEngine extends BaseEngine {
  constructor(config?: EngineConfig) {
      super(config ?? {
          mode: CapabilityMode.DEEP_RESEARCH,
          name: "Deep Research Engine",
          system_prompt_template: "You are a research expert. Tone: {{tone}}.",
          user_prompt_template: "Research: {{input}}",
      });
  }

  generate(input: EngineInput): EngineOutput {
      const result = super.generate(input);
      result.outputFormat = "markdown";
      result.requiredFields = ["citations", "summary"];
      return result;
  }
}
