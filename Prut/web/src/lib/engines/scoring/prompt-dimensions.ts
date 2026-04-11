/**
 * Single source of truth for EnhancedScorer dimension logic + Hebrew labels.
 * InputScorer reuses ratios via scoreRatioForKey where keys align.
 */

import {
  parse,
  type Parsed,
  TASK_VERBS_RE,
  HEBREW_ROLE_RE,
  ENGLISH_ROLE_RE,
  hasTaskVerbWithObject,
  hasSpecificityProperNouns,
} from './prompt-parse';

// ---------------------------------------------------------------------------
// Domain detection — used by both EnhancedScorer and InputScorer
// ---------------------------------------------------------------------------

export type PromptDomain = 'content' | 'technical' | 'creative' | 'research' | 'instruction' | 'general';

export function detectPromptDomain(t: string): PromptDomain {
  // Creative check runs BEFORE technical so "screenplay script" / "fiction story" don't mis-classify.
  // screenplay/תסריט are creative-exclusive; "script" alone is ambiguous so excluded from creative check.
  if (/\bstory\b|poem|fiction|creative writing|\bcharacter\b|novel|narrative|\bplot\b|\bscene\b|\bdialogue\b|screenplay|סיפור|שיר|דמות|תסריט|דיאלוג|סצנה|יצירתי/i.test(t)) return 'creative';
  // Technical: excludes "script" (too ambiguous), relies on unambiguous dev keywords
  if (/\bcode\b|function\b|api\b|debug\b|\berror\b|sql\b|typescript|javascript|python|\bcomponent\b|\bclass\b|method\b|endpoint|database|\bquery\b|npm\b|package\b|\bimport\b|\bexport\b|interface\b|\basync\b|\bawait\b|promise\b|\bhook\b|useState|useEffect|פונקציה|קוד|מסד נתונים/i.test(t)) return 'technical';
  if (/blog|linkedin|instagram|facebook|email|newsletter|post\b|social|landing\s*page|\bad\b|\bads\b|campaign|copywriting|\bcontent\b|marketing|caption|תוכן|בלוג|פוסט|מייל|ניוזלטר|מודעה|שיווק|קמפיין/i.test(t)) return 'content';
  if (/research|analysis|\bdata\b|study\b|report\b|statistics|literature|academic|survey|findings|evidence|analyze|מחקר|ניתוח|נתונים|דוח|סטטיסטיקה|אקדמי|עדויות/i.test(t)) return 'research';
  if (/how[\s-]to|tutorial|guide\b|step[\s-]by[\s-]step|instructions|walkthrough|explain|teach|course|lesson|מדריך|שלב|הסבר|לימוד|הוראות/i.test(t)) return 'instruction';
  return 'general';
}

/** Hebrew UI labels for each domain — shared by LiveInputScorePill and ScoreBreakdownDrawer */
export const PROMPT_DOMAIN_LABELS: Partial<Record<PromptDomain, string>> = {
  technical:   '💻 טכני',
  content:     '✍️ תוכן',
  creative:    '🎨 יצירתי',
  research:    '🔍 מחקר',
  instruction: '📋 הוראות',
  // 'general' intentionally omitted — no label shown for the default domain
};

/** Domain → set of applicable dimension keys (others zeroed out in the score denominator) */
const DOMAIN_DIMENSION_APPLICABILITY: Record<PromptDomain, Set<string>> = {
  content:     new Set(['length','role','task','context','specificity','format','constraints','structure','channel','examples','clarity','groundedness','safety','measurability','framework']),
  technical:   new Set(['length','role','task','context','specificity','format','constraints','structure','examples','clarity','safety','measurability','framework']),
  creative:    new Set(['length','role','task','context','specificity','format','constraints','structure','clarity','framework']),
  research:    new Set(['length','role','task','context','specificity','format','constraints','structure','clarity','groundedness','safety','measurability','framework']),
  instruction: new Set(['length','role','task','context','specificity','format','constraints','structure','examples','clarity','measurability','framework']),
  general:     new Set(['length','role','task','context','specificity','format','constraints','structure','channel','examples','clarity','groundedness','safety','measurability','framework']),
};

export type DimensionScoreChunk = {
  key: string;
  maxPoints: number;
  tipHe: string;
  score: number;
  matched: string[];
  missing: string[];
};

/** Hebrew UI labels for dimension keys */
export const DIMENSION_LABEL_HE: Record<string, string> = {
  length: 'אורך',
  role: 'תפקיד',
  task: 'משימה',
  context: 'הקשר',
  specificity: 'ספציפיות',
  format: 'פורמט פלט',
  constraints: 'מגבלות',
  structure: 'מבנה',
  channel: 'ערוץ / פלטפורמה',
  examples: 'דוגמאות',
  clarity: 'בהירות',
  groundedness: 'עיגון במקורות',
  safety: 'גבולות ובטיחות',
  measurability: 'מדידות',
  framework: 'מסגרת',
  subject: 'נושא',
  style: 'סגנון',
  composition: 'קומפוזיציה',
  lighting: 'תאורה',
  color: 'צבע',
  quality: 'איכות טכנית',
  motion: 'תנועה',
};

