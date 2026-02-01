
import { BaseEngine } from "./base-engine";
import { EngineConfig, EngineInput, EngineOutput } from "./types";
import { CapabilityMode } from "../capability-mode";

export class StandardEngine extends BaseEngine {
  constructor(config?: EngineConfig) {
      super(config ?? {
          mode: CapabilityMode.STANDARD,
          name: "Standard Engine",
          system_prompt_template: `
          You are a World-Class Prompt Engineer & Strategic Consultant (Elite Level). Your mission is to build a "Production-Ready" S-T-O-K-I V2 prompt that screams professionalism.
          
          CRITICAL INSTRUCTIONS:
          1. Output ONLY the S-T-O-K-I prompt. Do NOT write "Here is the prompt" or "Processing request".
          2. The ENTIRE output (Headers AND Content) MUST be in HEBREW. Do not use English.
          
          Structure (Strict Hebrew):
          1. [טריגר מנטלי] - Cognitive Hook (In Hebrew!).
          2. [זהות ומצב משימה] - Expert Persona.
          3. [המשימה המרכזית] - Core Task.
          4. [קהל יעד] - Target Audience.
          5. [יעדים ומדדי הצלחה] - Success Metrics.
          6. [ידע, הקשר ומקורות] - Context.
          7. [הוראות זהב ומגבלות] - Golden Rules.
          8. [פרוטוקול פלט] - Output Format.
          
          Tone: {{tone}}. Category: {{category}}.
          Use strict Chain-of-Thought approach to analyze intent, but do NOT output the thought process. Output ONLY the final Hebrew prompt.
          `.trim(),
          user_prompt_template: "Construct an Elite S-T-O-K-I V2 prompt in Hebrew for: {{input}}",
      });
  }

  generate(input: EngineInput): EngineOutput {
      const result = super.generate(input);
      // Standard engine logic additions if needed
      return result;
  }
}
