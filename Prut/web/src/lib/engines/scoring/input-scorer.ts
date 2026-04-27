/**
 * InputScorer — live, mode-aware prompt scoring before enhancement.
 *
 * Unlike `EnhancedScorer` (which grades a post-enhancement LLM output with 15
 * fixed text dimensions), InputScorer computes a *mode-specific* 0–100 score
 * for the raw user input with three goals:
 *
 *   1. Actionable: `missingTop` surfaces the 2-3 highest-leverage gaps, with
 *      a concrete Hebrew example showing what to add.
 *   2. Mode-aware: profiles for STANDARD / DEEP_RESEARCH / AGENT_BUILDER /
 *      IMAGE_GENERATION / VIDEO_GENERATION rebalance weights so a strong
 *      research prompt isn't penalized for lacking "channel" or "examples".
 *   3. Anti-gaming: buzzwords-without-specs, free-floating numbers, and
 *      internal contradictions are penalized rather than rewarded.
 *
 * Used by `HomeClient` / `PromptInput` for the Live Input Score pill.
 * Dimension scores align with `prompt-dimensions` / `EnhancedScorer` where keys match.
 */
import { CapabilityMode } from "@/lib/capability-mode";
import {
  parse,
  type Parsed,
  hasContradictions,
  countBuzzwords,
  hasMeasurableQuantity,
  hasExampleBlock,
  hasRoleStatement,
  hasRoleMention,
  hasTaskVerb,
  hasTaskVerbWithObject,
  hasOutputFormat,
  hasLengthSpec,
  hasNegativeConstraints,
  hasLooseNumber,
  hasSpecificityProperNouns,
  hasStructure,
  hasHedges,
  hasBuzzwords,
  hasSourcesRequirement,
  hasMethodology,
  hasConfidenceProtocol,
  hasFalsifiability,
  hasInfoGaps,
  hasMECE,
  hasToolsSpec,
  hasBoundaries,
  hasInputsOutputs,
  hasPolicies,
  hasFailureModes,
  hasImageSubject,
  hasImageStyle,
  hasImageComposition,
  hasAspectRatio,
  hasImageLighting,
  hasImageColor,
  hasImageQuality,
  hasImageNegative,
  hasVideoMotion,
} from "./prompt-parse";
import {
  scoreEnhancedTextDimensions,
  scoreEnhancedVisualDimensions,
  scoreEnhancedResearchDimensions,
  scoreEnhancedAgentDimensions,
  detectPromptDomain,
  type DimensionScoreChunk,
  type PromptDomain,
} from "./prompt-dimensions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InputScoreLevel = "empty" | "low" | "medium" | "high" | "elite";

export interface InputScoreDimension {
  key: string;
  label: string; // Hebrew
  score: number;
  max: number;
  matched: string[];
  missing: string[];
  tip: string;
}

export interface InputScoreMissing {
  key: string;
  title: string;
  why: string;
  example?: string;
  /** Ready-to-insert template text (no meta-instructions). Used by QuickImprovementChips. */
  insertText?: string;
}

export interface InputScore {
  total: number; // 0-100
  level: InputScoreLevel;
  label: string;
  strengths: string[];
  missingTop: InputScoreMissing[];
  breakdown: InputScoreDimension[];
  mode: CapabilityMode;
  domain: PromptDomain;
}

function buildSharedChunkMap(mode: CapabilityMode, p: Parsed): Map<string, DimensionScoreChunk> {
  const m = new Map<string, DimensionScoreChunk>();
  if (mode === CapabilityMode.IMAGE_GENERATION || mode === CapabilityMode.VIDEO_GENERATION) {
    scoreEnhancedVisualDimensions(
      p.text,
      p.wordCount,
      mode === CapabilityMode.VIDEO_GENERATION,
    ).forEach((c) => m.set(c.key, c));
  } else if (mode === CapabilityMode.DEEP_RESEARCH) {
    scoreEnhancedResearchDimensions(p.text, p.wordCount).forEach((c) => m.set(c.key, c));
  } else if (mode === CapabilityMode.AGENT_BUILDER) {
    scoreEnhancedAgentDimensions(p.text, p.wordCount).forEach((c) => m.set(c.key, c));
  } else {
    scoreEnhancedTextDimensions(p.text, p.wordCount).forEach((c) => m.set(c.key, c));
  }
  return m;
}

// ---------------------------------------------------------------------------
// Dimension definitions (one per key)
// ---------------------------------------------------------------------------

interface DimensionDef {
  key: string;
  label: string;
  tip: string;
  /** Test returns score normalized 0..1 + matched/missing labels. */
  test: (p: Parsed) => { ratio: number; matched: string[]; missing: string[] };
}

