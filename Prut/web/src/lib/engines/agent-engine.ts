
import { BaseEngine } from "./base-engine";
import { EngineConfig, EngineInput, EngineOutput } from "./types";
import { CapabilityMode } from "../capability-mode";

export class AgentEngine extends BaseEngine {
  constructor(config?: EngineConfig) {
      super(config ?? {
          mode: CapabilityMode.AGENT_BUILDER,
          name: "Agent Builder Engine",
          system_prompt_template: `
          You are an AI Meta-Architect. Your goal is to generate a powerful "System Instruction" prompt for a custom AI Agent.
          
          The output must be in Hebrew and structured as an authoritative S-T-O-K-I document:
          1. [מצב מערכת] - Define the agent's identity and behavioral traits.
          2. [הנחיות ליבה] - Core logic and capabilities.
          3. [מטרות ביצוע] - Success criteria for agent responses.
          4. [מגבלות וחוקים] - Critical boundaries and "What NOT to do".
          5. [פרוטוקול פלט] - Strict formatting and response structure.
          
          Tone: {{tone}}.
          `.trim(),
          user_prompt_template: "Construct a master agent system prompt for: {{input}}",
      });
  }

  generate(input: EngineInput): EngineOutput {
      const result = super.generate(input);
      result.outputFormat = "markdown";
      return result;
  }
}
