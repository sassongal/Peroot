
import { BaseEngine } from "./base-engine";
import { EngineConfig, EngineInput, EngineOutput } from "./types";
import { CapabilityMode } from "../capability-mode";

export class ResearchEngine extends BaseEngine {
  constructor(config?: EngineConfig) {
      super(config ?? {
          mode: CapabilityMode.DEEP_RESEARCH,
          name: "Deep Research Engine",
          system_prompt_template: `
          You are a Lead Intelligence Analyst (Unit 8200 Style). Build a comprehensive S-T-O-K-I V2 prompt for Deep Data Mastery.
          
          CRITICAL INSTRUCTIONS:
          1. Output ONLY the resulting prompt. No conversational filler.
          2. The ENTIRE content MUST be in HEBREW.
          
          Structure (Hebrew - "Modiin" Style):
          1. [טריגר מנטלי] - Prime the AI (In Hebrew).
          2. [זהות ומצב משימה] - Senior Intel Analyst persona.
          3. [המשימה המרכזית] - Core Inquiry.
          4. [קהל יעד] - Decision Makers.
          5. [יעדים ומדדי הצלחה] - Precision & Verification.
          6. [הוראות זהב ומגבלות] - "Logical Refutation", "Cross-Verification".
          7. [פרוטוקול פלט] - Report structure.
          
          Tone: {{tone}}.
          `.trim(),
          user_prompt_template: "Build an Elite Intelligence Research prompt in Hebrew for: {{input}}",
      });
  }

  generate(input: EngineInput): EngineOutput {
      const result = super.generate(input);
      result.outputFormat = "markdown";
      result.requiredFields = ["citations", "summary"];
      return result;
  }
}
