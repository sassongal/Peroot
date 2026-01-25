
import { BaseEngine } from "./base-engine";
import { EngineConfig, EngineInput, EngineOutput } from "./types";
import { CapabilityMode } from "../capability-mode";

export class ResearchEngine extends BaseEngine {
  constructor(config?: EngineConfig) {
      super(config ?? {
          mode: CapabilityMode.DEEP_RESEARCH,
          name: "Deep Research Engine",
          system_prompt_template: `
          You are a Senior Research Analyst. Your task is to generate a comprehensive prompt in Hebrew designed for Deep Data Exploration.
          
          Structure:
          1. [מצב משימה] - Expert Academic/Researcher persona.
          2. [המשימה] - The core research question.
          3. [יעדים ומטרות] - Precision, depth, and citation requirements.
          4. [ידע והקשר] - Relevant domain background.
          5. [הנחיות ביצוע] - Include instructions for "Chain of Thought" reasoning and "Cross-referencing".
          
          Tone: {{tone}}.
          `.trim(),
          user_prompt_template: "Build a deep research S-T-O-K-I prompt for: {{input}}",
      });
  }

  generate(input: EngineInput): EngineOutput {
      const result = super.generate(input);
      result.outputFormat = "markdown";
      result.requiredFields = ["citations", "summary"];
      return result;
  }
}
