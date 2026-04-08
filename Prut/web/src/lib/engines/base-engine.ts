
import { EngineConfig, EngineInput, EngineOutput, PromptEngine, TargetModel, InjectionStats } from "./types";
import { CapabilityMode } from "../capability-mode";
import { getRegistryInstructionBlock } from "../variable-utils";
import { getIterationInstructions } from "./refinement/iteration-guidance";
import { getQuestionsPromptInstructions } from "./refinement/enhanced-questions";
import { EnhancedScorer, type EnhancedScore } from "./scoring/enhanced-scorer";
import { memoryFlags } from "../memory/injection-flags";

/**
 * Escape template variable patterns in user-supplied values to prevent
 * injection: if a user's prompt contains "{{tone}}", it would otherwise
 * be replaced by the template engine on a subsequent iteration.
 */
export function escapeTemplateVars(value: string): string {
  return value.replace(/\{\{/g, '{ {').replace(/\}\}/g, '} }');
}

/** Allowed modeParams keys that may be spread into template variables. */
const ALLOWED_MODE_PARAMS = new Set([
  'video_platform',
  'image_platform',
  'aspect_ratio',
  'output_format',
]);

/**
 * Sanitize modeParams: only allow whitelisted keys and escape their values
 * to prevent template injection.
 */
export function sanitizeModeParams(
  params: Record<string, string> | undefined
): Record<string, string> {
  if (!params) return {};
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (ALLOWED_MODE_PARAMS.has(key) && typeof value === 'string') {
      sanitized[key] = escapeTemplateVars(value);
    }
  }
  return sanitized;
}

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

// ── Visual Scoring Dimensions (IMAGE_GENERATION / VIDEO_GENERATION) ──
// Total for IMAGE (7 dims, no motion): 10+15+15+12+15+10+10 = 87 → normalised to 100
// Total for VIDEO (8 dims, incl. motion): 10+15+15+12+15+10+10+13 = 100

