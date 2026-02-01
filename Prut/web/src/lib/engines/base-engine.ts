
import { EngineConfig, EngineInput, EngineOutput, PromptEngine } from "./types";
import { CapabilityMode } from "../capability-mode";

// Helper for scoring logic moved from prompt-engine.ts
export const CATEGORY_LIST = [
  "General",
  "Marketing",
  "Sales",
  "Social",
  "CustomerSupport",
  "Product",
  "Operations",
  "HR",
  "Dev",
  "Education",
  "Legal",
  "Creative",
  "Finance",
  "Healthcare",
  "Ecommerce",
  "RealEstate",
  "Strategy",
  "Design",
  "Data",
  "Automation",
  "Community",
  "Nonprofit",
] as const;

const SIGNALS = [
  { key: "מטרה", priority: 1, patterns: [/מטרה|יעד|goal|objective|conversion|שכנע|להוביל|לייצר/i] },
  { key: "קהל יעד", priority: 1, patterns: [/קהל יעד|לקוחות|משתמשים|audience|target|persona/i] },
  { key: "ערוץ/פורמט", priority: 2, patterns: [/מייל|email|landing|דף נחיתה|מודעה|ad|linkedin|facebook|instagram|tiktok|sms|whatsapp|בלוג|blog/i] },
  { key: "מגבלות", priority: 3, patterns: [/מגבלות|אסור|חובה|רגולציה|compliance|טון|tone|שפה|language/i] },
  { key: "פורמט פלט", priority: 2, patterns: [/פורמט|מבנה|טבלה|רשימה|bullet|markdown|json|אורך|מילים|characters/i] },
];

export interface PromptScore {
  score: number;
  baseScore: number;
  level: 'empty' | 'low' | 'medium' | 'high';
  label: string;
  tips: string[];
  usageBoost: number;
}

export abstract class BaseEngine implements PromptEngine {
  constructor(protected config: EngineConfig) {}

  get mode(): CapabilityMode {
    return this.config.mode;
  }

  public extractVariables(template: string): string[] {
    const regex = /\{\{\s*(\w+)\s*\}\}/gi;
    const matches = [...template.matchAll(regex)];
    return Array.from(new Set(matches.map(m => m[1])));
  }

  protected validateInput(input: EngineInput, template: string): string[] {
    const required = this.extractVariables(template);
    return required.filter(v => {
        if (v === 'input') return !input.prompt;
        if (v === 'tone') return !input.tone;
        if (v === 'category') return !input.category;
        return !input.modeParams?.[v];
    });
  }

  /**
   * Scores a prompt based on signals and complexity
   */
  public static scorePrompt(input: string): PromptScore {
    const trimmed = input.trim();
    if (!trimmed) return { score: 0, baseScore: 0, level: 'empty', label: 'חסר', tips: [], usageBoost: 0 };
    
    const wordCount = trimmed.split(/\s+/).length;
    let score = 40; // Base start
    if (wordCount > 10) score += 20;
    if (wordCount > 20) score += 10;

    SIGNALS.forEach(s => {
       if (s.patterns.some(p => p.test(trimmed))) score += 10;
    });

    const finalScore = Math.min(100, score);
    return {
        score: finalScore,
        baseScore: finalScore,
        level: finalScore > 80 ? 'high' : finalScore > 50 ? 'medium' : 'low',
        label: finalScore > 80 ? 'חזק' : finalScore > 50 ? 'בינוני' : 'חלש',
        tips: wordCount < 10 ? ['הוסף עוד פרטים', 'ציין מטרה ברורה'] : [],
        usageBoost: 0
    };
  }

  protected buildTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
      result = result.replace(regex, value);
    }
    return result;
  }

  // No longer hardcoded. Fetched from DB and passed via EngineConfig
  protected getSystemIdentity(): string {
    return this.config.global_system_identity || "";
  }

  generate(input: EngineInput): EngineOutput {
     const variables: Record<string, string> = {
         input: input.prompt,
         tone: input.tone,
         category: input.category,
         ...(input.modeParams as Record<string, string> || {})
     };

     const systemPrompt = this.buildTemplate(this.config.system_prompt_template, variables);
     
     let contextInjected = systemPrompt;
     if (input.userHistory && input.userHistory.length > 0) {
         const historyBlock = input.userHistory
            .map(h => `Title: ${h.title}\nPrompt:\n${h.prompt}`)
            .join('\n\n---\n\n');
            
         contextInjected += `\n\n[USER_STYLE_CONTEXT]\nThe following are examples of prompts this user has saved or liked. 
Analyze their tone, phrasing, and structure to ensure the result feels natural to them while maintaining professional engineering standards:
\n${historyBlock}\n`;
     }

     if (input.userPersonality) {
         const { tokens, brief, format } = input.userPersonality;
         contextInjected += `\n\n[USER_PERSONALITY_TRAITS]\n`;
         if (tokens.length > 0) contextInjected += `- Key Style Tokens: ${tokens.join(', ')}\n`;
         if (format) contextInjected += `- Preferred Format: ${format}\n`;
         if (brief) contextInjected += `- Personality Profile: ${brief}\n`;
         contextInjected += `\nApply these traits strictly to the output.\n`;
     }

     return {
         systemPrompt: `${contextInjected}\n\n${this.getSystemIdentity()}\n\n[GENIUS_ANALYSIS]\nAct as a Ruthless Editor-in-Chief. Before generating, ASK: "Is this addictive? Is it sharp? Does it give the user an unfair advantage?"\n\nIdentify 3 Gaps:\n1. Elite Strategy (Is the 'Why' powerful enough?)\n2. Psychological Hook (Is the 'Who' targeted perfectly?)\n3. Execution Excellence (Is the 'How' detailed enough?)\n\nAfter the enhanced prompt, add [GENIUS_QUESTIONS] followed by 3 Value-Adding Clarifying Questions in JSON array format.\nExample: [GENIUS_QUESTIONS][{"id": 1, "question": "...", "description": "...", "examples": ["..."]}, ...]`,
         userPrompt: this.buildTemplate(this.config.user_prompt_template, variables),
         outputFormat: "text",
         requiredFields: [],
     };
  }

  generateRefinement(input: EngineInput): EngineOutput {
        if (!input.previousResult) throw new Error("Previous result required for refinement");
        const instruction = input.refinementInstruction || "שפר את התוצאה והפוך אותה למקצועית יותר.";
        
        return {
            systemPrompt: `אתה מומחה Prompt Engineering ו-AI Architect בכיר. 
טון מבוקש: ${input.tone}. קטגוריה: ${input.category}.

מטרתך היא לשדרג את הפרומפט הקיים לרמה של "Expert Level" תוך שימוש במבנה S-T-O-K-I V2 המורחב.
עליך להטמיע את הוראות המשתמש החדשות לתוך השלד המקצועי, תוך שיפור הדיוק, העומק והאפקטיביות.

${this.getSystemIdentity()}

[GENIUS_ANALYSIS]
Analyze the user's specific feedback. If they answered previous questions, integrate those details deeply.
Identify if any critical ambiguity remains.
After the improved prompt, add the delimiter [GENIUS_QUESTIONS] followed by 3 NEW clarifying questions in JSON array format if further details would help, or an empty array [] if the prompt is now perfect.`,
            userPrompt: `פרומפט נוכחי לשיפור:
---
${input.previousResult}
---

הוראת שיפור/עדכון מהמשתמש: ${instruction}

פעולה: החזר את הפרומפט המשופר במבנה S-T-O-K-I V2 מלא בעברית.`,
            outputFormat: "text",
            requiredFields: []
        };
  }
}