const DIMS: Record<string, DimensionDef> = {
  role: {
    key: "role",
    label: "תפקיד",
    tip: 'הגדר תפקיד/פרסונה בפתיחה: "אתה <תפקיד> עם <ניסיון/התמחות>"',
    test: (p) => {
      if (hasRoleStatement(p)) {
        const hasCreds = /\d+\s+(שנות|שנים|years)|מוסמך|בכיר|senior|expert|lead/i.test(p.text);
        return hasCreds
          ? { ratio: 1, matched: ["persona", "credentials"], missing: [] }
          : { ratio: 0.7, matched: ["persona"], missing: ["credentials (שנות ניסיון / התמחות)"] };
      }
      if (hasRoleMention(p)) {
        return { ratio: 0.3, matched: ["role mentioned"], missing: ['"אתה …" statement'] };
      }
      return { ratio: 0, matched: [], missing: ["role definition"] };
    },
  },

  task: {
    key: "task",
    label: "משימה",
    tip: 'פתח בפועל פעולה ברור ואובייקט: "כתוב <מה>", "נתח <מה>"',
    test: (p) => {
      if (!hasTaskVerb(p)) return { ratio: 0, matched: [], missing: ["action verb"] };
      if (hasTaskVerbWithObject(p)) {
        return { ratio: 1, matched: ["action verb", "specific object"], missing: [] };
      }
      return { ratio: 0.5, matched: ["action verb"], missing: ["specific object"] };
    },
  },

  context: {
    key: "context",
    label: "הקשר",
    tip: "הוסף קהל יעד, מטרה עסקית, ורקע קצר",
    test: (p) => {
      const matched: string[] = [];
      const missing: string[] = [];
      let pts = 0;
      if (
        p.sections.has("audience") ||
        /קהל\s?יעד|לקוחות|משתמשים|audience|target|persona|עבור/i.test(p.text)
      ) {
        matched.push("audience");
        pts += 0.4;
      } else missing.push("target audience");
      if (
        p.sections.has("goal") ||
        /מטרה|יעד|לצורך|בכדי|כדי\s+[לש]|כך\s+ש|שיוכל|מטרתי|goal|objective|so\s+that|in\s+order\s+to/i.test(
          p.text,
        )
      ) {
        matched.push("goal");
        pts += 0.3;
      } else missing.push("goal");
      if (
        p.sections.has("context") ||
        /רקע|הקשר|מצב|אנחנו|הצוות|בחברה|בפרוייקט|בתחום|אני\s+(?:עובד|מנהל|מפתח|כותב|עוסק)|context|background|situation/i.test(
          p.text,
        )
      ) {
        matched.push("background");
        pts += 0.3;
      } else missing.push("background");
      return { ratio: Math.min(1, pts), matched, missing };
    },
  },

  format: {
    key: "format",
    label: "פורמט פלט",
    tip: "ציין מבנה פלט (טבלה/רשימה/סעיפים) ואורך",
    test: (p) => {
      const matched: string[] = [];
      const missing: string[] = [];
      let pts = 0;
      if (hasOutputFormat(p)) {
        matched.push("format structure");
        pts += 0.6;
      } else missing.push("output format");
      if (hasLengthSpec(p)) {
        matched.push("length spec");
        pts += 0.4;
      } else missing.push("length spec");
      return { ratio: Math.min(1, pts), matched, missing };
    },
  },

  constraints: {
    key: "constraints",
    label: "מגבלות",
    tip: 'הוסף מגבלות שליליות: "אל ת…", "ללא…", "בלי…"',
    test: (p) => {
      if (hasNegativeConstraints(p)) {
        const hasTone = /טון|סגנון|tone|style|formal|casual|מקצועי|ידידותי|רשמי|לא\s*רשמי/i.test(
          p.text,
        );
        const hasLang = /שפה|language|בעברית|באנגלית|in\s+(?:hebrew|english)/i.test(p.text);
        if (hasTone && hasLang)
          return { ratio: 1, matched: ["negative constraints", "tone", "language"], missing: [] };
        if (hasTone || hasLang)
          return {
            ratio: 0.75,
            matched: ["negative constraints", hasTone ? "tone" : "language"],
            missing: [hasTone ? "language" : "tone"],
          };
        return {
          ratio: 0.4,
          matched: ["negative constraints"],
          missing: ["tone spec", "language spec"],
        };
      }
      const hasToneOnly = /טון|סגנון|tone|style|formal|casual|מקצועי|ידידותי/i.test(p.text);
      if (hasToneOnly)
        return { ratio: 0.25, matched: ["tone mentioned"], missing: ["explicit do/don't rules"] };
      return { ratio: 0, matched: [], missing: ["do/don't rules"] };
    },
  },

  specificity: {
    key: "specificity",
    label: "ספציפיות",
    tip: "הוסף מספרים קשורים למשימה ושמות קונקרטיים",
    test: (p) => {
      const matched: string[] = [];
      const missing: string[] = [];
      let pts = 0;
      if (hasMeasurableQuantity(p)) {
        matched.push("task-relevant numbers");
        pts += 0.5;
      } else if (hasLooseNumber(p)) {
        matched.push("loose numbers");
        pts += 0.15;
        missing.push("numbers tied to task quantity");
      } else missing.push("concrete numbers");
      if (hasSpecificityProperNouns(p)) {
        matched.push("proper nouns / brands");
        pts += 0.3;
      } else missing.push("proper nouns / brands");
      if (hasExampleBlock(p)) {
        matched.push("example block");
        pts += 0.2;
      } else missing.push("inline example");
      return { ratio: Math.min(1, pts), matched, missing };
    },
  },

  structure: {
    key: "structure",
    label: "מבנה",
    tip: "פרק את הפרומפט לסעיפים או שורות נפרדות",
    test: (p) => {
      if (hasStructure(p)) return { ratio: 1, matched: ["multi-line structure"], missing: [] };
      if (p.lines.length >= 2)
        return { ratio: 0.5, matched: ["some line breaks"], missing: ["bullets / headings"] };
      return { ratio: 0, matched: [], missing: ["structure"] };
    },
  },

  clarity: {
    key: "clarity",
    label: "בהירות",
    tip: "הסר hedges ומילות באזז — היה ישיר ומדיד",
    test: (p) => {
      let pts = 1;
      const matched: string[] = ["clear language"];
      const missing: string[] = [];
      if (hasHedges(p)) {
        pts -= 0.4;
        matched.pop();
        missing.push("hedges (אולי/maybe)");
      }
      if (hasBuzzwords(p) && !hasMeasurableQuantity(p)) {
        const buzzCount = countBuzzwords(p);
        // Graduated penalty: more buzzwords = more deduction
        pts -= buzzCount >= 4 ? 0.7 : buzzCount >= 2 ? 0.4 : 0.2;
        missing.push(`buzzwords without specs (×${buzzCount})`);
      }
      return { ratio: Math.max(0, pts), matched, missing };
    },
  },

  examples: {
    key: "examples",
    label: "דוגמאות",
    tip: 'הוסף בלוק דוגמה מופרד: "דוגמה: ..."',
    test: (p) => {
      if (hasExampleBlock(p)) return { ratio: 1, matched: ["example block"], missing: [] };
      const hasMention =
        /דוגמה|לדוגמה|לצורך\s+הדגמה|example|sample|template|תבנית|כמו\s+ל|כמו\s+זה|למשל/i.test(
          p.text,
        );
      if (hasMention)
        return { ratio: 0.4, matched: ["example mentioned"], missing: ["full example block"] };
      return { ratio: 0, matched: [], missing: ["concrete example"] };
    },
  },

  measurability: {
    key: "measurability",
    label: "מדידות",
    tip: "הוסף קריטריון הצלחה מספרי (X מילים, Y פריטים, טווח Z)",
    test: (p) => {
      if (!hasMeasurableQuantity(p)) {
        return { ratio: 0, matched: [], missing: ["success metric"] };
      }
      const hasMin = /לפחות|מינימום|at\s+least|minimum/i.test(p.text);
      const hasMax = /מקסימום|לכל\s+היותר|up\s+to|at\s+most|עד\s+\d+/i.test(p.text);
      const hasRange =
        /בין\s+\d+\s+ל|between\s+\d+\s+and|\d+[-–]\d+\s*(מילים|words|items|פריטים)/i.test(p.text);
      if (hasRange || (hasMin && hasMax))
        return { ratio: 1, matched: ["measurable range"], missing: [] };
      if (hasMin || hasMax)
        return {
          ratio: 0.7,
          matched: ["one-sided limit"],
          missing: ["add matching min/max for full range"],
        };
      return { ratio: 0.5, matched: ["measurable quantity"], missing: ["explicit min/max range"] };
    },
  },

  enforceability: {
    key: "enforceability",
    label: "אכיפות",
    tip: 'העדף מגבלות שאפשר לאכוף ("bullet points", "עד 5 סעיפים") על פני בלתי אפשריות ("בדיוק 500 מילים")',
    test: (p) => {
      const matched: string[] = [];
      const missing: string[] = [];

      // Enforceable patterns — things LLMs can reliably follow
      const enforceable = [
        {
          re: /(?:bullet|רשימה|סעיפים|numbered|ממוספר|טבלה|table|json|csv|markdown)/i,
          label: "format control",
        },
        {
          re: /(?:עד|מקסימום|לכל\s+היותר|max(?:imum)?|up\s+to|at\s+most|no\s+more\s+than)\s+\d+/i,
          label: "max limit",
        },
        { re: /(?:לפחות|מינימום|minimum|at\s+least)\s+\d+/i, label: "min limit" },
        {
          re: /(?:בעברית|באנגלית|in\s+(?:hebrew|english|spanish|french|arabic))/i,
          label: "language control",
        },
        {
          re: /(?:אל\s+ת|ללא|בלי|don['']?t|do\s+not|avoid|never|without)\s+\S+/i,
          label: "negative constraint",
        },
      ];

      // Hard-to-enforce patterns — things LLMs struggle with
      const hardToEnforce = [
        { re: /בדיוק\s+\d+\s+(?:מילים|words|תווים|characters)/i, label: "exact word count" },
        {
          re: /(?:100%|מלאה|full|complete|total)\s*(?:דיוק|accuracy|precision)/i,
          label: "perfect accuracy",
        },
        {
          re: /(?:אל\s+תמציא|never\s+hallucinate|don['']?t\s+make\s+up|no\s+hallucination)/i,
          label: "no hallucination",
        },
        {
          re: /(?:בדיוק|exactly)\s+\d+\s+(?:משפטים|sentences|פסקאות|paragraphs)/i,
          label: "exact count",
        },
      ];

      let enforceableCount = 0;
      let hardCount = 0;

      for (const { re, label } of enforceable) {
        if (re.test(p.text)) {
          enforceableCount++;
          matched.push(label);
        }
      }

      for (const { re, label } of hardToEnforce) {
        if (re.test(p.text)) {
          hardCount++;
          missing.push(`hard to enforce: ${label}`);
        }
      }

      if (enforceableCount === 0 && hardCount === 0) {
        return { ratio: 0, matched: [], missing: ["enforceable constraints"] };
      }

      // Score: enforceable constraints are good, hard-to-enforce deduct
      const base = Math.min(1, enforceableCount * 0.3);
      const penalty = hardCount * 0.25;
      return { ratio: Math.max(0, Math.min(1, base - penalty)), matched, missing };
    },
  },

  // ---- Research-mode dims ----
  research_sources: {
    key: "research_sources",
    label: "מקורות",
    tip: "דרוש מקורות ראשוניים, ציטוט URL, ופסילת מקורות לא-מאומתים",
    test: (p) => {
      const matched: string[] = [];
      const missing: string[] = [];
      let pts = 0;
      if (hasSourcesRequirement(p)) {
        matched.push("sources required");
        pts += 0.6;
      } else missing.push("sources requirement");
      if (
        /url|http|אתר|official|ראשוני|אקדמי|peer[-\s]?reviewed|primary\s+source|journal|doi|arxiv|published\s+(?:paper|study)/i.test(
          p.text,
        )
      ) {
        matched.push("URL / primary sources");
        pts += 0.4;
      } else missing.push("URL / primary sources");
      return { ratio: Math.min(1, pts), matched, missing };
    },
  },

  research_method: {
    key: "research_method",
    label: "מתודולוגיה",
    tip: "הגדר שלבי מחקר ומסגרת (MECE / שאלות מובילות)",
    test: (p) => {
      const matched: string[] = [];
      const missing: string[] = [];
      let pts = 0;
      if (hasMethodology(p)) {
        matched.push("method");
        pts += 0.6;
      } else missing.push("method / steps");
      if (hasMECE(p)) {
        matched.push("MECE");
        pts += 0.4;
      } else missing.push("MECE / taxonomy");
      return { ratio: Math.min(1, pts), matched, missing };
    },
  },

  confidence: {
    key: "confidence",
    label: "רמת ביטחון",
    tip: "בקש דירוג ביטחון לכל טענה (low/medium/high)",
    test: (p) =>
      hasConfidenceProtocol(p)
        ? { ratio: 1, matched: ["confidence scale"], missing: [] }
        : { ratio: 0, matched: [], missing: ["confidence scale"] },
  },

  falsifiability: {
    key: "falsifiability",
    label: "הפרכה",
    tip: 'דרוש ציון "מה היה מפריך את הטענה"',
    test: (p) =>
      hasFalsifiability(p)
        ? { ratio: 1, matched: ["falsifiability asked"], missing: [] }
        : { ratio: 0, matched: [], missing: ["falsifiability"] },
  },

  info_gaps: {
    key: "info_gaps",
    label: "פערי מידע",
    tip: 'בקש סעיף "פערי מידע" / unknowns שידגיש מה לא ניתן לאמת',
    test: (p) =>
      hasInfoGaps(p)
        ? { ratio: 1, matched: ["info gaps flagged"], missing: [] }
        : { ratio: 0, matched: [], missing: ["info gaps section"] },
  },

  // ---- Agent-builder dims ----
  tools: {
    key: "tools",
    label: "כלים",
    tip: "פרט אילו כלים/APIs הסוכן רשאי לקרוא",
    test: (p) =>
      hasToolsSpec(p)
        ? { ratio: 1, matched: ["tools listed"], missing: [] }
        : { ratio: 0, matched: [], missing: ["tools list"] },
  },

  boundaries: {
    key: "boundaries",
    label: "גבולות",
    tip: "הגדר מה אסור לסוכן לעשות ומתי להעביר לאנושי",
    test: (p) =>
      hasBoundaries(p)
        ? { ratio: 1, matched: ["boundaries / escalation"], missing: [] }
        : { ratio: 0, matched: [], missing: ["boundaries / escalation"] },
  },

  inputs_outputs: {
    key: "inputs_outputs",
    label: "קלט/פלט",
    tip: "הגדר schema מדויק לקלט ולפלט",
    test: (p) =>
      hasInputsOutputs(p)
        ? { ratio: 1, matched: ["i/o schema"], missing: [] }
        : { ratio: 0, matched: [], missing: ["input/output schema"] },
  },

  policies: {
    key: "policies",
    label: "מדיניות",
    tip: "הוסף כללים/guardrails ברורים",
    test: (p) =>
      hasPolicies(p)
        ? { ratio: 1, matched: ["policies"], missing: [] }
        : { ratio: 0, matched: [], missing: ["policies / guardrails"] },
  },

  failure_modes: {
    key: "failure_modes",
    label: "מצבי כשל",
    tip: "תאר כיצד הסוכן מגיב לשגיאות ומקרי קצה",
    test: (p) =>
      hasFailureModes(p)
        ? { ratio: 1, matched: ["failure modes"], missing: [] }
        : { ratio: 0, matched: [], missing: ["error handling / edge cases"] },
  },

  // ---- Visual dims ----
  subject: {
    key: "subject",
    label: "נושא",
    tip: "תאר בבהירות מה נמצא בתמונה (מי/מה/איפה)",
    test: (p) => {
      if (!hasImageSubject(p)) return { ratio: 0, matched: [], missing: ["subject"] };
      const hasAttribute =
        /wearing|dressed|hair|eyes|expression|pose|color|לובש|שיער|עיניים|ביטוי|תנוחה|בגד|גובה|גיל|young|old|tall|small|גדול|קטן|צעיר|מבוגר/i.test(
          p.text,
        );
      if (hasAttribute && p.wordCount >= 8)
        return { ratio: 1, matched: ["subject described", "attributes"], missing: [] };
      if (p.wordCount >= 8)
        return {
          ratio: 0.75,
          matched: ["subject described"],
          missing: ["subject attributes (appearance/pose)"],
        };
      return { ratio: 0.4, matched: ["subject mentioned"], missing: ["more subject detail"] };
    },
  },
  style: {
    key: "style",
    label: "סגנון",
    tip: "ציין מדיום/סגנון (צילום, איור, אנימציה, cinematic ...)",
    test: (p) => {
      if (!hasImageStyle(p)) return { ratio: 0, matched: [], missing: ["style / medium"] };
      const hasAesthetic =
        /style\s+of|בסגנון|aesthetic|art\s+deco|cyberpunk|minimalist|vintage|retro|modern|cinematic|אסתטיקה|ויינטג|רטרו|מינימליסטי|פנטזיה|עתידני|קלאסי/i.test(
          p.text,
        );
      if (hasAesthetic) return { ratio: 1, matched: ["medium", "aesthetic"], missing: [] };
      return { ratio: 0.5, matched: ["medium"], missing: ["aesthetic reference (בסגנון X)"] };
    },
  },
  composition: {
    key: "composition",
    label: "קומפוזיציה",
    tip: "ציין מסגור/זווית מצלמה (close-up, wide shot, זווית נמוכה ...)",
    test: (p) =>
      hasImageComposition(p)
        ? { ratio: 1, matched: ["composition"], missing: [] }
        : { ratio: 0, matched: [], missing: ["composition / framing"] },
  },
  aspect_ratio: {
    key: "aspect_ratio",
    label: "יחס גובה-רוחב",
    tip: "ציין יחס גובה-רוחב (16:9 / 1:1 / 9:16)",
    test: (p) =>
      hasAspectRatio(p)
        ? { ratio: 1, matched: ["aspect ratio"], missing: [] }
        : { ratio: 0, matched: [], missing: ["aspect ratio"] },
  },
  lighting: {
    key: "lighting",
    label: "תאורה",
    tip: "תאר תאורה (golden hour, soft light, rim, Rembrandt ...)",
    test: (p) => {
      if (!hasImageLighting(p)) return { ratio: 0, matched: [], missing: ["lighting"] };
      const hasQuality =
        /soft|hard|dramatic|warm|cool|diffused|shadow|contrast|high\s+key|low\s+key|רך|חם|קר|דרמטי|עדין|ניגוד|צל|עמעום|מפוזר/i.test(
          p.text,
        );
      if (hasQuality) return { ratio: 1, matched: ["lighting type", "quality"], missing: [] };
      return {
        ratio: 0.5,
        matched: ["lighting type"],
        missing: ["lighting quality (soft/dramatic/warm...)"],
      };
    },
  },
  color: {
    key: "color",
    label: "צבע",
    tip: "פרט פלטת צבעים / מצב-רוח צבעוני",
    test: (p) => {
      if (!hasImageColor(p)) return { ratio: 0, matched: [], missing: ["color palette"] };
      const hasMood =
        /mood|atmosphere|vibe|cinematic|monochrome|pastel|אווירה|מצב\s*רוח|קולנועי|מונוכרום|פסטל|גווני|טון\s*חם|טון\s*קר/i.test(
          p.text,
        );
      if (hasMood) return { ratio: 1, matched: ["colors", "mood"], missing: [] };
      return { ratio: 0.5, matched: ["colors specified"], missing: ["color mood / atmosphere"] };
    },
  },
  quality: {
    key: "quality",
    label: "איכות טכנית",
    tip: 'הוסף "4k / ultra detailed / photorealistic" וכו\'',
    test: (p) =>
      hasImageQuality(p)
        ? { ratio: 1, matched: ["quality"], missing: [] }
        : { ratio: 0, matched: [], missing: ["technical quality"] },
  },
  negative: {
    key: "negative",
    label: "מה לא לכלול",
    tip: "ציין מה לא רוצים (negative prompt)",
    test: (p) =>
      hasImageNegative(p)
        ? { ratio: 1, matched: ["negative prompt"], missing: [] }
        : { ratio: 0, matched: [], missing: ["negative prompt"] },
  },
  motion: {
    key: "motion",
    label: "תנועה",
    tip: "תאר תנועת מצלמה ותנועת נושא (pan, dolly, slow motion ...)",
    test: (p) =>
      hasVideoMotion(p)
        ? { ratio: 1, matched: ["motion"], missing: [] }
        : { ratio: 0, matched: [], missing: ["motion / camera movement"] },
  },
};

