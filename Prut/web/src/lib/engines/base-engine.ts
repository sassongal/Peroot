
import { EngineConfig, EngineInput, EngineOutput, PromptEngine, TargetModel, InjectionStats } from "./types";
import { CapabilityMode } from "../capability-mode";
import { getRegistryInstructionBlock } from "../variable-utils";
import { getIterationInstructions } from "./refinement/iteration-guidance";
import { EnhancedScorer, type EnhancedScore } from "./scoring/enhanced-scorer";
import { memoryFlags } from "../memory/injection-flags";
import { renderInjection } from '@/lib/context/engine/inject';
import type { ContextBlock } from '@/lib/context/engine/types';

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
   * Rich breakdown — same rubric as the improver UI (`prompt-dimensions` / `EnhancedScorer`).
   */
  public static scoreEnhanced(input: string, mode?: CapabilityMode): EnhancedScore {
    return EnhancedScorer.score(input, mode || CapabilityMode.STANDARD);
  }

  /**
   * Legacy `PromptScore` shape for telemetry and simple displays.
   * Delegates to `EnhancedScorer` (same 0–100 scale and dimensions as result scoring).
   */
  public static scorePrompt(input: string, mode?: CapabilityMode): PromptScore {
    const trimmed = input.trim();
    if (!trimmed) {
      return { score: 0, baseScore: 0, level: 'empty', label: 'חסר', tips: [], usageBoost: 0 };
    }

    const m = mode ?? CapabilityMode.STANDARD;
    const enhanced = EnhancedScorer.score(trimmed, m);
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    const usageBoost = wordCount > 40 ? 3 : wordCount > 20 ? 2 : wordCount > 10 ? 1 : 0;

    let tips = enhanced.topWeaknesses.slice(0, 3);
    if (tips.length === 0 && enhanced.breakdown.length > 0) {
      const weak = [...enhanced.breakdown]
        .filter((d) => d.score < d.maxScore / 2)
        .sort((a, b) => b.maxScore - b.score - (a.maxScore - a.score));
      tips = weak.slice(0, 3).map((d) => d.tip);
    }
    if (tips.length === 0 && enhanced.breakdown.length > 0) {
      tips = [...enhanced.breakdown]
        .sort((a, b) => b.maxScore - b.score - (a.maxScore - a.score))
        .slice(0, 3)
        .map((d) => d.tip);
    }

    let level: PromptScore['level'];
    if (enhanced.level === 'elite' || enhanced.level === 'high') {
      level = 'high';
    } else if (enhanced.level === 'medium') {
      level = 'medium';
    } else {
      level = 'low';
    }

    return {
      score: enhanced.total,
      baseScore: enhanced.total,
      level,
      label: enhanced.label,
      tips,
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
   * Short, Hebrew-first hints so the enhancer shapes the final prompt for where the user
   * will run it. Kept to 3 bullets + one alignment line to limit token noise vs [GENIUS_ANALYSIS].
   * Does not switch the provider — only steers structure.
   */
  protected static getModelAdaptationHints(targetModel?: TargetModel): string | null {
    const alignment = `עיקרון יישור: הרמזים למטה משלימים את כללי Peroot בלבד. אם נוצרת סתירה — עדיפות לדרישות [GENIUS_ANALYSIS], לפלט בעברית, ולמבנה שהמסלול כבר מחייב. אל תשכפל הנחיות מבנה שכבר מכוסות שם; הוסף רק מה שמותאם במיוחד למודל היעד.`;

    switch (targetModel) {
      case 'chatgpt':
        return `[TARGET_MODEL_OPTIMIZATION — יעד: ChatGPT/GPT]
${alignment}

- פתח בתפקיד מומחה מפורש (סגנון "You are…") והמשך ב-Markdown: כותרות ##, בולטים, **הדגשות**, בלוק קוד כשצריך.
- במשימות מורכבות הוסף שלב חשיבה קצר לפני ההנחיה הסופית (שרשרת צעדים פנימית — לא חובה להדפיס אותה בפלט של המשתמש).
- סמן הנחיות קריטיות במפורש (למשל שורת «חשוב:» או Important: לפני מגבלה).`;
      case 'claude':
        return `[TARGET_MODEL_OPTIMIZATION — יעד: Claude]
${alignment}

- עטוף את ליבת המשימה בתגיות XML עם שמות באנגלית ותוכן בעברית: <task>, <context>, <constraints>, <output_format> (ניתן להוסיף <thinking> לניתוח פנימי אם זה משפר את הפרומפט).
- העדף הקשר מפורט ורקע ארוך על פני רשימת הוראות דקה; הפרד ויזואלית בין סקשנים.
- הדגש מגבלות עם «חשוב:» או «קריטי:» לפני סעיפים שאסור לפספס.`;
      case 'gemini':
        return `[TARGET_MODEL_OPTIMIZATION — יעד: Gemini]
${alignment}

- השתמש בכותרות ## ברורות לכל חלק; לצעדי ביצוע העדף רשימה ממוספרת על פני בולטים חופשיים.
- הגדר מגבלות מפורשות (אורך, פורמט, מה לא לכלול) — בלי דו-משמעות.
- סיים בקטע קצר «דרישות פלט:» שמסכם בבולטים מה המודל ביעד חייב להחזיר.`;
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
       // New unified Context Engine injection.
       // input.context carries ContextBlock[] produced server-side by processAttachment.
       const rendered = renderInjection(input.context as unknown as ContextBlock[]);
       if (rendered) contextInjected += `\n\n${rendered}\n`;
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
          // New ContextBlock shape — pull from display.rawText
          const block = a as unknown as ContextBlock;
          if (block.display?.rawText || block.display?.summary) {
              const label = block.display.title || block.type;
              const text = block.display.rawText ?? block.display.summary ?? '';
              return `[${label}] ${text.slice(0, 1500)}`;
          }
          // Legacy shape
          if (a.type === 'image') return `[תמונה: ${a.name}]\n${(a.description || a.content || '').slice(0, 1500)}`;
          if (a.type === 'url') return `[URL: ${a.url || a.name}] ${(a.content || '').slice(0, 1000)}`;
          return `[${a.format?.toUpperCase() || 'קובץ'}: ${a.name}] ${(a.content || '').slice(0, 1500)}`;
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
