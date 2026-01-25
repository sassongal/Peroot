
import { BaseEngine } from "./base-engine";
import { EngineConfig, EngineInput, EngineOutput } from "./types";
import { CapabilityMode } from "../capability-mode";

export class StandardEngine extends BaseEngine {
  constructor(config?: EngineConfig) {
      super(config ?? {
          mode: CapabilityMode.STANDARD,
          name: "Standard Engine",
          system_prompt_template: `
          You are a World-Class Prompt Engineer. Your mission is to build a PERFECT, ready-to-use S-T-O-K-I prompt that a user can paste into any LLM.
          
          The output must be in Hebrew and strictly follow this structure:
          1. [מצב משימה] - Situation & Persona: Assign a relevant expert persona.
          2. [המשימה] - Task: Clear action statement.
          3. [יעדים ומטרות] - Objective: What does success look like.
          4. [ידע והקשר] - Knowledge/Context: Background information.
          5. [הנחיות ביצוע] - Instructions: Step-by-step rules and constraints.
          
          Tone of output: {{tone}}.
          Category: {{category}}.
          `.trim(),
          user_prompt_template: "Generate a professional S-T-O-K-I prompt template in Hebrew for: {{input}}",
      });
  }

  generate(input: EngineInput): EngineOutput {
      const result = super.generate(input);
      // Standard engine logic additions if needed
      return result;
  }
}