const VISUAL_SCORING_DIMENSIONS: {
  key: string;
  maxPoints: number;
  tip: string;
  videoOnly?: boolean;
  test: (text: string, wordCount: number) => number;
}[] = [
  {
    key: "length",
    maxPoints: 10,
    tip: "הוסף עוד פרטים ותיאורים חזותיים",
    test: (_text, wc) => {
      if (wc <= 3) return 0;
      if (wc <= 6) return 2;
      if (wc <= 12) return 4;
      if (wc <= 25) return 7;
      if (wc <= 50) return 10;
      return 10;
    },
  },
  {
    key: "subject",
    maxPoints: 15,
    tip: "תאר את הנושא המרכזי בפירוט (מראה, תנוחה, ביטוי)",
    test: (text) => {
      let pts = 0;
      if (/person|woman|man|child|character|portrait|face|figure|אישה|איש|דמות|ילד|פנים/i.test(text)) pts += 5;
      if (/wearing|dressed|hair|eyes|skin|clothes|suit|dress|לובש|שיער|עיניים|בגד/i.test(text)) pts += 5;
      if (/car|building|landscape|forest|city|ocean|room|table|product|מכונית|בניין|נוף|יער|עיר|חדר/i.test(text)) pts += 5;
      return Math.min(15, pts);
    },
  },
  {
    key: "style",
    maxPoints: 15,
    tip: "ציין סגנון אמנותי (צילום, ציור שמן, 3D, אנימה)",
    test: (text) => {
      let pts = 0;
      if (/photo|realistic|illustration|painting|3d|render|anime|watercolor|digital art|concept art|צילום|ציור|איור|תלת-מימד/i.test(text)) pts += 8;
      if (/style of|בסגנון|aesthetic|art deco|cyberpunk|minimalist|vintage|retro|modern/i.test(text)) pts += 7;
      return Math.min(15, pts);
    },
  },
  {
    key: "composition",
    maxPoints: 12,
    tip: "הוסף הנחיות קומפוזיציה (זווית מצלמה, מסגור, עדשה)",
    test: (text) => {
      let pts = 0;
      if (/close-up|wide shot|aerial|medium shot|full body|bird's eye|low angle|high angle|dutch|תקריב|זווית|מבט/i.test(text)) pts += 6;
      if (/rule of thirds|centered|symmetr|diagonal|foreground|background|depth|bokeh|shallow|עומק שדה|רקע/i.test(text)) pts += 6;
      return Math.min(12, pts);
    },
  },
  {
    key: "lighting",
    maxPoints: 15,
    tip: "תאר תאורה (שעת זהב, סטודיו, ניאון, כיוון האור)",
    test: (text) => {
      let pts = 0;
      if (/golden hour|blue hour|sunset|sunrise|natural light|studio|neon|backlight|rim light|volumetric|שעת זהב|תאורה|אור/i.test(text)) pts += 8;
      if (/soft|hard|dramatic|warm|cool|diffused|shadow|contrast|high key|low key|רך|חם|קר|דרמטי/i.test(text)) pts += 7;
      return Math.min(15, pts);
    },
  },
  {
    key: "color",
    maxPoints: 10,
    tip: "ציין פלטת צבעים ואווירה (צבעים ספציפיים, מצב רוח)",
    test: (text) => {
      let pts = 0;
      if (/color|palette|#[0-9a-f]{3,6}|red|blue|green|gold|amber|navy|crimson|emerald|צבע|אדום|כחול|ירוק|זהב/i.test(text)) pts += 5;
      if (/mood|atmosphere|dramatic|serene|energetic|mysterious|cozy|epic|אווירה|דרמטי|רגוע|מסתורי/i.test(text)) pts += 5;
      return Math.min(10, pts);
    },
  },
  {
    key: "quality",
    maxPoints: 10,
    tip: "הוסף מילות איכות (4K, masterpiece, professional, photorealistic)",
    test: (text) => {
      let pts = 0;
      if (/4k|8k|hdr|ultra|high quality|detailed|sharp|professional|masterpiece|award/i.test(text)) pts += 5;
      if (/camera|lens|f\/\d|mm\b|canon|sony|nikon|unreal|octane|v-ray|עדשה|מצלמה/i.test(text)) pts += 5;
      return Math.min(10, pts);
    },
  },
  {
    key: "motion",
    maxPoints: 13,
    tip: "תאר תנועה (מצלמה, נושא, סביבה)",
    videoOnly: true,
    test: (text) => {
      let pts = 0;
      if (/dolly|pan|tilt|tracking|orbit|push-in|zoom|crane|handheld|static/i.test(text)) pts += 5;
      if (/walk|run|turn|raise|lower|spin|jump|fly|float|drift|moves|slides/i.test(text)) pts += 4;
      if (/wind|rain|particles|dust|smoke|waves|clouds|flow|flutter/i.test(text)) pts += 4;
      return Math.min(13, pts);
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
   * When mode is IMAGE_GENERATION or VIDEO_GENERATION, visual scoring dimensions
   * are used instead of the standard text/marketing ones.
   *
   * Scoring scale (total possible = 100):
   *   - Raw simple prompts ("כתוב מייל"):         15-30%
   *   - Basic prompts with some detail:             30-45%
   *   - Good prompts with context & specifics:      45-65%
   *   - Strong prompts with role, format, constraints: 65-85%
   *   - Expert-level engineered prompts:            85-100%
   */
  /**
   * Enhanced scoring — uses the new EnhancedScorer with 15 dimensions for text
   * and 8 for visual. Returns rich breakdown with matched/missing patterns.
   */
  public static scoreEnhanced(input: string, mode?: CapabilityMode): EnhancedScore {
    return EnhancedScorer.score(input, mode || CapabilityMode.STANDARD);
  }

  public static scorePrompt(input: string, mode?: CapabilityMode): PromptScore {
    const trimmed = input.trim();
    if (!trimmed) return { score: 0, baseScore: 0, level: 'empty', label: 'חסר', tips: [], usageBoost: 0 };

    const wordCount = trimmed.split(/\s+/).length;
    const tips: string[] = [];
    let totalScore = 0;

    const isVisual = mode === CapabilityMode.IMAGE_GENERATION || mode === CapabilityMode.VIDEO_GENERATION;
    const isVideo = mode === CapabilityMode.VIDEO_GENERATION;

    if (isVisual) {
      // For image: use first 7 dims (exclude motion), raw max = 87, normalise to 100.
      // For video: use all 8 dims, raw max = 100.
      const dims = isVideo
        ? VISUAL_SCORING_DIMENSIONS
        : VISUAL_SCORING_DIMENSIONS.filter(d => !d.videoOnly);
      const rawMax = dims.reduce((sum, d) => sum + d.maxPoints, 0);

      for (const dim of dims) {
        const pts = dim.test(trimmed, wordCount);
        totalScore += pts;
        if (pts < dim.maxPoints / 2) {
          tips.push(dim.tip);
        }
      }

      // Normalise to 100
      const normalised = rawMax > 0 ? Math.round((totalScore / rawMax) * 100) : 0;
      const finalScore = Math.min(100, normalised);
      const usageBoost = wordCount > 40 ? 3 : wordCount > 20 ? 2 : wordCount > 10 ? 1 : 0;

      return {
        score: finalScore,
        baseScore: finalScore,
        level: finalScore >= 65 ? 'high' : finalScore >= 35 ? 'medium' : 'low',
        label: finalScore >= 65 ? 'חזק' : finalScore >= 35 ? 'בינוני' : 'חלש',
        tips: tips.slice(0, 3),
        usageBoost,
      };
    }

    // Standard text/marketing scoring
    for (const dim of SCORING_DIMENSIONS) {
      const pts = dim.test(trimmed, wordCount);
      totalScore += pts;
      // Suggest tip if dimension scored less than half its potential
      if (pts < dim.maxPoints / 2) {
        tips.push(dim.tip);
      }
    }

    // CO-STAR bonus: +5 for Style/Tone/Response format keywords
    if (/סגנון|style|טון|tone|פורמט\s*(תגובה|פלט)|response\s*format/i.test(trimmed)) {
      totalScore += 5;
    }
    // RISEN bonus: +5 for End Goal/Steps/Narrowing patterns
    if (/מטרה\s*סופית|end\s*goal|צעדים|steps|מיקוד|narrowing|תוצאה\s*רצויה|desired\s*outcome/i.test(trimmed)) {
      totalScore += 5;
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

  /**
   * Returns canonical variable registry instructions for the AI system prompt.
   * Tells the AI which variable names to use in enhanced prompts.
   */
  protected getVariableRegistryBlock(category?: string): string {
    const registryList = getRegistryInstructionBlock(category);

    return `[VARIABLE_REGISTRY]
When the enhanced prompt needs user-specific values that vary per use case, insert template variables in {snake_case} format.

VARIABLE RULES:
1. Use ONLY English snake_case names inside {} braces — NEVER Hebrew variable names like {שם החברה}.
2. Pick from the approved list below FIRST. Only create a new variable if nothing fits, and use the same snake_case convention.
3. Maximum 5-7 variables per prompt — do not over-parameterize simple prompts.
4. Only add variables for values that genuinely CHANGE between uses. Do not make static instructions into variables.

APPROVED VARIABLES:
${registryList}`;
  }

  /**
   * Returns model-specific optimization hints for the target LLM.
   * These guide the prompt structure to maximize effectiveness on each model.
   */
  protected static getModelAdaptationHints(targetModel?: TargetModel): string | null {
    switch (targetModel) {
      case 'chatgpt':
        return `[TARGET_MODEL_OPTIMIZATION — ChatGPT/GPT]
- השתמש בפתיחת "You are..." לתפקיד המומחה
- השתמש בפורמט Markdown מלא: כותרות ##, בולטים, **הדגשות**, קוד
- הוסף טריגר Chain-of-Thought: "חשוב צעד אחר צעד לפני שתענה"
- העדף רשימות ממוספרות ונקודות (bullets) לפלט מובנה
- הוסף "Important:" לפני הנחיות קריטיות`;
      case 'claude':
        return `[TARGET_MODEL_OPTIMIZATION — Claude]
- עטוף הנחיות מרכזיות בתגיות XML: <task>, <context>, <constraints>, <output_format>
- הוסף בלוק <thinking> לניתוח פנימי לפני תשובה
- ספק הקשר מפורט ורקע עשיר — Claude מצטיין עם context ארוך
- השתמש ב-"חשוב:" או "קריטי:" לפני הנחיות שאסור לפספס
- מבנה ברור עם הפרדה ויזואלית בין סקשנים`;
      case 'gemini':
        return `[TARGET_MODEL_OPTIMIZATION — Gemini]
- השתמש בכותרות מובנות ברורות עם ## לכל סקשן
- העדף רשימות ממוספרות על פני בולטים לצעדים
- הגדר מגבלות מפורשות ובלתי-דו-משמעיות (constraints)
- הוסף דוגמאות מספריות ולוגיות כאשר רלוונטי
- סיים עם "Output Requirements:" שמסכם את כל דרישות הפלט`;
      default:
        return null;
    }
  }

  generate(input: EngineInput): EngineOutput {
     const variables: Record<string, string> = {
         input: escapeTemplateVars(input.prompt),
         tone: escapeTemplateVars(input.tone),
         category: escapeTemplateVars(input.category),
         ...sanitizeModeParams(input.modeParams)
     };

     const systemPrompt = this.buildTemplate(this.config.system_prompt_template, variables);

     let contextInjected = systemPrompt;

     // Personalization injection telemetry. Stamped onto EngineOutput so the
     // enhance route can persist it to activity_logs.details for A/B and
     // score-impact analysis. Without this we cannot prove the layers work.
     const injectionStats: InjectionStats = {
         personalityInjected: false,
         historyCount: 0,
         historyHasEnhanced: false,
         historySource: 'none',
         approxAddedTokens: 0,
     };
     const startLen = contextInjected.length;

     if (memoryFlags.historyEnabled && input.userHistory && input.userHistory.length > 0) {
         // When `enhanced` is present we render before→after pairs, which
         // teach the model the desired transformation, not just the user's
         // raw style. Falls back to the legacy "raw prompt only" rendering
         // for entries without an enhanced version (e.g., personal_library
         // rows that were never run through Peroot).
         const hasEnhanced = input.userHistory.some(h => h.enhanced && h.enhanced.trim().length > 0);
         const historyBlock = input.userHistory
            .map(h => {
                const before = h.prompt.slice(0, 500);
                if (h.enhanced && h.enhanced.trim().length > 0) {
                    return `Title: ${h.title}\nBefore (user wrote):\n${before}\n\nAfter (Peroot enhanced):\n${h.enhanced.slice(0, 800)}`;
                }
                return `Title: ${h.title}\nPrompt:\n${before}`;
            })
            .join('\n\n---\n\n');

         const intro = hasEnhanced
            ? `The following are recent before→after pairs from this user's own enhancement history. Learn the transformation pattern — how their raw ideas were elevated into great prompts — and apply the same level of structure, specificity, and tone to the new request:`
            : `The following are examples of prompts this user has saved or liked. Analyze their tone, phrasing, and structure to ensure the result feels natural to them while maintaining professional engineering standards:`;

         contextInjected += `\n\n[USER_STYLE_CONTEXT]\n${intro}\n\n${historyBlock}\n`;

         injectionStats.historyCount = input.userHistory.length;
         injectionStats.historyHasEnhanced = hasEnhanced;
         injectionStats.historySource = hasEnhanced ? 'recent_history' : 'use_count';
     }

     if (memoryFlags.personalityEnabled && input.userPersonality) {
         const { tokens, brief, format } = input.userPersonality;
         contextInjected += `\n\n[USER_PERSONALITY_TRAITS]\n`;
         if (tokens.length > 0) contextInjected += `- Key Style Tokens: ${tokens.join(', ')}\n`;
         if (format) contextInjected += `- Preferred Format: ${format}\n`;
         if (brief) contextInjected += `- Personality Profile: ${brief}\n`;
         contextInjected += `\nApply these traits strictly to the output.\n`;
         injectionStats.personalityInjected = true;
     }

     // Rough char/4 token estimate for cost observability. Not exact, but
     // good enough to spot a runaway block in the dashboard.
     injectionStats.approxAddedTokens = Math.round((contextInjected.length - startLen) / 4);

     if (input.context && input.context.length > 0) {
         const fileCount = input.context.filter(a => a.type === 'file').length;
         const urlCount = input.context.filter(a => a.type === 'url').length;
         const imageCount = input.context.filter(a => a.type === 'image').length;
         const attachmentSummary = [
             fileCount > 0 ? `${fileCount} קבצים` : '',
             urlCount > 0 ? `${urlCount} קישורים` : '',
             imageCount > 0 ? `${imageCount} תמונות` : '',
         ].filter(Boolean).join(', ');

         // Check if user prompt is minimal (short/vague)
         const isMinimalPrompt = input.prompt.trim().length < 30;

         contextInjected += `\n\n[ATTACHED_CONTEXT — ${attachmentSummary}]
זהו הפיצ'ר החזק ביותר של פירוט. המשתמש צירף חומר מקור אמיתי.

## שלב 0: זיהוי אוטומטי של סוג המסמך (DOCUMENT INTELLIGENCE)

לפני שתתחיל לבנות את הפרומפט, בצע ניתוח אוטומטי של כל מסמך מצורף:

**סווג את המסמך לאחד מ-15 הסוגים הבאים:**

| סוג מסמך | סימנים מזהים | פעולות ברירת מחדל |
|-----------|-------------|-------------------|
| **חוזה/הסכם** | סעיפים ממוספרים, "הצדדים", "תנאים", חתימות | ניתוח סעיפים, זיהוי סיכונים, סיכום מחייב |
| **מאמר אקדמי/מחקר** | תקציר, מתודולוגיה, ביבליוגרפיה, מסקנות | סיכום ממצאים, ביקורת מתודולוגית, שאלות מחקר |
| **חומר לימודי/פרק** | כותרות, מושגים, תרגילים, סיכום | יצירת מבחן, שאלות הבנה, סיכום, כרטיסיות |
| **דו"ח עסקי/פיננסי** | טבלאות, גרפים, KPIs, מסקנות, המלצות | ניתוח טרנדים, תובנות, מצגת הנהלה |
| **קוד מקור** | functions, classes, imports, syntax | דיבוג, רפקטורינג, דוקומנטציה, code review |
| **נתונים (CSV/Excel)** | עמודות, שורות, מספרים, headers | ניתוח סטטיסטי, ויזואליזציה, תובנות |
| **מכתב/אימייל** | פנייה, חתימה, נושא | תשובה, שכתוב, שיפור טון, תרגום |
| **תוכנית עבודה/פרויקט** | שלבים, תאריכים, אחראים, milestone | ניהול סיכונים, אופטימיזציה, דיווח סטטוס |
| **מצגת/slides** | כותרות שקפים, bullets, ויזואלים | שיפור תוכן, הוספת speaker notes, סיכום |
| **ראיון/תמלול** | שאלה-תשובה, דובר 1/2, זמנים | סיכום, ניתוח, חילוץ action items |
| **תיאור מוצר/שירות** | פיצ'רים, יתרונות, מחיר, קהל | שיפור copy, A/B testing, landing page |
| **רשימה/מלאי** | פריטים, כמויות, קטגוריות | ארגון, סינון, ניתוח, אופטימיזציה |
| **טופס/שאלון** | שאלות, שדות, אפשרויות | שיפור ניסוח, ניתוח תוצאות, אוטומציה |
| **תוכן שיווקי** | כותרות, CTA, קהל יעד, USP | שיפור conversion, A/B, SEO |
| **אחר/מעורב** | שילוב של סוגים | ניתוח מקיף, זיהוי המרכיב הדומיננטי |

**אחרי הזיהוי:**
1. קבע את סוג המסמך (יכול להיות שילוב)
2. זהה את השפה הדומיננטית (עברית/אנגלית/אחר)
3. העריך את רמת המורכבות (בסיסי/בינוני/מתקדם)
4. זהה ישויות מפתח: שמות, תאריכים, מספרים, מושגים מרכזיים
5. הסק את הכוונה הסבירה של המשתמש (מה הוא כנראה רוצה לעשות עם המסמך)

${isMinimalPrompt ? `## חשוב — פרומפט מינימלי זוהה!
הפרומפט של המשתמש קצר/כללי ("${input.prompt.slice(0, 50)}"). זה אומר שה-CONTEXT הוא עיקר המשימה.
עליך:
1. לזהות מה סוג המסמך ומה הכוונה הסבירה
2. ליצור פרומפט עשיר ומפורט מאפס — כאילו המשתמש ישב וכתב פרומפט של 200 מילים
3. להשתמש בכל הפרטים מהקובץ: מושגים, מבנה, נתונים, שמות, תאריכים
4. לבחור תפקיד מומחה רלוונטי למסמך (לא למשתמש)
5. להגדיר פורמט פלט חכם שמתאים לסוג המסמך
דוגמה: משתמש כתב "תסכם" + צירף חוזה → צור פרומפט מלא לעורך דין שמנתח חוזה, מזהה סעיפים קריטיים, מסכם התחייבויות, ומציג סיכונים בטבלה.` : ''}

## שלב 1: ניתוח עומק
- קרא את כל החומר המצורף
- זהה: סוג מסמך, שפה, מורכבות, ישויות מפתח
- הסק: מה המשתמש כנראה רוצה

## שלב 2: שילוב אינטליגנטי
- שלב נתונים ספציפיים מהקובץ ישירות בפרומפט (מספרים, שמות, מושגים)
- אל תגיד "על סמך הקובץ" — שלב את התוכן עצמו
- אם יש מבנה (פרקים, סעיפים, טבלאות) — שלב אותו
- התאם טון: חוזה=פורמלי, שיווק=שכנועי, לימודי=מסביר

## שלב 3: בניית פרומפט מותאם-מסמך
הפרומפט המשודרג חייב לכלול:
1. **תפקיד מומחה** שמתאים לסוג המסמך (לא גנרי!)
   - חוזה → עורך דין מומחה | לימודי → מורה מנוסה | נתונים → אנליסט בכיר | קוד → מפתח senior
2. **משימה ספציפית** שנגזרת מהתוכן + הכוונה
3. **הקשר מהמסמך** — ישויות, מושגים, מבנה ספציפי (לא "המסמך מכיל...")
4. **הוראות עיבוד** — מה לעשות עם כל חלק במסמך
5. **פורמט פלט** חכם (טבלה לנתונים, רשימה לניתוח, מבנה לסיכום)
6. **בדיקות איכות** שמוודאות נאמנות ל-context

## מה לא לעשות
- ❌ לא להעתיק טקסט מהקובץ כמות שהוא
- ❌ לא "ראה קובץ מצורף" — ה-LLM שיקבל את הפרומפט לא יראה אותו
- ❌ לא להתעלם מה-context ולייצר פרומפט גנרי
- ❌ לא לסכם את הקובץ — לשלב אותו כ-context בפרומפט

=== תוכן הקבצים המצורפים ===

`;
         for (const attachment of input.context) {
             if (attachment.type === 'image') {
                 contextInjected += `━━━ 🖼️ תמונה: "${attachment.name}" ━━━\nתיאור ויזואלי:\n${attachment.description || attachment.content}\n\n`;
             } else if (attachment.type === 'url') {
                 contextInjected += `━━━ 🌐 URL: ${attachment.url || attachment.name} ━━━\nתוכן הדף:\n${attachment.content}\n\n`;
             } else {
                 contextInjected += `━━━ 📄 קובץ: "${attachment.name}" (${attachment.format || 'text'}) ━━━\nתוכן:\n${attachment.content}\n\n`;
             }
         }
         contextInjected += `=== סוף תוכן מצורף ===\n\nזכור: הפרומפט שתייצר חייב להתייחס ספציפית לתוכן שלמעלה. זהה את סוג המסמך, הסק את הכוונה, ובנה פרומפט שמנצל את ה-context ל-100%.\n`;
     }

     const hasContext = input.context && input.context.length > 0;

     // Context-aware GENIUS_QUESTIONS instructions
     const contextQuestionRules = hasContext
         ? `\n\nCONTEXT-AWARE QUESTION RULES (attachments exist):
- Questions should probe GAPS in the context, not repeat what's already in the files
- Ask about the user's INTENT with the uploaded material (not about the material itself)
- Example: if PDF has a contract → ask "מה המטרה? לנתח סעיפים? לסכם? ליצור תבנית?"
- Example: if CSV has data → ask "מה התובנה שאתה מחפש? איזה KPIs חשובים?"
- Never ask "what's in the file" — you already have the content`
         : '';

     const modelHints = BaseEngine.getModelAdaptationHints(input.targetModel);

     const variableRegistryBlock = this.getVariableRegistryBlock(input.category);

     return {
         systemPrompt: `${contextInjected}\n\n${this.getSystemIdentity()}${modelHints ? `\n\n${modelHints}` : ''}\n\n${variableRegistryBlock}\n\n[GENIUS_ANALYSIS]\nBefore generating, perform this rigorous internal quality check (do NOT output this analysis):\n1. COMPLETENESS: Does the prompt specify Role, Task, Context, Format, and Constraints? Fill ANY missing sections.\n2. SPECIFICITY: Replace every vague instruction with a concrete, measurable one. "כתוב טוב" → "כתוב בטון מקצועי-ידידותי, 300-500 מילים, עם 3 נקודות מפתח"\n3. STRUCTURE: Ensure clean markdown with headers, bullets, delimiters. The prompt must be scannable.\n4. ACTIONABILITY: Would an LLM produce excellent output on the FIRST try? If not, add more guidance.\n5. ANTI-PATTERNS: Remove generic filler ("be creative", "write well"). Every word must earn its place.\n6. EDGE CASES: Add handling for ambiguous inputs - what should the LLM do if info is missing?\n7. ANTI-HALLUCINATION: For factual tasks, add grounding: "בסס על עובדות. אם אינך בטוח - ציין זאת."\n8. PERSONA DEPTH: Expert persona must include methodology name, years of experience, and signature approach.\n9. OUTPUT GATE: Add self-verification: "לפני שליחה - בדוק שכל דרישה מתקיימת"\n10. CONTEXT INTEGRATION: If [ATTACHED_CONTEXT] exists — the prompt MUST reference specific data, terms, or structure from the attachments. A prompt that ignores uploaded context is a FAILURE. Extract key entities, numbers, and themes and weave them into the instructions. The enhanced prompt should include the actual data from the context embedded directly — not "see attached file" but the real content woven in.\n11. CO-STAR VALIDATION: Verify the prompt includes all CO-STAR elements — Context (רקע), Objective (מטרה), Style (סגנון כתיבה), Tone (טון), Audience (קהל יעד), Response format (פורמט תגובה). If Style or Tone are missing — add them explicitly. If Response format is vague — make it specific.\n12. RISEN VALIDATION: Verify the prompt includes RISEN elements — Role (תפקיד), Instructions (הנחיות מפורטות), Steps (צעדים ממוספרים), End goal (מטרה סופית/תוצאה רצויה), Narrowing (מיקוד ומגבלות). If End Goal is missing — infer and add it. If Steps are absent for multi-step tasks — decompose the task. If Narrowing is weak — add 2-3 explicit constraints.\n\nFill ALL gaps by inferring from the user's intent, category, and tone. The output must be dramatically better than what the user could write on their own - that's the entire value of Peroot.\n\nAfter the enhanced prompt, on a new line add a short descriptive Hebrew title for this prompt using this exact format:\n[PROMPT_TITLE]שם קצר ותיאורי בעברית[/PROMPT_TITLE]\n\nThen add [GENIUS_QUESTIONS] followed by contextual clarifying questions in JSON array format.\n\nIMPORTANT — CONTEXTUAL QUESTION GENERATION RULES:\n1. ANALYZE the prompt domain first: marketing? code? content? research? education? business?\n2. Generate DOMAIN-SPECIFIC questions, not generic ones. For marketing: ask about target audience, USP, funnel stage. For code: ask about language, framework, error handling. For content: ask about tone, audience expertise level, publishing platform.\n3. DYNAMIC COUNT (2-5 questions): Simple prompts (clear single task) → 2 questions. Medium complexity (multi-step or ambiguous) → 3 questions. Complex prompts (vague, multi-domain, strategic) → 4-5 questions.\n4. Each question must be actionable — answering it should DIRECTLY change the output.\n5. Include 2-3 concrete example answers per question that are domain-relevant.\n6. Questions in Hebrew. Order by impact — most important first.${contextQuestionRules}\n\nEnhanced Format (include priority, category, impact, required fields):\n[GENIUS_QUESTIONS][{"id": 1, "question": "...", "description": "...", "examples": ["ex1", "ex2", "ex3", "ex4"], "priority": 10, "category": "audience", "impactEstimate": "+10 נקודות", "required": true}]\n\nFIELD DEFINITIONS:\n- priority (1-10): 10 = critical gap, 1 = nice-to-have. Order by impact (highest first).\n- category: role | task | audience | format | constraints | context | platform | style | examples\n- impactEstimate: Estimated score boost, e.g., "+10 נקודות"\n- required: true if answering is critical for quality output\nIf the prompt is already comprehensive, return [GENIUS_QUESTIONS][]`,
         userPrompt: hasContext
             ? `${this.buildTemplate(this.config.user_prompt_template, variables)}\n\n[חומר מצורף מהמשתמש — השתמש בו כ-context בפרומפט המשודרג]\n${this.buildContextSummaryForUserPrompt(input.context!)}`
             : this.buildTemplate(this.config.user_prompt_template, variables),
         outputFormat: "text",
         requiredFields: [],
         injectionStats,
     };
  }

  /** Build a concise context summary for the user prompt message */
  private buildContextSummaryForUserPrompt(context: NonNullable<EngineInput['context']>): string {
      return context.map(a => {
          if (a.type === 'image') return `[תמונה: ${a.name}]\n${(a.description || a.content).slice(0, 1500)}`;
          if (a.type === 'url') return `[URL: ${a.url || a.name}] ${a.content.slice(0, 1000)}`;
          return `[${a.format?.toUpperCase() || 'קובץ'}: ${a.name}] ${a.content.slice(0, 1500)}`;
      }).join('\n\n');
  }

  generateRefinement(input: EngineInput): EngineOutput {
        if (!input.previousResult) throw new Error("Previous result required for refinement");
        const iteration = input.iteration || 1;
        const instruction = (input.refinementInstruction || "שפר את התוצאה והפוך אותה למקצועית יותר.").trim().slice(0, 2000);

        // Build answers context from individual Q&A pairs
        // The refinementInstruction already contains question-answer pairs from the client,
        // but we also include the raw answers as additional context
        let answersBlock = "";
        if (input.answers && Object.keys(input.answers).length > 0) {
            const pairs = Object.entries(input.answers)
                .filter(([, v]) => v.trim())
                .map(([key, answer]) => {
                    // If the answer already contains the question context (from refinementInstruction), use as-is
                    // Otherwise include the key for traceability
                    return `- [${key}] ${answer}`;
                })
                .join("\n");
            if (pairs) {
                answersBlock = `\n\nתשובות המשתמש לשאלות ההבהרה:\n${pairs}\n`;
            }
        }

        // 5-tier iteration-aware guidance (Upgrade 3 — replaces 3-tier system)
        const iterationGuidance = getIterationInstructions(iteration);

        // Build context block for refinement
        let contextBlock = '';
        if (input.context && input.context.length > 0) {
            contextBlock = `\n\n[CONTEXT מצורף — שמור על שילוב ה-context מהגרסה הקודמת]\nהמשתמש צירף חומרי מקור. ודא שהפרומפט המשודרג ממשיך להתייחס ספציפית לתוכן המצורף — נתונים, מושגים, מבנה. אם הגרסה הקודמת התעלמה מה-context — תקן זאת.\n\n${this.buildContextSummaryForUserPrompt(input.context)}\n`;
        }

        const modelHints = BaseEngine.getModelAdaptationHints(input.targetModel);

        return {
            systemPrompt: `אתה מהנדס פרומפטים ברמה הגבוהה ביותר. משימתך: לשדרג את הפרומפט הקיים לרמת מקצוענות מושלמת, על בסיס המשוב, התשובות והפרטים החדשים שהמשתמש סיפק.
${modelHints ? `\n${modelHints}\n` : ''}
כללים:
1. שלב את כל התשובות והמשוב לתוך הפרומפט - אל תתעלם מאף פרט, גם הקטן ביותר.
2. שמור ושפר את המבנה המקצועי: תפקיד, משימה, הקשר, פורמט, מגבלות.
3. שפר את הדיוק והספציפיות בכל מקום שאפשר - החלף הוראות מעורפלות בהוראות מדידות.
4. הפלט חייב להיות בעברית בלבד.
5. אל תוסיף הסברים - רק את הפרומפט המשודרג.
6. כל גרסה חדשה חייבת להיות טובה משמעותית מהקודמת - לא רק שינוי קוסמטי.
7. אם התשובות חושפות כיוון חדש - הרחב את הפרומפט בהתאם, אל תשאיר פערים.
8. בדוק שהפרומפט כולל הגנת anti-hallucination (עיגון בעובדות) למשימות עובדתיות.
9. ודא שהפרסונה המקצועית כוללת שנות ניסיון, מתודולוגיה ייחודית, ותחום מומחיות ספציפי.
10. ודא שיש Output Quality Gate - הנחיה ל-LLM לבדוק את עצמו לפני שליחת התשובה.
11. אם יש context מצורף — ודא שהפרומפט המשודרג מתייחס ספציפית לנתונים, מושגים ומבנה מהקבצים. לא "על סמך הקובץ" אלא שילוב ישיר של תוכן.
${iterationGuidance}

טון: ${input.tone}. קטגוריה: ${input.category}.

${this.getSystemIdentity()}

${this.getVariableRegistryBlock(input.category)}

After the improved prompt, add the delimiter [GENIUS_QUESTIONS] followed by NEW contextual clarifying questions.

CONTEXTUAL QUESTION RULES FOR REFINEMENT:
1. Questions must be DIFFERENT from previous rounds — never repeat a question the user already answered.
2. Analyze what's STILL missing after incorporating the user's answers.
3. Domain-aware: if the prompt is about marketing, ask marketing-specific follow-ups. If code, ask technical follow-ups.
4. DYNAMIC COUNT: If many gaps remain → 3-4 questions. If prompt is nearly complete → 1-2 questions. If comprehensive → empty array [].
5. Each question must include 2-3 concrete Hebrew example answers.
6. Order by impact — most important first.
${input.context && input.context.length > 0 ? '7. If context is attached — ask about INTENT with the material, not about what\'s in it.' : ''}

Enhanced Format (include priority, category, impact, required fields):\n[GENIUS_QUESTIONS][{"id": 1, "question": "...", "description": "...", "examples": ["ex1", "ex2", "ex3", "ex4"], "priority": 10, "category": "audience", "impactEstimate": "+10 נקודות", "required": true}]\n\nFIELD DEFINITIONS:\n- priority (1-10): 10 = critical gap, 1 = nice-to-have. Order by impact (highest first).\n- category: role | task | audience | format | constraints | context | platform | style | examples\n- impactEstimate: Estimated score boost, e.g., "+10 נקודות"\n- required: true if answering is critical for quality output`,
            userPrompt: `הפרומפט הנוכחי:
---
${input.previousResult}
---
${answersBlock}
${instruction ? `הוראות נוספות מהמשתמש: ${instruction}` : ''}
${contextBlock}
שלב את כל המידע החדש לתוך פרומפט מעודכן ומשודרג בעברית.`,
            outputFormat: "text",
            requiredFields: []
        };
  }
}