// ---------------------------------------------------------------------------
// Mode profiles (weights sum to 100)
// ---------------------------------------------------------------------------

type Profile = Array<{ key: string; weight: number }>;

const PROFILES: Record<CapabilityMode, Profile> = {
  [CapabilityMode.STANDARD]: [
    { key: "role", weight: 14 },
    { key: "task", weight: 14 },
    { key: "context", weight: 12 },
    { key: "format", weight: 11 },
    { key: "constraints", weight: 8 },
    { key: "specificity", weight: 10 },
    { key: "structure", weight: 8 },
    { key: "clarity", weight: 7 },
    { key: "enforceability", weight: 6 },
    { key: "examples", weight: 6 },
    { key: "measurability", weight: 4 },
  ],
  [CapabilityMode.DEEP_RESEARCH]: [
    { key: "task", weight: 12 },
    { key: "research_sources", weight: 16 },
    { key: "research_method", weight: 14 },
    { key: "confidence", weight: 10 },
    { key: "falsifiability", weight: 8 },
    { key: "format", weight: 10 },
    { key: "info_gaps", weight: 6 },
    { key: "specificity", weight: 8 },
    { key: "clarity", weight: 6 },
    { key: "role", weight: 10 },
  ],
  [CapabilityMode.AGENT_BUILDER]: [
    { key: "role", weight: 10 },
    { key: "task", weight: 10 },
    { key: "tools", weight: 12 },
    { key: "boundaries", weight: 10 },
    { key: "inputs_outputs", weight: 12 },
    { key: "policies", weight: 10 },
    { key: "failure_modes", weight: 8 },
    { key: "enforceability", weight: 8 },
    { key: "format", weight: 10 },
    { key: "context", weight: 6 },
    { key: "clarity", weight: 4 },
  ],
  [CapabilityMode.IMAGE_GENERATION]: [
    { key: "subject", weight: 18 },
    { key: "style", weight: 15 },
    { key: "composition", weight: 14 },
    { key: "lighting", weight: 14 },
    { key: "color", weight: 10 },
    { key: "quality", weight: 10 },
    { key: "negative", weight: 10 },
    { key: "aspect_ratio", weight: 9 },
  ],
  [CapabilityMode.VIDEO_GENERATION]: [
    { key: "subject", weight: 14 },
    { key: "motion", weight: 15 },
    { key: "style", weight: 12 },
    { key: "composition", weight: 12 },
    { key: "lighting", weight: 12 },
    { key: "color", weight: 9 },
    { key: "quality", weight: 9 },
    { key: "negative", weight: 8 },
    { key: "aspect_ratio", weight: 9 },
  ],
};

