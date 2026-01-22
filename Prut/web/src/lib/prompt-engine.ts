
interface PromptOptions {
  tone?: string;
  category?: string;
  input?: string;
}

const CATEGORY_LIST = [
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

const TEMPLATE_HINTS: Record<string, string> = {
  Marketing: "- קהל יעד, ערוץ, הצעה/CTA.\n- וריאציות קצרות + התאמה לטון מותג.",
  Sales: "- כאב לקוח, ערך, התנגדויות, צעד הבא.\n- טון משכנע ומדויק.",
  CustomerSupport: "- אבחון הבעיה, אמפתיה, פתרון מדויק.\n- צעדים ברורים והסלמה אם צריך.",
  Product: "- דרישות, קונספט, קריטריוני הצלחה.\n- דגשים ל-UX או MVP.",
  Operations: "- תהליך, SLA, מדדים, סיכונים.\n- תוצאה בפורמט צ'קליסט.",
  HR: "- תפקיד, דרישות, תרבות ארגונית.\n- טון מכבד ומקצועי.",
  Dev: "- קלט/פלט, קצוות, אילוצים טכניים.\n- ציפיות לגבי קוד ודוגמה.",
  Education: "- מטרות למידה, רמת קהל, תרגול.\n- שפה נגישה והדרגתית.",
  Legal: "- מסגרת משפטית, תחום שיפוט, סיכון.\n- ניסוח זהיר, ללא ייעוץ מחייב.",
  Creative: "- השראה, סגנון, רפרנסים.\n- ניסוי כיוונים שונים.",
  Social: "- פלטפורמה, וו-הוק, ויז'ואל, CTA.\n- אורך קצר ועוגני מעורבות.",
  Finance: "- KPI, תמחור, תקציב, סיכונים.\n- תוצאות מספריות ורגולטוריות.",
  Healthcare: "- הקשר בריאותי, קהל יעד, מגבלות.\n- זהירות: ללא ייעוץ רפואי מחייב.",
  Ecommerce: "- מוצר, הצעה, AOV, מלאי.\n- CTA ברור ושפה מסחרית.",
  RealEstate: "- נכס, מיקום, תקציב, פרטים קריטיים.\n- טון אמין ומדויק.",
  Strategy: "- אבחנה, כיוונים, סיכונים.\n- תוצר במבנה החלטה.",
  Design: "- מטרות, קהל, שפה עיצובית.\n- דגשים ל-UX/UI.",
  Data: "- מקור נתונים, שאלת מחקר.\n- תוצאה בטבלאות/תובנות.",
  Automation: "- טריגרים, פעולות, כללים.\n- תוצאה כתרשים זרימה.",
  Community: "- מטרת קהילה, ערוצים, מעורבות.\n- מדדי הצלחה ושפה אנושית.",
  Nonprofit: "- מטרה חברתית, קהל תורמים.\n- טון רגיש ואמין.",
  General: "- הקשר, קהל יעד, תוצאה רצויה.\n- פורמט פלט ברור.",
};

const SIGNALS = [
  {
    key: "מטרה",
    priority: 1,
    patterns: [/מטרה|יעד|goal|objective|conversion|שכנע|להוביל|לייצר/i],
  },
  {
    key: "קהל יעד",
    priority: 1,
    patterns: [/קהל יעד|לקוחות|משתמשים|audience|target|persona/i],
  },
  {
    key: "ערוץ/פורמט",
    priority: 2,
    patterns: [/מייל|email|landing|דף נחיתה|מודעה|ad|linkedin|facebook|instagram|tiktok|sms|whatsapp|בלוג|blog/i],
  },
  {
    key: "מגבלות",
    priority: 3,
    patterns: [/מגבלות|אסור|חובה|רגולציה|compliance|טון|tone|שפה|language/i],
  },
  {
    key: "פורמט פלט",
    priority: 2,
    patterns: [/פורמט|מבנה|טבלה|רשימה|bullet|markdown|json|אורך|מילים|characters/i],
  },
  {
    key: "דוגמאות",
    priority: 4,
    patterns: [/דוגמ|example|examples|sample/i],
  },
  {
    key: "נתונים",
    priority: 4,
    patterns: [/נתונים|data|dataset|csv|excel|אקסל|source|מקור/i],
  },
  {
    key: "מדדי הצלחה",
    priority: 4,
    patterns: [/kpi|מדד|מדדים|success criteria|הצלחה|benchmark/i],
  },
];

const hebrewRegex = /[\u0590-\u05FF]/;
const SCORE_TIPS: Record<string, string> = {
  קונטקסט: "הוסף/י הקשר קצר",
  "קהל יעד": "הגדר/י קהל יעד",
  מטרה: "ציין/י מטרה ברורה",
  "ערוץ/פורמט": "ציין/י ערוץ או פורמט",
  מגבלות: "הוסף/י מגבלות או טון",
  "פורמט פלט": "הגדר/י פורמט פלט",
  דוגמאות: "הוסף/י דוגמאות קצרות",
  נתונים: "ציין/י נתונים או מקור מידע",
  "מדדי הצלחה": "הוסף/י מדדי הצלחה",
};

type PromptScoreLevel = "empty" | "low" | "medium" | "high";
type PromptUsage = {
  copies?: number;
  saves?: number;
  refinements?: number;
};
type PromptScore = {
  score: number;
  baseScore: number;
  usageBoost: number;
  level: PromptScoreLevel;
  label: string;
  missing: string[];
  tips: string[];
  wordCount: number;
};

function detectMissingInfo(input: string): string[] {
  return collectMissingSignals(input).slice(0, 3);
}

export function scorePrompt(input: string, usage?: PromptUsage): PromptScore {
  const trimmed = input.trim();
  if (!trimmed) {
    const missing = ["קונטקסט", "מטרה", "קהל יעד"];
    return {
      score: 0,
      baseScore: 0,
      usageBoost: 0,
      level: "empty",
      label: "חסר",
      missing,
      tips: missing.map((item) => SCORE_TIPS[item]).filter(Boolean),
      wordCount: 0,
    };
  }

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const missing = collectMissingSignals(trimmed);
  const missingForScore = missing.filter((item) => item !== "קונטקסט");
  const placeholderCount = (trimmed.match(/{[^}]+}/g) || []).length;
  const sentenceCount = trimmed.split(/[.!?]\s/).filter(Boolean).length;
  const criticalMissing = ["מטרה", "קהל יעד", "פורמט פלט"];
  const criticalCount = missing.filter((item) => criticalMissing.includes(item)).length;

  let baseScore = 100;
  if (wordCount < 6) {
    baseScore -= 42;
  } else if (wordCount < 12) {
    baseScore -= 26;
  } else if (wordCount < 20) {
    baseScore -= 12;
  }

  baseScore -= missingForScore.length * 10;
  if (criticalCount > 0) {
    baseScore -= criticalCount * 6;
  }
  if (placeholderCount >= 3) {
    baseScore -= Math.min(18, placeholderCount * 4);
  }

  let bonus = 0;
  if (/[:•\-\n]/.test(trimmed)) bonus += 4;
  if (/\d/.test(trimmed)) bonus += 6;
  if (/פורמט|מבנה|json|טבלה|רשימה|bullet|markdown|אורך|מילים|characters/i.test(trimmed)) bonus += 8;
  if (/טון|tone|סגנון|style|שפה|language/i.test(trimmed)) bonus += 6;
  if (/דוגמ|example|examples/i.test(trimmed)) bonus += 4;
  if (sentenceCount >= 2) bonus += 4;
  if (/שלבים|צעד|step|flow|תהליך/i.test(trimmed)) bonus += 6;
  if (/תקציב|budget|דדליין|timeline|זמן|אילוץ/i.test(trimmed)) bonus += 4;
  if (/קהל יעד|audience|persona/i.test(trimmed)) bonus += 3;
  if (/מטרה|objective|goal|יעד/i.test(trimmed)) bonus += 3;

  baseScore = Math.max(0, Math.min(100, baseScore + bonus));

  const usageBoost = usage
    ? Math.min(
        15,
        (usage.copies ?? 0) * 3 + (usage.saves ?? 0) * 4 + (usage.refinements ?? 0) * 2
      )
    : 0;

  const score = Math.max(0, Math.min(100, baseScore + usageBoost));

  let level: PromptScoreLevel = "low";
  let label = "חלש";
  if (score >= 80) {
    level = "high";
    label = "חזק";
  } else if (score >= 55) {
    level = "medium";
    label = "בינוני";
  }

  const tips = missing
    .map((item) => SCORE_TIPS[item])
    .filter(Boolean);

  if (tips.length === 0 && wordCount < 16) {
    tips.push("הוסף/י עוד הקשר או פרטים");
  }

  return {
    score,
    baseScore,
    usageBoost,
    level,
    label,
    missing,
    tips: tips.slice(0, 2),
    wordCount,
  };
}