/**
 * Checklist lines for engine quality gate (aligned with text dimensions).
 * Used by getTextQualityGateLines / skills.
 */
export const TEXT_QUALITY_GATE_LINES_HE: string[] = [
  'אורך: מספיק פרטים — לא משפט בודד',
  'תפקיד: משפט "אתה …" / You are … עם התמחות או ניסיון',
  'משימה: פועל פעולה + אובייקט ברור',
  'הקשר: קהל יעד, מטרה, רקע',
  'ספציפיות: מספרים קשורים למשימה, דוגמאות, שמות',
  'פורמט פלט: מבנה (רשימה/טבלה) ואורך',
  'מגבלות: "אל ת…", טון, שפה',
  'מבנה: שורות / כותרות / רשימות',
  'ערוץ: פלטפורמה (מייל, לינקדאין, בלוג …) כשהדבר רלוונטי',
  'דוגמאות: few-shot או דוגמה לפלט',
  'בהירות: בלי hedges ובלי ניפוח באזז בלי מפרט',
  'עיגון במקורות: מקורות / אי-ודאות מותרת',
  'גבולות ובטיחות: תחום, מקרי קצה, ללא סתירות פנימיות',
  'מדידות: מספר פריטים / גבולות מינימום־מקסימום',
  'מסגרת: CO-STAR / RISEN או כותרות עבריות מקבילות (תפקיד, משימה, שלבים …)',
];

export function getTextQualityGateLines(): string[] {
  return [...TEXT_QUALITY_GATE_LINES_HE];
}

const TIPS: Record<string, string> = {
  length: 'הוסף עוד פרטים והקשר',
  role: 'הגדר תפקיד/פרסונה (למשל: "אתה מומחה שיווק עם 15 שנות ניסיון")',
  task: 'הגדר משימה ברורה עם פועל פעולה',
  context: 'ספק הקשר: קהל, מטרה, רקע',
  specificity: 'הוסף מספרים, שמות ודוגמאות קונקרטיות',
  format: 'ציין פורמט פלט (רשימה, טבלה, אורך)',
  constraints: 'הגדר מגבלות (מה לא לעשות, טון, שפה)',
  structure: 'ארגן את הפרומפט בסעיפים',
  channel: 'ציין פלטפורמה (מייל, אינסטגרם, בלוג, לינקדאין)',
  examples: 'הוסף דוגמאות לפלט רצוי (few-shot)',
  clarity: 'השתמש בצורת ציווי ברורה, הימנע מ"אולי", "נסה", "ייתכן"',
  groundedness: 'הוסף הוראות נגד הזיה: "בסס על עובדות", "אם לא בטוח - ציין"',
  safety: 'הגדר גבולות ומקרי קצה (Iron Dome)',
  measurability: 'ציין קריטריוני הצלחה מדידים (מספר פריטים, אורך מדויק)',
  framework: 'השתמש במסגרת פרומפטינג (CO-STAR, RISEN, CTCO)',
};

function scoreLength(wc: number): Omit<DimensionScoreChunk, 'key' | 'tipHe'> & { key: 'length' } {
  const key = 'length';
  const maxPoints = 10;
  if (wc <= 3) return { key, maxPoints, score: 0, matched: [], missing: ['אורך'] };
  if (wc <= 6) return { key, maxPoints, score: 2, matched: ['מספיק מילים לבסיס'], missing: ['פרטים'] };
  if (wc <= 12) return { key, maxPoints, score: 4, matched: ['אורך בינוני'], missing: ['פירוט'] };
  if (wc <= 25) return { key, maxPoints, score: 6, matched: ['אורך טוב'], missing: ['יותר הקשר'] };
  if (wc <= 50) return { key, maxPoints, score: 8, matched: ['מפורט'], missing: [] };
  return { key, maxPoints, score: 10, matched: ['מפורט מאוד'], missing: [] };
}

function scoreRole(t: string): Omit<DimensionScoreChunk, 'tipHe'> & { key: 'role' } {
  const key = 'role';
  const maxPoints = 10;
  const matched: string[] = [];
  const missing: string[] = [];

  // Extended Hebrew persona patterns produced by the enhancement LLM
  const extendedHebrewRole = /כ-\s*\S|בתפקיד\s+\S|בהיותי\s+\S|בכושר\s+\S|בתחום\s+\S|מתמחה\s+ב/i;

  if (HEBREW_ROLE_RE.test(t) || ENGLISH_ROLE_RE.test(t) || extendedHebrewRole.test(t)) {
    matched.push('פרסונה מוגדרת בפתיחה');
    if (/\d+\s+(שנות|שנים|years)|מוסמך|בכיר|פרימיום|senior|lead/i.test(t)) {
      matched.push('ניסיון / הסמכה');
      return { key, maxPoints, score: 10, matched, missing };
    }
    // "אתה מומחה ב-X" / "אתה מתמחה ב-X" — meaningful role, give 7 not 3
    if (/מומחה\s+ב|מתמחה\s+ב|specialist\s+in|expert\s+in/i.test(t)) {
      matched.push('התמחות מוגדרת');
      return { key, maxPoints, score: 8, matched, missing: ['שנות ניסיון'] };
    }
    return { key, maxPoints, score: 7, matched, missing: ['שנות ניסיון או התמחות ספציפית'] };
  }
  if (/מומחה|יועץ|אנליסט|expert|specialist|analyst/i.test(t)) {
    return { key, maxPoints, score: 4, matched: ['אזכור תפקיד'], missing: ['משפט "אתה …" מפורש'] };
  }
  missing.push('הגדרת תפקיד');
  return { key, maxPoints, score: 0, matched, missing };
}

