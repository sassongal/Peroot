/**
 * Shared prompt parsing + signal detectors for InputScorer and prompt-dimensions.
 */

export type SectionType =
  | "role"
  | "task"
  | "context"
  | "audience"
  | "goal"
  | "format"
  | "constraints"
  | "examples"
  | "sources"
  | "method"
  | "confidence"
  | "falsifiability"
  | "info_gaps"
  | "tools"
  | "boundaries"
  | "inputs_outputs"
  | "policies"
  | "failure_modes";

export type Parsed = {
  text: string;
  lower: string;
  wordCount: number;
  lines: string[];
  sections: Set<SectionType>;
};

const HEADING_RE = /(?:^|\n)\s*#{1,6}\s+([^\n]+)/g;
const LABEL_RE = /(?:^|\n)\s*([\p{L}][\p{L}\p{Zs}_/\-]{1,40}?)\s*[:：\-–—]\s+/gu;

const SECTION_KEYWORDS: Array<[SectionType, RegExp]> = [
  ["role", /\b(role|persona|identity)\b|תפקיד|פרסונה|זהות/i],
  ["task", /\b(task|mission|objective)\b|משימה|מטלה|דרישה/i],
  ["audience", /\b(audience|target|readers?)\b|קהל\s?יעד|קהל|לקוחות/i],
  ["goal", /\b(goal|objective|purpose)\b|מטרה|יעד/i],
  ["context", /\b(context|background|situation)\b|הקשר|רקע|סיטואציה/i],
  ["format", /\b(format|structure|output|response\s*format|schema)\b|פורמט|מבנה\s+פלט|פלט/i],
  [
    "constraints",
    /\b(constraints?|limits?|do\s*not|don'?ts?|restrictions?)\b|מגבלות|אילוצים|איסורים|הגבלות|כללים\s+שליליים/i,
  ],
  [
    "examples",
    /\b(examples?|samples?|few[-\s]?shot|sample\s+output|demonstrations?)\b|דוגמה|דוגמאות|few.?shot/i,
  ],
  [
    "sources",
    /\b(sources?|citations?|references?|bibliography)\b|מקורות|ציטוטים|ביבליוגרפיה|דרישות\s+מקור/i,
  ],
  [
    "method",
    /\b(method(ology)?|steps?|approach|framework|protocol|procedure)\b|מתודולוגיה|שלבים|גישה|תהליך|פרוטוקול/i,
  ],
  ["confidence", /\b(confidence|certainty|reliability\s+score)\b|ביטחון|ודאות|מהימנות/i],
  ["falsifiability", /\b(falsifiability|counter[-\s]?examples?|disconfirmation)\b|הפרכה|ניפוץ/i],
  [
    "info_gaps",
    /\b(info(rmation)?\s*gaps?|unknowns?|missing\s+data|open\s+questions?)\b|פערי\s?מידע|חוסרי\s?מידע/i,
  ],
  ["tools", /\b(tools?|apis?|functions?|integrations?|capabilities)\b|כלים|יכולות|ממשקים/i],
  ["boundaries", /\b(boundaries|scope|escalation|handoff|out\s+of\s+scope)\b|גבולות|תחום|העברה/i],
  [
    "inputs_outputs",
    /\b(input\/output|i\/o|inputs?|outputs?|schema|signature|contract)\b|קלט\/?פלט|קלט|סכמה/i,
  ],
  ["policies", /\b(polic(y|ies)|guidelines?|rules?|guardrails?)\b|מדיניות|הנחיות|חוקים/i],
  [
    "failure_modes",
    /\b(failure\s*modes?|errors?|edge\s*cases?|exceptions?|retries?)\b|מצבי\s?כשל|שגיאות|מקרי\s?קצה|חריגים/i,
  ],
];

function extractSections(text: string): Set<SectionType> {
  const found = new Set<SectionType>();
  if (!text) return found;

  const tryMatch = (label: string) => {
    for (const [type, re] of SECTION_KEYWORDS) {
      if (found.has(type)) continue;
      if (re.test(label)) found.add(type);
    }
  };

  for (const m of text.matchAll(HEADING_RE)) {
    tryMatch(m[1]);
  }

  for (const m of text.matchAll(LABEL_RE)) {
    tryMatch(m[1]);
  }

  return found;
}

export function parse(text: string): Parsed {
  const trimmed = text.trim();
  return {
    text: trimmed,
    lower: trimmed.toLowerCase(),
    wordCount: trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0,
    lines: trimmed.split(/\n+/).filter((l) => l.trim().length > 0),
    sections: extractSections(trimmed),
  };
}

export const HEBREW_ROLE_RE = /(?:^|\n|\.\s|:\s)אתה\s+([א-ת]{3,}(?:\s+[א-ת]+){0,3})/;
export const ENGLISH_ROLE_RE =
  /(?:^|\n|\.\s|:\s)you\s+are\s+(?:an?\s+)?([a-z]+(?:\s+[a-z]+){0,3})/i;

export function hasRoleStatement(p: Parsed): boolean {
  return HEBREW_ROLE_RE.test(p.text) || ENGLISH_ROLE_RE.test(p.text);
}

export function hasRoleMention(p: Parsed): boolean {
  if (p.sections.has("role")) return true;
  return /מומחה|יועץ|מנהל|אנליסט|מתכנת|עורך|כותב|סופר|חוקר|מעצב|אסטרטג|יועצת|מנהלת|אדריכל|רופא|עורך[-\s]דין|expert|specialist|analyst|consultant|writer|engineer|developer|designer|researcher|strategist|marketer|advisor|adviser|manager|director|scientist|doctor|lawyer|architect|editor|teacher|coach|copywriter/i.test(
    p.text,
  );
}

/** Unified task verbs — keep in sync with prompt-dimensions task scoring */
export const TASK_VERBS_RE =
  /כתוב|צור|בנה|נסח|הכן|תכנן|ערוך|סכם|תרגם|נתח|השווה|חקור|בצע|הסבר|תאר|פרט|סקור|בדוק|יישם|תעד|הפק|חבר|פרסם|הצע|המלץ|הנחה|פתח|שפר|write|create|build|draft|prepare|plan|edit|summarize|translate|analyze|analyse|compare|generate|design|research|explain|describe|list|outline|review|evaluate|assess|debug|refactor|document|test|implement|investigate|propose|recommend|optimize/i;

export function hasTaskVerb(p: Parsed): boolean {
  return TASK_VERBS_RE.test(p.text);
}

export function hasTaskVerbWithObject(p: Parsed): boolean {
  return (
    // Hebrew: verb + optional particle (את/ל/ב/של/עבור) + object (2+ chars)
    // "כתוב את המאמר", "צור לי רשימה", "בנה עבור הקהל" all match
    /(?:כתוב|צור|בנה|נסח|נתח|חקור|השווה|הסבר|תאר|סקור|בדוק|יישם|הפק|חבר|פרסם|הצע|המלץ)\s+(?:(?:את|של|עבור|ל|מ)\s+)?\S{2,}/i.test(
      p.text,
    ) ||
    /(?:write|create|build|analy[sz]e|research|compare|explain|describe|outline|review|evaluate|assess|refactor|implement|investigate|generate|design|draft|summari[sz]e|translate|document|test|optimi[sz]e|propose|recommend)\s+(?:an?\s+|the\s+)?\S{3,}/i.test(
      p.text,
    )
  );
}

export function hasOutputFormat(p: Parsed): boolean {
  if (p.sections.has("format")) return true;
  return /פורמט|מבנה|טבלה|רשימה|json|csv|markdown|bullet|כותרת|סעיפים|פסקאות|format|structure|table|list/i.test(
    p.text,
  );
}

export function hasLengthSpec(p: Parsed): boolean {
  return /\d+\s*(מילים|שורות|נקודות|פסקאות|עמודים|פריטים|words|sentences|lines|paragraphs|pages|chars|characters|tokens|bullets|items)|קצר|ארוך|מפורט|תמציתי|short|long|lengthy|detailed|verbose|brief|concise/i.test(
    p.text,
  );
}

export function hasNegativeConstraints(p: Parsed): boolean {
  if (p.sections.has("constraints")) return true;
  return /אל\s+ת|ללא|בלי|אסור|אין\s+ל|avoid|don['']?t|do\s+not|never|without/i.test(p.text);
}

const HEBREW_NUMBER_WORDS =
  /(?:שת[יי]ם?|שלוש(?:ה)?|ארבע(?:ה)?|חמש(?:ה)?|שש(?:ה)?|שבע(?:ה)?|שמונ(?:ה)?|תשע(?:ה)?|עשר(?:ה)?|עשרים|שלושים|ארבעים|חמישים|שישים|שבעים|שמונים|תשעים|מאה|מאתיים)/i;

export const TASK_QTY_RE =
  /(?:\d+|(?:שת[יי]ם?|שלוש(?:ה)?|ארבע(?:ה)?|חמש(?:ה)?|שש(?:ה)?|שבע(?:ה)?|שמונ(?:ה)?|תשע(?:ה)?|עשר(?:ה)?|עשרים|שלושים|ארבעים|חמישים|שישים|שבעים|שמונים|תשעים|מאה))\s*(מילים|שורות|נקודות|פסקאות|סעיפים|דקות|שניות|פריטים|עמודים|words|sentences|lines|points|bullets|paragraphs|items|steps|minutes|seconds|chars|characters|tokens|pages|sections)/i;

// HEBREW_NUMBER_WORDS is internal only

export function hasMeasurableQuantity(p: Parsed): boolean {
  return TASK_QTY_RE.test(p.text);
}

export function hasLooseNumber(p: Parsed): boolean {
  return /\d+/.test(p.text) && !TASK_QTY_RE.test(p.text);
}

export function hasExampleBlock(p: Parsed): boolean {
  if (p.sections.has("examples")) return true;
  if (/["""״].{10,}["""״]/.test(p.text)) return true;
  if (/(?:^|\n)\s*(?:דוגמה|לדוגמה|example|e\.g\.)\s*[:：]/i.test(p.text)) return true;
  return false;
}

export function hasSpecificityProperNouns(p: Parsed): boolean {
  return /\b[A-Z][a-z]{2,}\b/.test(p.text) || /["""״].{2,}["""״]/.test(p.text);
}

export function hasStructure(p: Parsed): boolean {
  if (p.lines.length >= 3) return true;
  return /(?:^|\n)\s*(?:[-*•]|\d+\.)\s+/.test(p.text);
}

const BUZZWORDS_RE =
  /איכותי|חדשני|מעולה|מצוין|פורץ\s+דרך|מהפכני|מתקדם|ברמה\s+(?:עולמית|גבוהה)|באופן\s+מקצועי\s+ומקיף|תוכן\s+איכותי\s+ומעולה|world[-\s]?class|cutting[-\s]?edge|state[-\s]?of[-\s]?the[-\s]?art|next[-\s]?gen|premium|amazing|revolutionary|innovative|disruptive|game[-\s]?changing|best[-\s]?in[-\s]?class|top[-\s]?tier|outstanding|superior|excellent|unparalleled|seamless|robust|powerful|leading/i;

const BUZZWORDS_RE_G = new RegExp(BUZZWORDS_RE.source, "ig");

export function hasBuzzwords(p: Parsed): boolean {
  return BUZZWORDS_RE.test(p.text);
}

export function countBuzzwords(p: Parsed): number {
  const matches = p.text.match(BUZZWORDS_RE_G);
  return matches ? matches.length : 0;
}

export function hasHedges(p: Parsed): boolean {
  return /אולי|אפשר|אם\s+אפשר|בערך|נדמה|ייתכן|maybe|perhaps|possibly|probably|might|could\s+be|somewhat|kind\s+of|sort\s+of|i\s+think|i\s+guess|it\s+seems/i.test(
    p.text,
  );
}

/**
 * Structural contradictions (table/list). Brevity vs length is handled in
 * prompt-dimensions safety scoring to avoid false positives with "מפורט".
 */
const CONTRADICTION_PAIRS: Array<[RegExp, RegExp, string]> = [
  [
    /(?:בלי|ללא|without|no)\s*טבלה|no\s+table/i,
    /בטבלה|in\s+a?\s*table|table\s+format/i,
    "no-table vs in-a-table",
  ],
  [
    /(?:בלי|ללא|no|without)\s*(?:רשימ|list|bullets)/i,
    /רשימה\s+של|list\s+of|bullet\s+points/i,
    "no-list vs list-of",
  ],
];

export function hasContradictions(p: Parsed): boolean {
  const isShort = /קצר|תמציתי|קצרצר|short|brief|concise|terse/i.test(p.text);
  const longNumberMatch = p.text.match(/(\d{3,})\s*(מילים|words)/i);
  if (isShort && longNumberMatch) {
    const n = parseInt(longNumberMatch[1], 10);
    if (n >= 500) return true;
  }
  const wantsBrief = /(?:^|[^\p{L}])(קצר|תמציתי|short|brief|concise|terse)(?:[^\p{L}]|$)/iu.test(
    p.text,
  );
  const wantsLongForm = /comprehensive|extensive|מקיף|מפורט\s+במיוחד|הרחבה\s+נרחבת/i.test(p.text);
  if (wantsBrief && wantsLongForm) return true;
  if (/ללא\s+(\w+)[\s\S]*חייב\s+\1/i.test(p.text)) return true;
  if (/without\s+(\w+)[\s\S]*must\s+\1/i.test(p.text)) return true;
  for (const [a, b] of CONTRADICTION_PAIRS) {
    if (a.test(p.text) && b.test(p.text)) return true;
  }
  return false;
}

export function hasSourcesRequirement(p: Parsed): boolean {
  if (p.sections.has("sources")) return true;
  return /מקורות|צטט|ציטוט|cite|citation|url|reference|בבליוגרפי|אימות|fact.?check|verify|verification/i.test(
    p.text,
  );
}

export function hasMethodology(p: Parsed): boolean {
  if (p.sections.has("method")) return true;
  return /שלבים|מתודולוגיה|framework|steps|method|גישה|תהליך|protocol|procedure/i.test(p.text);
}

export function hasConfidenceProtocol(p: Parsed): boolean {
  if (p.sections.has("confidence")) return true;
  return /confidence|ביטחון|רמת\s+ודאות|ודאות|certainty|probability|likelihood/i.test(p.text);
}

export function hasFalsifiability(p: Parsed): boolean {
  if (p.sections.has("falsifiability")) return true;
  return /יפריך|מפריך|falsif|counter[-\s]?example|מה\s+(לא\s+)?נכון|disconfirm/i.test(p.text);
}

export function hasInfoGaps(p: Parsed): boolean {
  if (p.sections.has("info_gaps")) return true;
  return /פערי?\s+מידע|info\s+gaps?|unknowns?|חסר\s+מידע|missing\s+data|data\s+gap/i.test(p.text);
}

export function hasMECE(p: Parsed): boolean {
  return /mece|ממצה\s+וזרה|mutually\s+exclusive|collectively\s+exhaustive/i.test(p.text);
}

export function hasToolsSpec(p: Parsed): boolean {
  if (p.sections.has("tools")) return true;
  return /כלים|tools|api|integration|function\s+calling|ממשק/i.test(p.text);
}

export function hasBoundaries(p: Parsed): boolean {
  if (p.sections.has("boundaries")) return true;
  return /גבולות|boundary|boundaries|scope|escalat|fallback|handoff|העברה/i.test(p.text);
}

export function hasInputsOutputs(p: Parsed): boolean {
  if (p.sections.has("inputs_outputs")) return true;
  return /קלט|פלט|inputs?|outputs?|schema|מבנה\s+תשובה|response\s+format/i.test(p.text);
}

export function hasPolicies(p: Parsed): boolean {
  if (p.sections.has("policies")) return true;
  return /מדיניות|policy|policies|rules|חוקים|guidelines|הנחיות/i.test(p.text);
}

export function hasFailureModes(p: Parsed): boolean {
  if (p.sections.has("failure_modes")) return true;
  return /כשל|שגיאה|failure|error|edge\s+case|מקרי\s+קצה|exception/i.test(p.text);
}

export function hasImageSubject(p: Parsed): boolean {
  return p.wordCount >= 3 && /\b([א-ת]{3,}|[A-Za-z]{3,})\b/.test(p.text);
}

export function hasImageStyle(p: Parsed): boolean {
  return /סגנון|מינימליסטי|ריאליסטי|אנימציה|צילום|ציור|איור|ציור\s*שמן|תלת\s*מימד|קולנועי|קריקטורה|מנגה|גרפי|מופשט|פסטל|סטודיו|illustration|painting|photography|render|3d|cinematic|cartoon|anime|watercolor|oil\s+paint|sketch|digital\s+art/i.test(
    p.text,
  );
}

export function hasImageComposition(p: Parsed): boolean {
  return /קומפוזיציה|מסגור|תקריב|פריים|שדה\s*ראייה|ראש\s*כתפיים|מלא\s*גוף|עין\s*ציפור|זווית\s*נמוכה|זווית\s*גבוהה|close[-\s]?up|wide\s+shot|portrait|landscape|low\s+angle|high\s+angle|symmetry|rule\s+of\s+thirds/i.test(
    p.text,
  );
}

export function hasAspectRatio(p: Parsed): boolean {
  return /\b\d{1,2}:\d{1,2}\b|aspect|יחס\s+גובה|ריבוע|פורטרט|landscape|square/i.test(p.text);
}

export function hasImageLighting(p: Parsed): boolean {
  return /תאורה|שעת\s*זהב|ניאון|קרני\s+שמש|שקיעה|זריחה|נר|פנס|להב|אור\s*(?:בוקר|ערב|לילה|ירח|שמש|נר|ניאון|רך|קשה|חם|קר|דרמטי|עדין|טבעי|אחורי)|אש\s*בוערת|אור\s*חלון|lighting|soft\s+light|hard\s+light|golden\s+hour|rim\s+light|rembrandt|ambient|backlit|studio\s+light/i.test(
    p.text,
  );
}

export function hasImageColor(p: Parsed): boolean {
  return /צבע|גוון|פלטה|זהב|כסף|אדום|כחול|ירוק|צהוב|כתום|סגול|ורוד|חום|שחור|לבן|אפור|טורקיז|זהוב|כסוף|בורדו|זית|בז|חאקי|תכלת|לילך|מנטה|קורל|שזוף|כרם|מונוכרום|palette|monochrom|pastel|vibrant|muted|warm|cool|black\s+and\s+white/i.test(
    p.text,
  );
}

export function hasImageQuality(p: Parsed): boolean {
  return /רזולוציה|חדות|איכות\s*גבוהה|מפורט|עשיר|מקצועי|ריאליסטי\s*במיוחד|4k|8k|hd|hyper[-\s]?real|ultra\s+detailed|sharp|photorealistic|high\s+detail|masterpiece|best\s+quality/i.test(
    p.text,
  );
}

export function hasImageNegative(p: Parsed): boolean {
  return /ללא|בלי|avoid|no\s+\w+|negative\s+prompt|exclude/i.test(p.text);
}

/** Chain-of-thought / step-by-step reasoning instructions */
export function hasChainOfThought(p: Parsed): boolean {
  return /(?:let'?s\s+)?think\s+step[\s-]by[\s-]step|chain[\s-]of[\s-]thought|step[\s-]by[\s-]step\s+(?:reasoning|thinking|analysis)|think\s+through|reason\s+through|שלב\s+אחר\s+שלב|נחשוב\s+שלב|תחשוב\s+שלב|צעד\s+אחר\s+צעד|פרק\s+לשלבים|נתח\s+שלב/i.test(
    p.text,
  );
}

export function hasVideoMotion(p: Parsed): boolean {
  return /תנועה|מצלמה\s*נעה|מסתובב|מתקרב|מתרחק|מרחף|קופץ|רץ|עף|מתנדנד|גלים|אש\s*בוערת|עשן|מים\s*זורמים|סלואו\s?מושן|טייס|pan|tilt|zoom|dolly|tracking|motion|movement|flying|running|drone|slow\s?motion/i.test(
    p.text,
  );
}