// ---------------------------------------------------------------------------
// Mode-specific examples for missingTop
// ---------------------------------------------------------------------------

const MODE_EXAMPLES: Partial<Record<CapabilityMode, Record<string, string>>> = {
  [CapabilityMode.STANDARD]: {
    role: 'פתח ב‑"אתה <תפקיד> עם X שנות ניסיון"',
    task: 'פתח ב‑"כתוב/צור <מה בדיוק>"',
    context: 'הוסף: "קהל יעד: …, מטרה: …, רקע: …"',
    format: 'הוסף: "הצג כרשימה ממוספרת, עד 200 מילים"',
    constraints: 'הוסף: "אל תשתמש ב‑buzzwords, ללא טרמינולוגיה טכנית"',
    specificity: 'הוסף מספרים מדידים: "3 דוגמאות", "עד 250 מילים"',
    examples: 'הוסף: "דוגמה: פתיח שעובד — …"',
    measurability: 'הוסף קריטריון: "בדיוק 5 נקודות בין 30‑50 מילים כל אחת"',
    enforceability: 'החלף "בדיוק 500 מילים" ב‑"עד 500 מילים" — מגבלה שהמודל יכול לכבד',
  },
  [CapabilityMode.DEEP_RESEARCH]: {
    research_sources: 'ציין: "השתמש רק במקורות ראשוניים מ‑2023 ואילך, צטט URL מלא לכל טענה"',
    research_method: 'הוסף: "שלבי מחקר: 1) מיפוי MECE 2) איסוף 3) הצלבה 4) סינתזה"',
    confidence: 'הוסף: "דרג כל טענה: high/medium/low confidence, עם הסבר"',
    falsifiability: 'הוסף: "לכל טענה: מה היה מפריך אותה?"',
    info_gaps: 'הוסף סעיף: "פערי מידע שלא הצלחת לאמת"',
    format: 'הוסף: "פלט כטבלה: טענה | ראיה | מקור | confidence"',
    role: 'פתח ב‑"אתה אנליסט מחקרי בכיר ב‑<תחום>"',
  },
  [CapabilityMode.AGENT_BUILDER]: {
    role: 'פתח ב‑"אתה סוכן <מה> שמשרת <קהל>"',
    tools: 'ציין: "כלים זמינים: search_web, read_file, call_api(…)"',
    boundaries: 'הוסף: "אל תענה מחוץ ל‑<תחום>; העבר לאנושי כש‑<תנאי>"',
    inputs_outputs: 'הוסף schema: "Input: {userId, query}; Output: JSON {…}"',
    policies: 'הוסף: "לעולם אל תחשוף נתונים אישיים; אל תבצע פעולות כספיות"',
    failure_modes: 'הוסף: "אם כלי נכשל — נסה פעמיים ואז החזר שגיאה מסבירה"',
    enforceability: 'הוסף מגבלות אכיפות: "אל תחזיר יותר מ‑3 תוצאות", "JSON בלבד"',
  },
  [CapabilityMode.IMAGE_GENERATION]: {
    subject: 'תאר את הנושא המרכזי: "אישה צעירה יושבת ליד חלון קפה"',
    style: 'הוסף סגנון: "צילום קולנועי 35mm" / "איור דיגיטלי מינימליסטי"',
    composition: 'הוסף: "close‑up, rule of thirds, זווית עין-ציפור"',
    aspect_ratio: 'ציין יחס: "1:1" לאינסטגרם או "16:9" לבאנר',
    lighting: 'הוסף: "golden hour, soft rim light, ambient fill"',
    color: 'הוסף פלטה: "גוונים חמים של זהב וענבר, מעט כחול ניגודי"',
    quality: 'הוסף: "8k, ultra detailed, photorealistic, sharp focus"',
    negative: 'ציין: "ללא טקסט, ללא watermark, ללא גפיים מעוותות"',
  },
  [CapabilityMode.VIDEO_GENERATION]: {
    subject: 'תאר את הסצנה: "דרון מעל חוף בשקיעה"',
    motion: 'הוסף: "slow dolly zoom, מצלמה נעה שמאלה, subject running"',
    style: 'הוסף: "קולנועי 24fps, filmic grain"',
    composition: 'הוסף: "wide establishing shot, low angle"',
    lighting: 'הוסף: "golden hour, lens flare חם"',
    aspect_ratio: 'ציין: "16:9" לסינמטוגרפיה / "9:16" לרילס',
  },
};