function scoreTask(t: string): Omit<DimensionScoreChunk, 'tipHe'> & { key: 'task' } {
  const key = 'task';
  const maxPoints = 10;
  const p = parse(t);
  if (!TASK_VERBS_RE.test(t)) {
    return { key, maxPoints, score: 0, matched: [], missing: ['פועל משימה'] };
  }
  const matched = ['פועל פעולה'];
  if (
    /כתוב\s+\S+|צור\s+\S+|בנה\s+\S+|write\s+a\s+\S+|create\s+a\s+\S+/i.test(t) ||
    hasTaskVerbWithObject(p)
  ) {
    matched.push('אובייקט משימה');
    return { key, maxPoints, score: 10, matched, missing: [] };
  }
  return { key, maxPoints, score: 5, matched, missing: ['אובייקט משימה ספציפי'] };
}

function scoreContext(t: string, p: Parsed): Omit<DimensionScoreChunk, 'tipHe'> & { key: 'context' } {
  const key = 'context';
  const maxPoints = 10;
  const matched: string[] = [];
  const missing: string[] = [];
  let pts = 0;
  if (/קהל יעד|לקוחות|משתמשים|audience|target|persona|עבור/i.test(t)) {
    matched.push('קהל יעד');
    pts += 4;
  } else missing.push('קהל יעד');
  if (/מטרה|יעד|goal|objective|כדי\s+ל|so\s+that/i.test(t)) {
    matched.push('מטרה');
    pts += 3;
  } else missing.push('מטרה');
  if (/רקע|הקשר|מצב|context|background|situation/i.test(t) || p.sections.has('context')) {
    matched.push('רקע');
    pts += 3;
  } else missing.push('רקע');
  return { key, maxPoints, score: pts, matched, missing };
}

function scoreSpecificity(t: string, p: Parsed): Omit<DimensionScoreChunk, 'tipHe'> & { key: 'specificity' } {
  const key = 'specificity';
  const maxPoints = 10;
  const matched: string[] = [];
  const missing: string[] = [];
  let pts = 0;
  const taskQuantityRegex =
    /(\d+\s*[-–]\s*\d+\s*(מילים|שורות|נקודות|פסקאות|סעיפים|דקות|שניות|פריטים|words|sentences|lines|points|bullets|paragraphs|items|steps|minutes|seconds|chars|characters))|(עד\s+\d+\s*(מילים|שורות|נקודות|words|sentences|lines|items|bullets|paragraphs))|(לפחות\s+\d+\s*(מילים|שורות|words|sentences|items))|(בין\s+\d+\s+ל[-–]?\s*\d+)|(\d+\s*(מילים|שורות|נקודות|פסקאות|סעיפים|דקות|שניות|פריטים|words|sentences|lines|points|bullets|paragraphs|items|steps|minutes|seconds|chars|characters))/i;
  if (taskQuantityRegex.test(t)) {
    matched.push('task-relevant numbers (מספרים קשורים למשימה)');
    pts += 3;
  } else if (/\d+/.test(t)) {
    matched.push('מספרים (לא קשורים ישירות למשימה)');
    pts += 1;
    missing.push('מספרים שמגדירים כמות (מילים, פריטים …)');
  } else missing.push('מספרים קונקרטיים');

  if (/[""״]|למשל|לדוגמה|for\s+example|e\.g\./i.test(t)) {
    matched.push('דוגמאות');
    pts += 4;
  } else missing.push('דוגמאות');

  if (/[A-Z][a-z]{2,}/.test(t) || /\b[A-Z]{2,}\b/.test(t) || hasSpecificityProperNouns(p)) {
    matched.push('שמות / מותגים');
    pts += 3;
  } else missing.push('שמות מפורשים');
  return { key, maxPoints, score: Math.min(10, pts), matched, missing };
}

