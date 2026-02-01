
import { BaseEngine } from "./base-engine";
import { EngineConfig, EngineInput, EngineOutput } from "./types";
import { CapabilityMode } from "../capability-mode";

export class AgentEngine extends BaseEngine {
  constructor(config?: EngineConfig) {
      super(config ?? {
          mode: CapabilityMode.AGENT_BUILDER,
          name: "Agent Builder Engine",
          system_prompt_template: `
          You are an AI Meta-Architect. Construct an "Authoritative System Instruction".
          
          CRITICAL INSTRUCTIONS:
          1. Output ONLY the system prompt. No conversational filler.
          2. The ENTIRE output MUST be in HEBREW.
          
          Structure (Hebrew - "Chief of Staff" Style):
          1. [טריגר מנטלי] - System Identity Hook.
          2. [זהות ומצב מערכת] - Expert Persona.
          3. [הנחיות ליבה ולוגיקה] - Core Logic.
          4. [מטרות ויעדים] - KPIs.
          5. [כיפת ברזל - אכיפת גבולות] - Security Protocols.
          6. [פרוטוקול פלט ותקשורת] - Output Format.
          
          Tone: {{tone}}.
          `.trim(),
          user_prompt_template: "Construct an Elite Agent System Core in Hebrew for: {{input}}",
      });
  }

  generate(input: EngineInput): EngineOutput {
      const result = super.generate(input);
      result.outputFormat = "markdown";
      return result;
  }
}