function collectMissingSignals(input: string): string[] {
  const normalized = input.toLowerCase();
  const wordCount = input.trim().split(/\s+/).filter(Boolean).length;
  const missing: Array<{ key: string; priority: number }> = [];

  if (wordCount < 8) {
    missing.push({ key: "קונטקסט", priority: 2 });
  }

  for (const signal of SIGNALS) {
    const hasSignal = signal.patterns.some((pattern) => pattern.test(normalized));
    if (!hasSignal) {
      missing.push({ key: signal.key, priority: signal.priority ?? 3 });
    }
  }

  return missing
    .sort((a, b) => a.priority - b.priority)
    .map((item) => item.key);
}

export function generatePromptSystemPrompt({ tone = "Professional", category = "General", input = "" }: PromptOptions): string {
  const languageHint = hebrewRegex.test(input) ? "Hebrew" : "Match the user's language";
  const templateHint = TEMPLATE_HINTS[category] ?? TEMPLATE_HINTS.General;
  
  // CACHE STRATEGY: Static instructions first!
  return `Role: Senior Prompt Engineer & Product Writer
Goal: Convert a rough prompt into a clear, high-quality "Great Prompt" with depth and practical detail.

Current Task Configuration:
- Language: ${languageHint}. Keep responses concise and practical.
- Tone: ${tone}.
- Category: ${category}. (Valid: ${CATEGORY_LIST.join(", ")}).
- Context Hint: ${templateHint}

Great Prompt structure (Markdown):
Format the output as a professionally styled prompt ready for immediate use:

1. **Section Headings**: Use yellow-styled headings in square brackets format:
   - [מצב משימה] or [Situation]
   - [משימה] or [Task]
   - [מטרה] or [Objective]
   - [ידע נדרש] or [Knowledge]
   - [מגבלות] or [Constraints]

2. **Variables**: Mark all variables with curly braces and ENGLISH names (e.g. {product_name}).

3. **Style**: Use bullet points and clean spacing.

Output format (JSON):
{
  "great_prompt": "...",
  "category": "..."
}

Rules:
- Return ONLY valid JSON.
- Prefer actionable steps and organized sub-bullets.
- Do not mention internal frameworks.`;
}