function scoreFormat(t: string): Omit<DimensionScoreChunk, 'tipHe'> & { key: 'format' } {
  const key = 'format';
  const maxPoints = 10;
  const matched: string[] = [];
  const missing: string[] = [];
  let pts = 0;
  if (/פורמט|מבנה|טבלה|רשימה|bullet|markdown|json|csv/i.test(t)) {
    matched.push('פורמט פלט');
    pts += 5;
  } else missing.push('פורמט פלט');
  if (/אורך|מילים|שורות|פסקאות|words|sentences|paragraphs|short|long|קצר|ארוך/i.test(t)) {
    matched.push('אורך');
    pts += 3;
  } else missing.push('אורך');
  if (/כותרת|סעיפים|חלקים|header|section|intro|summary/i.test(t)) {
    matched.push('מבנה סעיפים');
    pts += 2;
  }
  return { key, maxPoints, score: Math.min(10, pts), matched, missing };
}

function scoreConstraints(t: string, p: Parsed): Omit<DimensionScoreChunk, 'tipHe'> & { key: 'constraints' } {
  const key = 'constraints';
  const maxPoints = 10;
  const matched: string[] = [];
  const missing: string[] = [];
  if (
    p.sections.has('constraints') &&
    /טון|סגנון|tone|style|formal|casual|מקצועי|ידידותי/i.test(t) &&
    /שפה|language|בעברית|באנגלית|נגיש/i.test(t)
  ) {
    return {
      key,
      maxPoints,
      score: 10,
      matched: ['סעיף Constraints', 'טון', 'שפה'],
      missing: [],
    };
  }
  let pts = 0;
  // Dedicated section header (##הנחיות / ##מגבלות) counts as strong constraints signal
  if (/##\s*(הנחיות|מגבלות|constraints|instructions|rules|הגבלות)/i.test(t)) {
    matched.push('כותרת מגבלות');
    pts += 4;
  } else if (/אל\s+ת|אסור|ללא|בלי|don'?t|avoid|never|without/i.test(t)) {
    matched.push('מגבלות שליליות');
    pts += 4;
  } else missing.push('מגבלות שליליות');
  if (/טון|סגנון|tone|style|formal|casual|מקצועי|ידידותי/i.test(t)) {
    matched.push('טון');
    pts += 3;
  } else missing.push('טון');
  if (/שפה|language|בעברית|באנגלית/i.test(t)) {
    matched.push('שפה');
    pts += 3;
  } else missing.push('שפה');
  return { key, maxPoints, score: Math.min(10, pts), matched, missing };
}

function scoreStructure(t: string): Omit<DimensionScoreChunk, 'tipHe'> & { key: 'structure' } {
  const key = 'structure';
  const maxPoints = 6;
  const matched: string[] = [];
  let pts = 0;
  if (/\n/.test(t)) {
    matched.push('שבירת שורות');
    pts += 2;
  }
  if (/^\s*[\d•\-\*]\s*/m.test(t)) {
    matched.push('רשימות');
    pts += 2;
  }
  if (/---|===|\*\*|##|:$/m.test(t)) {
    matched.push('מפרידים / כותרות');
    pts += 2;
  }
  return {
    key,
    maxPoints,
    score: Math.min(6, pts),
    matched,
    missing: pts === 0 ? ['מבנה (סעיפים / רשימות)'] : [],
  };
}

function scoreChannel(t: string): Omit<DimensionScoreChunk, 'tipHe'> & { key: 'channel' } {
  const key = 'channel';
  const maxPoints = 6;
  if (
    /מייל|email|landing|מודעה|ad|לינקדאין|linkedin|פייסבוק|facebook|אינסטגרם|instagram|טיקטוק|tiktok|sms|וואטסאפ|whatsapp|בלוג|blog|newsletter|ניוזלטר|אתר|website|יוטיוב|youtube|טוויטר|twitter|podcast/i.test(
      t
    )
  ) {
    return { key, maxPoints, score: 6, matched: ['פלטפורמה מצוינת'], missing: [] };
  }
  return { key, maxPoints, score: 0, matched: [], missing: ['ערוץ / פלטפורמה'] };
}

function scoreExamples(t: string, p: Parsed): Omit<DimensionScoreChunk, 'tipHe'> & { key: 'examples' } {
  const key = 'examples';
  const maxPoints = 6;
  if (p.sections.has('examples')) {
    return {
      key,
      maxPoints,
      score: 6,
      matched: ['כותרת דוגמאות / מקטע דוגמאות'],
      missing: [],
    };
  }
  if (/דוגמה לפלט|output\s+example|expected\s+output|כמו\s+זה/i.test(t)) {
    return { key, maxPoints, score: 6, matched: ['דוגמאות פלט מפורשות'], missing: [] };
  }
  if (/דוגמה|example|sample|template|תבנית/i.test(t)) {
    return { key, maxPoints, score: 3, matched: ['אזכור דוגמה'], missing: ['בלוק דוגמה מלא'] };
  }
  return { key, maxPoints, score: 0, matched: [], missing: ['few-shot / דוגמה'] };
}

