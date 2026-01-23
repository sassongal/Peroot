
import { EngineConfig, EngineInput, EngineOutput, PromptEngine } from "./types";
import { CapabilityMode } from "../capability-mode";

export abstract class BaseEngine implements PromptEngine {
  constructor(protected config: EngineConfig) {}

  get mode(): CapabilityMode {
    return this.config.mode;
  }

  protected buildTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      // Replace {{key}} case-insensitive
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
      result = result.replace(regex, value);
    }
    return result;
  }

  generate(input: EngineInput): EngineOutput {
     const variables = {
         input: input.prompt,
         tone: input.tone,
         category: input.category,
     };

     const systemPrompt = this.buildTemplate(this.config.system_prompt_template, variables);
     const userPrompt = this.buildTemplate(this.config.user_prompt_template, variables);

     return {
         systemPrompt,
         userPrompt,
         outputFormat: "text", // Default, can be overridden by config or subclass
         requiredFields: [],
     };
  }

  generateRefinement(input: EngineInput): EngineOutput {
       // Default refinement logic - can be overridden
       if (!input.previousResult) {
           throw new Error("Previous result required for refinement");
       }



       // Hebraized Refinement Prompt
       const systemPrompt = `אתה מומחה לשיפור ושדרוג פרומפטים (Prompt Engineer Expert).
משימתך היא לשפר או לתקן את התוצאה הקודמת בהתאם להוראות המשתמש.

מטרה מקורית: ${input.prompt}
הוראת שיפור: ${input.refinementInstruction}
הקשר/טון: ${input.tone}

חשוב מאוד: התוצאה הסופית חייבת להיות בעברית רהוטה ותקנית (אלא אם התבקש מפורשות אחרת עבור קוד או ביטויים טכניים).`;

       const userPrompt = `תוצאה קודמת:
${input.previousResult}

אנא סקור את התוצאה ובצע את השינויים הבאים: ${input.refinementInstruction}

החזר את הגרסה המלאה והמתוקנת בלבד.`;

       return {
           systemPrompt,
           userPrompt,
           outputFormat: "text",
           requiredFields: []
       };
  }
}