// Ready-to-insert template snippets (no meta-instructions).
// Used by QuickImprovementChips to append actual prompt text.
const MODE_INSERTS: Partial<Record<CapabilityMode, Record<string, string>>> = {
  [CapabilityMode.STANDARD]: {
    role: "\nתפקיד: ",
    task: "\nמשימה: ",
    context: "\nקהל יעד: ",
    format: "\nפורמט: רשימה ממוספרת, עד 200 מילים",
    constraints: "\nמגבלות: אל תשתמש ב‑",
    specificity: "\nדרישות: 3 דוגמאות, עד 250 מילים",
    examples: "\nדוגמה: ",
    measurability: "\nקריטריון הצלחה: ",
    enforceability: "\nמגבלה: עד ",
  },
  [CapabilityMode.AGENT_BUILDER]: {
    role: "\nתפקיד: אתה סוכן ",
    tools: "\nכלים זמינים: ",
    boundaries: "\nגבולות: אל תענה מחוץ ל‑",
    inputs_outputs: "\nInput: { }; Output: JSON { }",
    policies: "\nמדיניות: ",
    failure_modes: "\nטיפול בשגיאות: אם כלי נכשל — ",
    enforceability: "\nמגבלה: JSON בלבד, עד 3 תוצאות",
  },
  [CapabilityMode.IMAGE_GENERATION]: {
    subject: "\nנושא: ",
    style: "\nסגנון: ",
    composition: "\nקומפוזיציה: ",
    lighting: "\nתאורה: ",
    negative: "\nללא: טקסט, watermark",
  },
};

