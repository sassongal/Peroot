
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

// ── Scoring Dimensions ──
// Each dimension contributes points. Raw prompts typically hit 1-2 dimensions → 20-40%.
// Well-engineered prompts hit 5+ dimensions → 70-95%.

const SCORING_DIMENSIONS: {
  key: string;
  maxPoints: number;
  tip: string;
  test: (text: string, wordCount: number) => number;
}[] = [
  {
    key: "length",
    maxPoints: 12,
    tip: "הוסף עוד פרטים והקשר",
    test: (_text, wc) => {
      if (wc <= 3) return 0;
      if (wc <= 6) return 2;
      if (wc <= 12) return 4;
      if (wc <= 25) return 7;
      if (wc <= 50) return 10;
      return 12;
    },
  },
  {
    key: "role",
    maxPoints: 12,
    tip: "הגדר תפקיד (למשל: ״אתה מומחה שיווק״)",
    test: (text) => {
      if (/אתה\s+\S+|you\s+are\s+a|act\s+as|as\s+a\s+\w+\s+(expert|specialist|coach|consultant|writer|designer)/i.test(text)) return 12;
      if (/מומחה|מנהל|יועץ|כותב|עורך|מתכנת|expert|specialist|coach|consultant/i.test(text)) return 6;
      return 0;
    },
  },
  {
    key: "task",
    maxPoints: 10,
    tip: "הגדר משימה ברורה (מה בדיוק לעשות)",
    test: (text) => {
      const taskVerbs = /כתוב|צור|בנה|נסח|הכן|תכנן|ערוך|סכם|תרגם|נתח|השווה|write|create|build|draft|prepare|plan|edit|summarize|translate|analyze|compare|generate|design|develop/i;
      if (!taskVerbs.test(text)) return 0;
      // Bonus for specific task with object
      if (/כתוב\s+\S+|צור\s+\S+|בנה\s+\S+|write\s+a\s+\S+|create\s+a\s+\S+/i.test(text)) return 10;
      return 5;
    },
  },
  {
    key: "context",
    maxPoints: 12,
    tip: "ספק הקשר ורקע (למי? למה? מתי?)",
    test: (text) => {
      let pts = 0;
      // Audience/target
      if (/קהל יעד|לקוחות|משתמשים|audience|target|persona|עבור\s+\S+|ל\S+ים\b|גולשים|עוקבים|מנויים/i.test(text)) pts += 4;
      // Purpose/goal
      if (/מטרה|יעד|goal|objective|כדי\s+ל|על\s+מנת\s+ל|purpose|in\s+order\s+to|so\s+that/i.test(text)) pts += 4;
      // Background/situation
      if (/רקע|הקשר|מצב|context|background|situation|בגלל|מכיוון|because|since/i.test(text)) pts += 4;
      return pts;
    },
  },
  {
    key: "specificity",
    maxPoints: 10,
    tip: "הוסף פרטים ספציפיים (מספרים, שמות, דוגמאות)",
    test: (text) => {
      let pts = 0;
      // Numbers/quantities
      if (/\d+/.test(text)) pts += 3;
      // Quoted text or examples
      if (/[""״]|למשל|לדוגמה|for\s+example|e\.g\.|such\s+as/i.test(text)) pts += 4;
      // Named entities (proper nouns, brands, specific terms)
      if (/[A-Z][a-z]{2,}/.test(text) || /\b[A-Z]{2,}\b/.test(text)) pts += 3;
      return Math.min(10, pts);
    },
  },
  {
    key: "format",
    maxPoints: 10,
    tip: "ציין פורמט פלט (רשימה, טבלה, אורך)",
    test: (text) => {
      let pts = 0;
      // Output format specification
      if (/פורמט|מבנה|טבלה|רשימה|bullet|markdown|json|csv|html/i.test(text)) pts += 5;
      // Length specification
      if (/אורך|מילים|שורות|פסקאות|characters|words|sentences|paragraphs|short|long|brief|concise|קצר|ארוך|תמציתי/i.test(text)) pts += 3;
      // Structure hints
      if (/כותרת|סעיפים|חלקים|header|section|intro|summary|title|subtitle/i.test(text)) pts += 2;
      return Math.min(10, pts);
    },
  },
  {
    key: "constraints",
    maxPoints: 10,
    tip: "הגדר מגבלות (מה לא לעשות, טון, שפה)",
    test: (text) => {
      let pts = 0;
      // Negative constraints
      if (/אל\s+ת|אסור|ללא|בלי|don'?t|avoid|never|without|do\s+not/i.test(text)) pts += 4;
      // Tone specification
      if (/טון|סגנון|tone|style|formal|casual|מקצועי|ידידותי|רשמי|חם|professional|friendly|warm|humorous/i.test(text)) pts += 3;
      // Language/compliance
      if (/שפה|language|בעברית|באנגלית|in\s+hebrew|in\s+english|רגולציה|compliance/i.test(text)) pts += 3;
      return Math.min(10, pts);
    },
  },
  {
    key: "structure",
    maxPoints: 8,
    tip: "ארגן את הפרומפט (פסקאות, מספור, הפרדה)",
    test: (text) => {
      let pts = 0;
      // Has line breaks / sections
      if (/\n/.test(text)) pts += 3;
      // Has numbered/bulleted lists
      if (/^\s*[\d•\-\*]\s*/m.test(text)) pts += 3;
      // Has delimiters or sections
      if (/---|===|\*\*|##|:$/m.test(text)) pts += 2;
      return Math.min(8, pts);
    },
  },
  {
    key: "channel",
    maxPoints: 8,
    tip: "ציין ערוץ או פלטפורמה (מייל, אינסטגרם, בלוג)",
    test: (text) => {
      if (/מייל|email|landing|דף נחיתה|מודעה|ad|לינקדאין|linkedin|פייסבוק|facebook|אינסטגרם|instagram|טיקטוק|tiktok|sms|וואטסאפ|whatsapp|בלוג|blog|newsletter|ניוזלטר|אתר|website|יוטיוב|youtube|טוויטר|twitter|x\.com|פודקאסט|podcast|וובינר|webinar/i.test(text)) return 8;
      return 0;
    },
  },
  {
    key: "examples",
    maxPoints: 8,
    tip: "הוסף דוגמאות לפלט הרצוי",
    test: (text) => {
      if (/דוגמה לפלט|output\s+example|expected\s+output|כמו\s+זה|like\s+this/i.test(text)) return 8;
      if (/דוגמה|example|sample|template|תבנית/i.test(text)) return 4;
      return 0;
    },
  },
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
   * Scores a prompt across multiple quality dimensions.
   *
   * Scoring scale (total possible = 100):
   *   - Raw simple prompts ("כתוב מייל"):         15-30%
   *   - Basic prompts with some detail:             30-45%
   *   - Good prompts with context & specifics:      45-65%
   *   - Strong prompts with role, format, constraints: 65-85%
   *   - Expert-level engineered prompts:            85-100%
   */
  public static scorePrompt(input: string): PromptScore {
    const trimmed = input.trim();
    if (!trimmed) return { score: 0, baseScore: 0, level: 'empty', label: 'חסר', tips: [], usageBoost: 0 };

    const wordCount = trimmed.split(/\s+/).length;
    const tips: string[] = [];
    let totalScore = 0;

    for (const dim of SCORING_DIMENSIONS) {
      const pts = dim.test(trimmed, wordCount);
      totalScore += pts;
      // Suggest tip if dimension scored less than half its potential
      if (pts < dim.maxPoints / 2) {
        tips.push(dim.tip);
      }
    }

    // Cap at 100
    const finalScore = Math.min(100, totalScore);

    // Show top 3 most impactful tips only
    const limitedTips = tips.slice(0, 3);

    // Determine usage boost based on word count (encourages detailed prompts)
    const usageBoost = wordCount > 40 ? 3 : wordCount > 20 ? 2 : wordCount > 10 ? 1 : 0;

    return {
        score: finalScore,
        baseScore: finalScore,
        level: finalScore >= 70 ? 'high' : finalScore >= 40 ? 'medium' : 'low',
        label: finalScore >= 70 ? 'חזק' : finalScore >= 40 ? 'בינוני' : 'חלש',
        tips: limitedTips,
        usageBoost,
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
            .map(h => `Title: ${h.title}\nPrompt:\n${h.prompt.slice(0, 500)}`)
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
         systemPrompt: `${contextInjected}\n\n${this.getSystemIdentity()}\n\n[GENIUS_ANALYSIS]\nBefore generating, perform this rigorous internal quality check (do NOT output this analysis):\n1. COMPLETENESS: Does the prompt specify Role, Task, Context, Format, and Constraints? Fill ANY missing sections.\n2. SPECIFICITY: Replace every vague instruction with a concrete, measurable one. "כתוב טוב" → "כתוב בטון מקצועי-ידידותי, 300-500 מילים, עם 3 נקודות מפתח"\n3. STRUCTURE: Ensure clean markdown with headers, bullets, delimiters. The prompt must be scannable.\n4. ACTIONABILITY: Would an LLM produce excellent output on the FIRST try? If not, add more guidance.\n5. ANTI-PATTERNS: Remove generic filler ("be creative", "write well"). Every word must earn its place.\n6. EDGE CASES: Add handling for ambiguous inputs — what should the LLM do if info is missing?\n\nFill ALL gaps by inferring from the user's intent, category, and tone. The output must be dramatically better than what the user could write on their own — that's the entire value of Peroot.\n\nAfter the enhanced prompt, on a new line add a short descriptive Hebrew title for this prompt using this exact format:\n[PROMPT_TITLE]שם קצר ותיאורי בעברית[/PROMPT_TITLE]\n\nThen add [GENIUS_QUESTIONS] followed by up to 3 targeted clarifying questions in JSON array format that would most improve the prompt's effectiveness. Questions should target the HIGHEST-IMPACT gaps — the details that would most change the output quality.\nFormat: [GENIUS_QUESTIONS][{"id": 1, "question": "...", "description": "...", "examples": ["..."]}]\nIf the prompt is already comprehensive, return [GENIUS_QUESTIONS][]`,
         userPrompt: this.buildTemplate(this.config.user_prompt_template, variables),
         outputFormat: "text",
         requiredFields: [],
     };
  }

  generateRefinement(input: EngineInput): EngineOutput {
        if (!input.previousResult) throw new Error("Previous result required for refinement");
        const instruction = input.refinementInstruction || "שפר את התוצאה והפוך אותה למקצועית יותר.";

        // Build answers context from individual Q&A pairs
        let answersBlock = "";
        if (input.answers && Object.keys(input.answers).length > 0) {
            const pairs = Object.entries(input.answers)
                .filter(([, v]) => v.trim())
                .map(([, answer]) => `- ${answer}`)
                .join("\n");
            if (pairs) {
                answersBlock = `\n\nתשובות המשתמש לשאלות ההבהרה:\n${pairs}\n`;
            }
        }

        return {
            systemPrompt: `אתה מהנדס פרומפטים ברמה הגבוהה ביותר. משימתך: לשדרג את הפרומפט הקיים לרמת מקצוענות מושלמת, על בסיס המשוב, התשובות והפרטים החדשים שהמשתמש סיפק.

כללים:
1. שלב את כל התשובות והמשוב לתוך הפרומפט — אל תתעלם מאף פרט, גם הקטן ביותר.
2. שמור ושפר את המבנה המקצועי: תפקיד, משימה, הקשר, פורמט, מגבלות.
3. שפר את הדיוק והספציפיות בכל מקום שאפשר — החלף הוראות מעורפלות בהוראות מדידות.
4. הפלט חייב להיות בעברית בלבד.
5. אל תוסיף הסברים — רק את הפרומפט המשודרג.
6. כל גרסה חדשה חייבת להיות טובה משמעותית מהקודמת — לא רק שינוי קוסמטי.
7. אם התשובות חושפות כיוון חדש — הרחב את הפרומפט בהתאם, אל תשאיר פערים.

טון: ${input.tone}. קטגוריה: ${input.category}.

${this.getSystemIdentity()}

After the improved prompt, add the delimiter [GENIUS_QUESTIONS] followed by up to 3 NEW questions targeting the remaining highest-impact gaps, or an empty array [] if the prompt is now comprehensive.`,
            userPrompt: `הפרומפט הנוכחי:
---
${input.previousResult}
---
${answersBlock}
${instruction ? `הוראות נוספות מהמשתמש: ${instruction}` : ''}

שלב את כל המידע החדש לתוך פרומפט מעודכן ומשודרג בעברית.`,
            outputFormat: "text",
            requiredFields: []
        };
  }
}