export function generateQuestionsSystemPrompt({ input = "" }: PromptOptions): string {
  const missingInfo = input ? detectMissingInfo(input) : ["קונטקסט", "מטרה", "קהל יעד"];
  const missingInfoText = missingInfo.length > 0 ? missingInfo.join(", ") : "ללא";
  const languageHint = hebrewRegex.test(input) ? "Hebrew" : "Match the user's language";

  // CACHE STRATEGY: Static instructions first!
  return `Role: Senior Prompt Engineer (Strategy Specialist)
Goal: Identify EXACTLY 3 missing details that would significantly improve the user's prompt.

Current Task Configuration:
- Language: ${languageHint}.
- Detected Missing Areas: ${missingInfoText}

Instructions:
1. Analyze the input prompt.
2. Generate exactly 3 distinct clarifying questions.
3. If "Detected Missing Areas" is "ללא" (None) and the prompt seems complete, return an empty array.

Question Types:
- Question 1 (Strategy/Goal): Core objective or audience.
- Question 2 (Content/Style): Tone, format, specific requirements.
- Question 3 (Missing Details): Constraints or key missing info.

Output format (JSON):
{
  "clarifying_questions": [
    { "id": 1, "question": "...", "description": "...", "examples": ["...", "...", "..."] }
  ]
}

Rules:
- Questions must be short, specific, and directly fill a gap.
- Provide 3 short examples for each question.
- Return ONLY valid JSON.`;
}