// "Why" blurbs (why this dimension matters)
const MODE_WHYS: Record<string, string> = {
  role: "בלי תפקיד ברור המודל משתמש בטון ברירת‑מחדל חיוור",
  task: "בלי פועל פעולה המודל מנחש מה לעשות",
  context: "בלי קהל יעד התוצאה גנרית ולא ממוקדת",
  format: "בלי פורמט הפלט יוצא בלתי צפוי",
  constraints: "בלי מגבלות שליליות המודל מוסיף דברים לא רצויים",
  specificity: "מספרים ודוגמאות מקבעים את התוצאה",
  structure: "פרומפט שטוח קשה לפרש; סעיפים מחדדים",
  clarity: "hedges ו‑buzzwords מהללים את המודל לטון מתחמק",
  examples: "דוגמה אחת שווה 100 הוראות",
  measurability: "בלי מדד הצלחה אי אפשר להעריך תוצאה",
  research_sources: "בלי דרישת מקורות המודל ממציא",
  research_method: "בלי שלבים המחקר שטוח",
  confidence: "בלי דירוג ביטחון אי אפשר לסנן טענות שבירות",
  falsifiability: "בלי קריטריון הפרכה כל טענה נראית חזקה",
  info_gaps: "בלי דיווח פערים המודל מסתיר את אי‑הוודאות",
  tools: "בלי רשימת כלים הסוכן לא יכול לפעול",
  boundaries: "בלי גבולות הסוכן חורג מסמכותו",
  inputs_outputs: "בלי schema השילוב תוכנתית שביר",
  policies: "בלי מדיניות הסוכן ייחשף לסיכון",
  failure_modes: "בלי טיפול בשגיאות הסוכן קורס בשקט",
  enforceability:
    'מגבלות לא-אכיפות ("בדיוק 500 מילים") גורמות לאכזבה; העדף מגבלות שהמודל יכול לכבד',
  subject: "בלי נושא ברור המודל מייצר בליל ויזואלי",
  style: "בלי סגנון הפלט נראה גנרי",
  composition: "בלי מסגור הקומפוזיציה מקרית",
  aspect_ratio: "בלי יחס גובה-רוחב הפלט לא מתאים לפלטפורמה",
  lighting: "תאורה היא 50% מהפלט הסופי בתמונה",
  color: "בלי פלטה הצבעים יוצאים עמומים",
  quality: "בלי דגל איכות הפלט יצא בריזולוציה נמוכה",
  negative: "negative prompt חוסם ארטיפקטים נפוצים",
  motion: "בלי תיאור תנועה הסרטון סטטי",
};