function scoreClarity(t: string): Omit<DimensionScoreChunk, 'tipHe'> & { key: 'clarity' } {
  const key = 'clarity';
  const maxPoints = 8;
  const matched: string[] = [];
  const missing: string[] = [];
  let pts = 8;
  const hedges = ['אולי', 'נסה ל', 'ייתכן', 'אפשר', 'maybe', 'perhaps', 'try to', 'somewhat', 'kind of', 'sort of'];
  const hedgeCount = hedges.filter((h) => new RegExp(h, 'i').test(t)).length;
  if (hedgeCount > 0) {
    pts -= Math.min(6, hedgeCount * 2);
    missing.push(`${hedgeCount} מילות hedge`);
  }
  const buzzwords = [
    'מקצועי',
    'מקיף',
    'איכותי',
    'מצוין',
    'יוצא דופן',
    'ברמה הגבוהה',
    'מתקדם',
    'חדשני',
    'מעולה',
    'מהמובילים',
    'ברמה עולמית',
    'world-class',
    'premium',
    'expert',
    'best-in-class',
    'cutting-edge',
    'state-of-the-art',
    'top-tier',
    'high-quality',
    'excellent',
    'outstanding',
    'superior',
    'advanced',
    'comprehensive',
    'professional',
    'innovative',
    'revolutionary',
    'unique',
  ];
  const buzzwordHits = buzzwords.filter((b) => new RegExp(b, 'i').test(t)).length;
  const hasConcreteSpec = /\d+\s*(מילים|שורות|נקודות|words|lines|items|points|bullets|sentences)/i.test(t);
  if (buzzwordHits >= 3 && !hasConcreteSpec) {
    pts -= 5;
    missing.push(`buzzword inflation (${buzzwordHits}) — no measurable spec / ניפוח באזז בלי מפרט מדיד`);
  }
  if (/^(כתוב|צור|בנה|נסח|write|create|build|generate)\s/im.test(t)) {
    matched.push('פתיחה בציווי חד');
  }
  return { key, maxPoints, score: Math.max(0, pts), matched, missing };
}

function scoreGroundedness(t: string): Omit<DimensionScoreChunk, 'tipHe'> & { key: 'groundedness' } {
  const key = 'groundedness';
  const maxPoints = 8;
  const matched: string[] = [];
  const missing: string[] = [];
  let pts = 0;
  if (/צטט|מקור|cite|source|reference|based\s+on/i.test(t)) {
    matched.push('דרישת מקורות');
    pts += 3;
  } else missing.push('דרישת מקור / ציטוט');
  if (/אם לא בטוח|אל תמציא|don'?t\s+fabricate|if\s+unsure|אינני בטוח|i\s+don'?t\s+know|הסתמך על/i.test(t)) {
    matched.push('רשות לאי-ודאות');
    pts += 3;
  } else missing.push('רשות לאי-ודאות');
  if (/עובדות|fact|ground|אמת|verify/i.test(t)) {
    matched.push('עיגון בעובדות');
    pts += 2;
  } else missing.push('עיגון בעובדות');
  return { key, maxPoints, score: Math.min(8, pts), matched, missing };
}

function scoreSafety(t: string): Omit<DimensionScoreChunk, 'tipHe'> & { key: 'safety' } {
  const key = 'safety';
  const maxPoints = 6;
  const matched: string[] = [];
  const missing: string[] = [];
  let pts = 0;
  if (/מחוץ לתחום|out\s+of\s+scope|not\s+covered|לא בתחום/i.test(t)) {
    matched.push('גבול תחום');
    pts += 3;
  }
  if (/מקרה קצה|edge\s+case|exception|חריג/i.test(t)) {
    matched.push('מקרי קצה');
    pts += 2;
  }
  if (/אם\s+.*\s+אז|if\s+.*\s+then|fallback|נסיגה/i.test(t)) {
    matched.push('לוגיקת גיבוי');
    pts += 1;
  }
  if (pts === 0) missing.push('גבולות / מקרי קצה');

  let contradictionCount = 0;
  const brevity = /(?:^|[^\p{L}])(קצר|תקציר|בקצרה|short|brief|concise|terse)(?:[^\p{L}]|$)/iu;
  const wordTarget = /(\d{3,})\s*(מילים|words)/i;
  const wm = t.match(wordTarget);
  if (brevity.test(t) && wm && parseInt(wm[1], 10) >= 500) {
    contradictionCount++;
    missing.push('contradiction: brevity vs high word target / סתירה: קצר מול יעד אורך מילולי גבוה');
  }
  const pairs: Array<[RegExp, RegExp, string]> = [
    [/(?:בלי|ללא|without|no)\s*טבלה|no\s+table/i, /בטבלה|in\s+a?\s*table|table\s+format/i, 'בלי טבלה מול בטבלה'],
    [/(?:בלי|ללא|no|without)\s*(?:רשימ|list|bullets)/i, /רשימה\s+של|list\s+of|bullet\s+points/i, 'בלי רשימה מול רשימה'],
  ];
  for (const [a, b, label] of pairs) {
    if (a.test(t) && b.test(t)) {
      contradictionCount++;
      missing.push(`סתירה: ${label}`);
    }
  }
  if (contradictionCount > 0) {
    pts = Math.max(0, pts - contradictionCount * 3);
  }
  return { key, maxPoints, score: Math.min(6, pts), matched, missing };
}