const DIM_TITLES: Record<string, string> = {
  role: "חסר תפקיד",
  task: "חסר פועל משימה",
  context: "חסר הקשר",
  format: "חסר פורמט פלט",
  constraints: "חסרות מגבלות",
  specificity: "חסרה ספציפיות",
  structure: "חסר מבנה",
  clarity: "חסרה בהירות",
  examples: "חסרה דוגמה",
  measurability: "חסר מדד הצלחה",
  research_sources: "חסרה דרישת מקורות",
  research_method: "חסרה מתודולוגיה",
  confidence: "חסר דירוג ביטחון",
  falsifiability: "חסר קריטריון הפרכה",
  info_gaps: "חסר סעיף פערי מידע",
  tools: "חסרה רשימת כלים",
  boundaries: "חסרים גבולות",
  inputs_outputs: "חסר schema קלט/פלט",
  policies: "חסרה מדיניות",
  failure_modes: "חסר טיפול בשגיאות",
  enforceability: "מגבלות לא אכיפות",
  subject: "חסר נושא מרכזי",
  style: "חסר סגנון",
  composition: "חסרה קומפוזיציה",
  aspect_ratio: "חסר יחס גובה-רוחב",
  lighting: "חסרה תאורה",
  color: "חסרה פלטת צבעים",
  quality: "חסר דגל איכות",
  negative: "חסר negative prompt",
  motion: "חסרה תנועה",
};

// ---------------------------------------------------------------------------
// Level thresholds
// ---------------------------------------------------------------------------

function levelOf(total: number, wordCount: number): { level: InputScoreLevel; label: string } {
  if (wordCount === 0) return { level: "empty", label: "חסר" };
  if (total < 40) return { level: "low", label: "חלש" };
  if (total < 65) return { level: "medium", label: "בינוני" };
  if (total < 85) return { level: "high", label: "חזק" };
  return { level: "elite", label: "מצוין" };
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export function scoreInput(text: string, mode: CapabilityMode): InputScore {
  const p = parse(text);
  const profile = PROFILES[mode] ?? PROFILES[CapabilityMode.STANDARD];

  if (p.wordCount === 0) {
    // Empty prompt — still produce a missingTop showing the highest-weight dims
    const emptyBreakdown: InputScoreDimension[] = profile.map(({ key, weight }) => {
      const dim = DIMS[key];
      return {
        key,
        label: dim?.label ?? key,
        score: 0,
        max: weight,
        matched: [],
        missing: [dim?.key ?? key],
        tip: dim?.tip ?? "",
      };
    });
    const topKeys = [...profile].sort((a, b) => b.weight - a.weight).slice(0, 3);
    return {
      total: 0,
      level: "empty",
      label: "חסר",
      strengths: [],
      missingTop: topKeys.map(({ key }) => ({
        key,
        title: DIM_TITLES[key] ?? key,
        why: MODE_WHYS[key] ?? "",
        example: MODE_EXAMPLES[mode]?.[key],
      })),
      breakdown: emptyBreakdown,
      mode,
      domain: "general",
    };
  }

  // Score every dimension — prefer shared chunks (aligned with EnhancedScorer) when key exists
  const breakdown: InputScoreDimension[] = [];
  let totalRaw = 0;
  const strengths: string[] = [];
  const chunkMap = buildSharedChunkMap(mode, p);

  for (const { key, weight } of profile) {
    const dim = DIMS[key];
    if (!dim) continue;
    const shared = chunkMap.get(key);
    let result: { ratio: number; matched: string[]; missing: string[] };
    if (shared && shared.maxPoints > 0) {
      result = {
        ratio: shared.score / shared.maxPoints,
        matched: shared.matched,
        missing: shared.missing,
      };
    } else {
      result = dim.test(p);
    }
    const score = Math.round(result.ratio * weight * 10) / 10;
    totalRaw += score;
    breakdown.push({
      key,
      label: dim.label,
      score,
      max: weight,
      matched: result.matched,
      missing: result.missing,
      tip: dim.tip,
    });
    if (result.ratio >= 0.85) {
      strengths.push(dim.label);
    }
  }

  // Anti-gaming: contradictions penalty
  if (hasContradictions(p)) {
    totalRaw = Math.max(0, totalRaw - 5);
  }

  // Anti-gaming: buzzword inflation penalty — heavy buzzword use with no
  // concrete specs/examples gets a global deduction beyond the per-dimension hit
  const buzzCount = countBuzzwords(p);
  if (buzzCount >= 3 && !hasMeasurableQuantity(p) && !hasExampleBlock(p)) {
    const densityPenalty = Math.min(8, buzzCount * 1.5);
    totalRaw = Math.max(0, totalRaw - densityPenalty);
  }

  // Cross-dimension specificity bonus: numbers, quoted text, and proper nouns
  // signal concrete detail beyond what individual dimension scores capture (+0..+5)
  let specificityBonus = 0;
  if (/\d+/.test(text)) specificityBonus += 1;
  if (/[""״«»][^""״«»]{3,}[""״«»]/.test(text)) specificityBonus += 2;
  if (hasSpecificityProperNouns(p)) specificityBonus += 2;
  if (specificityBonus > 0) {
    totalRaw = Math.min(100, totalRaw + Math.min(5, specificityBonus));
  }

  // Cap at 100
  let total = Math.round(Math.max(0, Math.min(100, totalRaw)));

  // Very short prompts can't exceed medium
  if (p.wordCount < 5) total = Math.min(total, 30);
  else if (p.wordCount < 10) total = Math.min(total, 55);

  // Build missingTop: rank dims by (unearned weight) desc, take top 3
  const missingRanked = [...breakdown]
    .filter((d) => d.score < d.max * 0.7)
    .sort((a, b) => b.max - b.score - (a.max - a.score))
    .slice(0, 3);

  const missingTop: InputScoreMissing[] = missingRanked.map((d) => ({
    key: d.key,
    title: DIM_TITLES[d.key] ?? d.key,
    why: MODE_WHYS[d.key] ?? "",
    example: MODE_EXAMPLES[mode]?.[d.key],
    insertText: MODE_INSERTS[mode]?.[d.key],
  }));

  // If contradictions exist, inject a contradiction warning at the top
  if (hasContradictions(p)) {
    missingTop.unshift({
      key: "contradiction",
      title: "סתירה פנימית",
      why: 'הפרומפט מכיל דרישות סותרות (למשל "קצר" + מאות מילים)',
      example: 'בחר כיוון אחד: "עד 100 מילים" או "500+ מילים" — לא שניהם',
    });
    missingTop.length = Math.min(missingTop.length, 3);
  }

  // Buzzword inflation warning — nudge toward concrete specs
  if (buzzCount >= 3 && !hasMeasurableQuantity(p) && !hasExampleBlock(p)) {
    missingTop.unshift({
      key: "buzzword_inflation",
      title: "ניפוח מילות באזז",
      why: `נמצאו ${buzzCount} מילות באזז ("איכותי", "מעולה"…) בלי מפרט קונקרטי — המודל מתייחס אליהן כרעש`,
      example: 'החלף "תוכן איכותי חדשני מקצועי" ב‑"3 פסקאות, טון רשמי, עם 2 דוגמאות מספריות"',
    });
    missingTop.length = Math.min(missingTop.length, 3);
  }

  const { level, label } = levelOf(total, p.wordCount);

  return {
    total,
    level,
    label,
    strengths: strengths.slice(0, 3),
    missingTop,
    breakdown,
    mode,
    domain: detectPromptDomain(text),
  };
}