function scoreMeasurability(t: string): Omit<DimensionScoreChunk, 'tipHe'> & { key: 'measurability' } {
  const key = 'measurability';
  const maxPoints = 6;
  const matched: string[] = [];
  const missing: string[] = [];
  let pts = 0;
  if (/\d+\s*(פריטים|נקודות|שורות|פסקאות|bullets|items|sentences|paragraphs|points)/i.test(t)) {
    matched.push('כמות מדידה');
    pts += 3;
  } else missing.push('קריטריון כמותי');
  if (/מקסימום|לכל היותר|up\s+to|at\s+most|תקרה|ceiling|limit/i.test(t)) {
    matched.push('תקרה עליונה');
    pts += 2;
  }
  if (/מינימום|לפחות|at\s+least|minimum|תחתית/i.test(t)) {
    matched.push('רצפה תחתונה');
    pts += 1;
  }
  return { key, maxPoints, score: Math.min(6, pts), matched, missing };
}

function scoreFramework(t: string): Omit<DimensionScoreChunk, 'tipHe'> & { key: 'framework' } {
  const key = 'framework';
  const maxPoints = 8;
  const matched: string[] = [];
  const missing: string[] = [];
  const costar = /context|objective|style|tone|audience|response\s+format/gi;
  const costarMatches = (t.match(costar) || []).length;
  const risen = /role|instructions|steps|expectations|narrowing|end\s+goal/gi;
  const risenMatches = (t.match(risen) || []).length;

  // Count structured ## section headers (the enhancement LLM uses these extensively)
  const sectionHeaders = (t.match(/^##\s+\S/gm) || []).length;

  if (/תפקיד|משימה|שלבים|הגבלות|טון|פורמט פלט|קהל יעד|מטרה/.test(t)) {
    matched.push('אלמנטי מסגרת בעברית');
  }
  if (costarMatches >= 4) {
    matched.push('חתימת CO-STAR');
    return { key, maxPoints, score: 8, matched, missing: [] };
  }
  if (risenMatches >= 3) {
    matched.push('חתימת RISEN');
    return { key, maxPoints, score: 7, matched, missing: [] };
  }
  // 4+ section headers = full structured framework
  if (sectionHeaders >= 4) {
    matched.push(`${sectionHeaders} כותרות מובנות`);
    return { key, maxPoints, score: 8, matched, missing: [] };
  }
  // 3 headers = strong framework
  if (sectionHeaders === 3) {
    matched.push('מבנה סעיפים (3 כותרות)');
    return { key, maxPoints, score: 6, matched, missing: [] };
  }
  // 2 headers = partial framework
  if (sectionHeaders === 2) {
    matched.push('מבנה חלקי (2 כותרות)');
    return { key, maxPoints, score: 4, matched, missing: [] };
  }
  if (costarMatches >= 2 || risenMatches >= 2) {
    matched.push('מסגרת חלקית');
    return { key, maxPoints, score: 4, matched, missing: [] };
  }
  if (matched.some((m) => m.includes('עברית'))) {
    return { key, maxPoints, score: 3, matched, missing: [] };
  }
  missing.push('מסגרת מובנית (CO-STAR / RISEN / כותרות עבריות)');
  return { key, maxPoints, score: 0, matched, missing };
}

function wrap(chunk: Omit<DimensionScoreChunk, 'tipHe'>): DimensionScoreChunk {
  return { ...chunk, tipHe: TIPS[chunk.key] ?? chunk.key };
}

/** Full text scoring (15 dimensions) — single source for EnhancedScorer.
 * Pass `domain` to exclude dimensions irrelevant to the prompt type so they
 * don't artificially drag the score down.  If omitted, domain is auto-detected.
 */
export function scoreEnhancedTextDimensions(t: string, wordCount: number, domain?: PromptDomain): DimensionScoreChunk[] {
  const p = parse(t);
  const d = domain ?? detectPromptDomain(t);
  const applicable = DOMAIN_DIMENSION_APPLICABILITY[d];
  const chunks = [
    wrap(scoreLength(wordCount)),
    wrap(scoreRole(t)),
    wrap(scoreTask(t)),
    wrap(scoreContext(t, p)),
    wrap(scoreSpecificity(t, p)),
    wrap(scoreFormat(t)),
    wrap(scoreConstraints(t, p)),
    wrap(scoreStructure(t)),
    wrap(scoreChannel(t)),
    wrap(scoreExamples(t, p)),
    wrap(scoreClarity(t)),
    wrap(scoreGroundedness(t)),
    wrap(scoreSafety(t)),
    wrap(scoreMeasurability(t)),
    wrap(scoreFramework(t)),
  ];
  // Zero out inapplicable dimensions so they don't drag the normalized score
  return chunks.map((c) =>
    applicable.has(c.key) ? c : { ...c, maxPoints: 0, score: 0, matched: [], missing: [] }
  );
}

function scoreVisualLength(wc: number): DimensionScoreChunk {
  const key = 'length';
  const maxPoints = 10;
  const tipHe = TIPS.length;
  if (wc <= 3) return { key, maxPoints, tipHe, score: 0, matched: [], missing: ['פירוט'] };
  if (wc <= 12) return { key, maxPoints, tipHe, score: 4, matched: ['בסיסי'], missing: ['עומק'] };
  if (wc <= 25) return { key, maxPoints, tipHe, score: 7, matched: ['בינוני'], missing: [] };
  return { key, maxPoints, tipHe, score: 10, matched: ['עשיר'], missing: [] };
}

function scoreVisualSubject(t: string): DimensionScoreChunk {
  const key = 'subject';
  const maxPoints = 15;
  const tipHe = 'תאר את הנושא המרכזי (מראה, תנוחה, ביטוי)';
  const matched: string[] = [];
  const missing: string[] = [];
  let pts = 0;
  if (/person|woman|man|child|character|portrait|face|figure|אישה|איש|דמות|ילד|פנים/i.test(t)) {
    matched.push('סוג נושא');
    pts += 5;
  }
  if (/wearing|dressed|hair|eyes|skin|clothes|לובש|שיער|עיניים|בגד/i.test(t)) {
    matched.push('מראה');
    pts += 5;
  } else missing.push('פירוט מראה');
  if (/car|building|landscape|forest|city|ocean|room|table|product|מכונית|בניין|נוף|יער|עיר|חדר/i.test(t)) {
    matched.push('אובייקט / סצנה');
    pts += 5;
  }
  return { key, maxPoints, tipHe, score: Math.min(15, pts), matched, missing };
}

function scoreVisualStyle(t: string): DimensionScoreChunk {
  const key = 'style';
  const maxPoints = 15;
  const tipHe = 'ציין סגנון אמנותי (צילום, ציור שמן, 3D, אנימה)';
  const matched: string[] = [];
  const missing: string[] = [];
  let pts = 0;
  if (/photo|realistic|illustration|painting|3d|render|anime|watercolor|digital art|צילום|ציור|איור/i.test(t)) {
    matched.push('מדיום');
    pts += 8;
  } else missing.push('מדיום');
  if (/style of|בסגנון|aesthetic|art deco|cyberpunk|minimalist|vintage|retro|modern/i.test(t)) {
    matched.push('אסתטיקה');
    pts += 7;
  } else missing.push('התייחסות אסתטית');
  return { key, maxPoints, tipHe, score: Math.min(15, pts), matched, missing };
}

function scoreVisualComposition(t: string): DimensionScoreChunk {
  const key = 'composition';
  const maxPoints = 12;
  const tipHe = 'הוסף זווית מצלמה, מסגור, ויחס גובה-רוחב';
  const matched: string[] = [];
  const missing: string[] = [];
  let pts = 0;
  if (/close-up|wide shot|aerial|medium shot|full body|low angle|high angle|תקריב|זווית/i.test(t)) {
    matched.push('סוג צילום');
    pts += 4;
  } else missing.push('סוג צילום');
  if (/rule of thirds|centered|symmetr|diagonal|foreground|background|depth|bokeh|שדה|רקע/i.test(t)) {
    matched.push('קומפוזיציה');
    pts += 4;
  } else missing.push('מסגור');
  if (/--ar\s*\d+:\d+|aspect\s*ratio|\d+:\d+\s*(ratio|aspect)|portrait|landscape|square|vertical|horizontal|פורטרט|אופקי|אנכי|ריבועי|יחס/i.test(t)) {
    matched.push('יחס גובה־רוחב');
    pts += 4;
  } else missing.push('יחס גובה־רוחב');
  return { key, maxPoints, tipHe, score: Math.min(12, pts), matched, missing };
}

function scoreVisualLighting(t: string): DimensionScoreChunk {
  const key = 'lighting';
  const maxPoints = 15;
  const tipHe = 'תאר תאורה (שעת זהב, סטודיו, ניאון, כיוון האור)';
  const matched: string[] = [];
  const missing: string[] = [];
  let pts = 0;
  if (/golden hour|sunset|sunrise|natural light|studio|neon|backlight|rim light|volumetric|שעת זהב|תאורה|אור/i.test(t)) {
    matched.push('סוג תאורה');
    pts += 8;
  } else missing.push('סוג תאורה');
  if (/soft|hard|dramatic|warm|cool|diffused|shadow|contrast|high key|low key|רך|חם|קר|דרמטי/i.test(t)) {
    matched.push('איכות אור');
    pts += 7;
  } else missing.push('מצב אור');
  return { key, maxPoints, tipHe, score: Math.min(15, pts), matched, missing };
}

function scoreVisualColor(t: string): DimensionScoreChunk {
  const key = 'color';
  const maxPoints = 10;
  const tipHe = 'ציין פלטת צבעים ואווירה';
  const matched: string[] = [];
  const missing: string[] = [];
  let pts = 0;
  if (/red|blue|green|yellow|purple|orange|amber|teal|crimson|magenta|ciano|#[0-9a-f]{3,6}|אדום|כחול|ירוק/i.test(t)) {
    matched.push('צבעים ספציפיים');
    pts += 5;
  } else missing.push('פלטת צבעים');
  if (/mood|atmosphere|vibe|feeling|cinematic|אווירה|מצב רוח|קולנועי/i.test(t)) {
    matched.push('אווירה');
    pts += 5;
  } else missing.push('אווירה');
  return { key, maxPoints, tipHe, score: Math.min(10, pts), matched, missing };
}

function scoreVisualQuality(t: string): DimensionScoreChunk {
  const key = 'quality';
  const maxPoints = 10;
  const tipHe = 'הוסף מפרטים טכניים (רזולוציה, עדשה, engine, prompt weights)';
  const matched: string[] = [];
  const missing: string[] = [];
  let pts = 0;
  if (/4k|8k|hdr|masterpiece|best quality|highly detailed|professional|ultra|premium/i.test(t)) {
    matched.push('דגלי איכות');
    pts += 3;
  } else missing.push('איכות');
  if (/sony|canon|nikon|leica|arri|85mm|50mm|35mm|f\/\d|octane|unreal|redshift/i.test(t)) {
    matched.push('מצלמה / מנוע');
    pts += 3;
  } else missing.push('מפרט טכני');
  if (/\(\s*[^)]+:\s*[\d.]+\s*\)/i.test(t)) {
    matched.push('משקלים (word:n)');
    pts += 2;
  }
  if (/(negative\s*prompt|no\s+\w+|without\s+\w+|ללא|בלי)\s*:?\s*[\w\u0590-\u05FF,\s]+/i.test(t)) {
    matched.push('negative prompt');
    pts += 2;
  } else {
    missing.push('מה לא לרנדר');
  }
  return { key, maxPoints, tipHe, score: Math.min(10, pts), matched, missing };
}

function scoreVisualMotion(t: string): DimensionScoreChunk {
  const key = 'motion';
  const maxPoints = 13;
  const tipHe = 'הוסף תנועת מצלמה, תנועת נושא והשפעות סביבתיות';
  const matched: string[] = [];
  const missing: string[] = [];
  let pts = 0;
  if (/dolly|pan|tracking|zoom|crane|handheld|steadicam|orbit|תנועת מצלמה/i.test(t)) {
    matched.push('תנועת מצלמה');
    pts += 5;
  } else missing.push('תנועת מצלמה');
  if (/walks|runs|jumps|glides|sprints|rises|falls|turns|הולך|רץ|קופץ/i.test(t)) {
    matched.push('תנועת נושא');
    pts += 4;
  } else missing.push('פעלים של נושא');
  if (/rain|snow|smoke|dust|particles|mist|wind|fog|גשם|שלג|ערפל/i.test(t)) {
    matched.push('תנועה סביבתית');
    pts += 4;
  } else missing.push('תנועה סביבתית');
  return { key, maxPoints, tipHe, score: Math.min(13, pts), matched, missing };
}

export function scoreEnhancedVisualDimensions(t: string, wordCount: number, isVideo: boolean): DimensionScoreChunk[] {
  const dims = [
    scoreVisualLength(wordCount),
    scoreVisualSubject(t),
    scoreVisualStyle(t),
    scoreVisualComposition(t),
    scoreVisualLighting(t),
    scoreVisualColor(t),
    scoreVisualQuality(t),
  ];
  if (isVideo) dims.push(scoreVisualMotion(t));
  return dims;
}

export function enhancedTotalFromChunks(chunks: DimensionScoreChunk[]): number {
  const raw = chunks.reduce((s, c) => s + c.score, 0);
  const max = chunks.reduce((s, c) => s + c.maxPoints, 0);
  return max > 0 ? Math.min(100, Math.round((raw / max) * 100)) : 0;
}

/** Ratio 0..1 for a dimension key — used by InputScorer when keys align with enhanced text dims */
export function scoreRatioForEnhancedTextKey(key: string, t: string, wc: number): number | null {
  const chunks = scoreEnhancedTextDimensions(t, wc);
  const c = chunks.find((x) => x.key === key);
  if (!c) return null;
  return c.score / c.maxPoints;
}

/** One-line weakness for summary (avoids repeating the same tip as dimension rows) */
export function weaknessSummaryLineHe(chunk: DimensionScoreChunk): string {
  const lab = DIMENSION_LABEL_HE[chunk.key] ?? chunk.key;
  if (chunk.missing[0]) return `${lab} — ${chunk.missing[0]}`;
  return `${lab} — פער נקודות`;
}

/** One-line strength in Hebrew */
export function strengthSummaryLineHe(chunk: DimensionScoreChunk): string {
  const lab = DIMENSION_LABEL_HE[chunk.key] ?? chunk.key;
  if (chunk.matched.length === 0) return lab;
  return `${lab}: ${chunk.matched.slice(0, 3).join(' · ')}`;
}
