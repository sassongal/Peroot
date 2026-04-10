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
 * `BaseEngine.scorePrompt` is kept untouched for telemetry compatibility.
 */
import { CapabilityMode } from '@/lib/capability-mode';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InputScoreLevel = 'empty' | 'low' | 'medium' | 'high' | 'elite';

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
}

// ---------------------------------------------------------------------------
// Shared parsers / signal detectors
// ---------------------------------------------------------------------------

/**
 * Section types detectable via markdown headings or labeled lines.
 * Acts as a structural signal that *supplements* the existing flat-text
 * regex detectors — never replaces them. Used to catch false negatives when
 * a prompt is well-structured but uses wording that loose regex missed.
 */
type SectionType =
  | 'role'
  | 'task'
  | 'context'
  | 'audience'
  | 'goal'
  | 'format'
  | 'constraints'
  | 'examples'
  | 'sources'
  | 'method'
  | 'confidence'
  | 'falsifiability'
  | 'info_gaps'
  | 'tools'
  | 'boundaries'
  | 'inputs_outputs'
  | 'policies'
  | 'failure_modes';

type Parsed = {
  text: string;
  lower: string;
  wordCount: number;
  lines: string[];
  sections: Set<SectionType>;
};

// Heading line:   "## Examples", "### דוגמאות", "# Tools"
const HEADING_RE = /(?:^|\n)\s*#{1,6}\s+([^\n]+)/g;
// Label line:     "תפקיד:", "Examples:", "Tools —", "מטרה –"
const LABEL_RE = /(?:^|\n)\s*([\p{L}][\p{L}\p{Zs}_/\-]{1,40}?)\s*[:：\-–—]\s+/gu;

// Keyword → section type mapping. Each value is an array of lowercase hebrew/
// english substrings that, if present in the heading/label, mark that section.
const SECTION_KEYWORDS: Array<[SectionType, RegExp]> = [
  ['role', /\b(role|persona|identity)\b|תפקיד|פרסונה|זהות/i],
  ['task', /\b(task|mission|objective)\b|משימה|מטלה|דרישה/i],
  ['audience', /\b(audience|target|readers?)\b|קהל\s?יעד|קהל|לקוחות/i],
  ['goal', /\b(goal|objective|purpose)\b|מטרה|יעד/i],
  ['context', /\b(context|background|situation)\b|הקשר|רקע|סיטואציה/i],
  ['format', /\b(format|structure|output|response\s*format|schema)\b|פורמט|מבנה\s+פלט|פלט/i],
  ['constraints', /\b(constraints?|limits?|do\s*not|don'?ts?|restrictions?)\b|מגבלות|אילוצים|איסורים|הגבלות|כללים\s+שליליים/i],
  ['examples', /\b(examples?|samples?|few[-\s]?shot|sample\s+output|demonstrations?)\b|דוגמה|דוגמאות|few.?shot/i],
  ['sources', /\b(sources?|citations?|references?|bibliography)\b|מקורות|ציטוטים|ביבליוגרפיה|דרישות\s+מקור/i],
  ['method', /\b(method(ology)?|steps?|approach|framework|protocol|procedure)\b|מתודולוגיה|שלבים|גישה|תהליך|פרוטוקול/i],
  ['confidence', /\b(confidence|certainty|reliability\s+score)\b|ביטחון|ודאות|מהימנות/i],
  ['falsifiability', /\b(falsifiability|counter[-\s]?examples?|disconfirmation)\b|הפרכה|ניפוץ/i],
  ['info_gaps', /\b(info(rmation)?\s*gaps?|unknowns?|missing\s+data|open\s+questions?)\b|פערי\s?מידע|חוסרי\s?מידע/i],
  ['tools', /\b(tools?|apis?|functions?|integrations?|capabilities)\b|כלים|יכולות|ממשקים/i],
  ['boundaries', /\b(boundaries|scope|escalation|handoff|out\s+of\s+scope)\b|גבולות|תחום|העברה/i],
  ['inputs_outputs', /\b(input\/output|i\/o|inputs?|outputs?|schema|signature|contract)\b|קלט\/?פלט|קלט|סכמה/i],
  ['policies', /\b(polic(y|ies)|guidelines?|rules?|guardrails?)\b|מדיניות|הנחיות|חוקים/i],
  ['failure_modes', /\b(failure\s*modes?|errors?|edge\s*cases?|exceptions?|retries?)\b|מצבי\s?כשל|שגיאות|מקרי\s?קצה|חריגים/i],
];

/**
 * Extract structural sections from a prompt. Detects both markdown headings
 * (`## Examples`) and labeled lines (`דוגמה:`, `Tools —`). Returns a Set of
 * detected section types. O(n) over the text; safe for live scoring.
 */
function extractSections(text: string): Set<SectionType> {
  const found = new Set<SectionType>();
  if (!text) return found;

  const tryMatch = (label: string) => {
    for (const [type, re] of SECTION_KEYWORDS) {
      if (found.has(type)) continue;
      if (re.test(label)) found.add(type);
    }
  };

  // Markdown headings
  for (const m of text.matchAll(HEADING_RE)) {
    tryMatch(m[1]);
  }

  // Label-colon lines (only at line start, so "דוגמה: foo" matches but
  // mid-sentence "כמו למשל: foo" does not)
  for (const m of text.matchAll(LABEL_RE)) {
    tryMatch(m[1]);
  }

  return found;
}

function parse(text: string): Parsed {
  const trimmed = text.trim();
  return {
    text: trimmed,
    lower: trimmed.toLowerCase(),
    wordCount: trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0,
    lines: trimmed.split(/\n+/).filter((l) => l.trim().length > 0),
    sections: extractSections(trimmed),
  };
}

/**
 * Structural role: requires `אתה <noun>` or `you are <noun>` at the start of a
 * line/sentence, not just anywhere. "אתה יודע ש..." should NOT match.
 */
const HEBREW_ROLE_RE = /(?:^|\n|\.\s|:\s)אתה\s+([א-ת]{3,}(?:\s+[א-ת]+){0,3})/;
const ENGLISH_ROLE_RE = /(?:^|\n|\.\s|:\s)you\s+are\s+(?:an?\s+)?([a-z]+(?:\s+[a-z]+){0,3})/i;

function hasRoleStatement(p: Parsed): boolean {
  return HEBREW_ROLE_RE.test(p.text) || ENGLISH_ROLE_RE.test(p.text);
}

function hasRoleMention(p: Parsed): boolean {
  if (p.sections.has('role')) return true;
  return /מומחה|יועץ|מנהל|אנליסט|מתכנת|עורך|כותב|סופר|חוקר|מעצב|אסטרטג|יועצת|מנהלת|אדריכל|רופא|עורך[-\s]דין|expert|specialist|analyst|consultant|writer|engineer|developer|designer|researcher|strategist|marketer|advisor|adviser|manager|director|scientist|doctor|lawyer|architect|editor|teacher|coach|copywriter/i.test(
    p.text
  );
}

const TASK_VERBS_RE =
  /כתוב|צור|בנה|נסח|הכן|תכנן|ערוך|סכם|תרגם|נתח|השווה|חקור|בצע|הסבר|תאר|פרט|סקור|בדוק|יישם|תעד|write|create|build|draft|prepare|plan|edit|summarize|translate|analyze|analyse|compare|generate|design|research|explain|describe|list|outline|review|evaluate|assess|debug|refactor|document|test|implement|investigate|propose|recommend|optimize/i;

function hasTaskVerb(p: Parsed): boolean {
  return TASK_VERBS_RE.test(p.text);
}

function hasTaskVerbWithObject(p: Parsed): boolean {
  return /(?:כתוב|צור|בנה|נסח|נתח|חקור|השווה|הסבר|תאר|סקור|בדוק|יישם)\s+\S{3,}/i.test(p.text) ||
    /(?:write|create|build|analy[sz]e|research|compare|explain|describe|outline|review|evaluate|assess|refactor|implement|investigate|generate|design|draft|summari[sz]e|translate|document|test|optimi[sz]e|propose|recommend)\s+(?:an?\s+|the\s+)?\S{3,}/i.test(p.text);
}

function hasOutputFormat(p: Parsed): boolean {
  if (p.sections.has('format')) return true;
  return /פורמט|מבנה|טבלה|רשימה|json|csv|markdown|bullet|כותרת|סעיפים|פסקאות|format|structure|table|list/i.test(
    p.text
  );
}

function hasLengthSpec(p: Parsed): boolean {
  return /\d+\s*(מילים|שורות|נקודות|פסקאות|עמודים|פריטים|words|sentences|lines|paragraphs|pages|chars|characters|tokens|bullets|items)|קצר|ארוך|מפורט|תמציתי|short|long|lengthy|detailed|verbose|brief|concise/i.test(
    p.text
  );
}

function hasNegativeConstraints(p: Parsed): boolean {
  if (p.sections.has('constraints')) return true;
  return /אל\s+ת|ללא|בלי|אסור|אין\s+ל|avoid|don['']?t|do\s+not|never|without/i.test(p.text);
}

const TASK_QTY_RE =
  /\d+\s*(מילים|שורות|נקודות|פסקאות|סעיפים|דקות|שניות|פריטים|עמודים|words|sentences|lines|points|bullets|paragraphs|items|steps|minutes|seconds|chars|characters|tokens|pages|sections)/i;

function hasMeasurableQuantity(p: Parsed): boolean {
  return TASK_QTY_RE.test(p.text);
}

function hasLooseNumber(p: Parsed): boolean {
  return /\d+/.test(p.text) && !TASK_QTY_RE.test(p.text);
}

function hasExampleBlock(p: Parsed): boolean {
  // Section heading like "## דוגמאות" or "### Examples"
  if (p.sections.has('examples')) return true;
  // Multi-line example, quoted block, or an explicit "דוגמה:" on its own line
  if (/["""״].{10,}["""״]/.test(p.text)) return true;
  if (/(?:^|\n)\s*(?:דוגמה|לדוגמה|example|e\.g\.)\s*[:：]/i.test(p.text)) return true;
  return false;
}

function hasSpecificityProperNouns(p: Parsed): boolean {
  // Proper nouns (English caps) or quoted names
  return /\b[A-Z][a-z]{2,}\b/.test(p.text) || /["""״].{2,}["""״]/.test(p.text);
}

function hasStructure(p: Parsed): boolean {
  // Line breaks, bullet markers, headings
  if (p.lines.length >= 3) return true;
  return /(?:^|\n)\s*(?:[-*•]|\d+\.)\s+/.test(p.text);
}

const BUZZWORDS_RE =
  /איכותי|חדשני|מעולה|מצוין|פורץ\s+דרך|מהפכני|מתקדם|ברמה\s+(?:עולמית|גבוהה)|באופן\s+מקצועי\s+ומקיף|תוכן\s+איכותי\s+ומעולה|world[-\s]?class|cutting[-\s]?edge|state[-\s]?of[-\s]?the[-\s]?art|next[-\s]?gen|premium|amazing|revolutionary|innovative|disruptive|game[-\s]?changing|best[-\s]?in[-\s]?class|top[-\s]?tier|outstanding|superior|excellent|unparalleled|seamless|robust|powerful|leading/i;

// Global-flag version for counting all matches
const BUZZWORDS_RE_G = new RegExp(BUZZWORDS_RE.source, 'ig');

function hasBuzzwords(p: Parsed): boolean {
  return BUZZWORDS_RE.test(p.text);
}

/** Count total buzzword matches for graduated penalties. */
function countBuzzwords(p: Parsed): number {
  const matches = p.text.match(BUZZWORDS_RE_G);
  return matches ? matches.length : 0;
}

function hasHedges(p: Parsed): boolean {
  return /אולי|אפשר|אם\s+אפשר|בערך|נדמה|ייתכן|maybe|perhaps|possibly|probably|might|could\s+be|somewhat|kind\s+of|sort\s+of|i\s+think|i\s+guess|it\s+seems/i.test(
    p.text
  );
}

// Contradiction pairs: [signalA, signalB, label]. Any prompt that hits both
// sides of a pair is internally inconsistent. Kept in sync with
// enhanced-scorer.ts so STANDARD scoring is consistent across both engines.
const CONTRADICTION_PAIRS: Array<[RegExp, RegExp, string]> = [
  // brevity + "no table" + "in a table"
  [/(?:בלי|ללא|without|no)\s*טבלה|no\s+table/i, /בטבלה|in\s+a?\s*table|table\s+format/i, 'no-table vs in-a-table'],
  // "no list" + "list of"
  [/(?:בלי|ללא|no|without)\s*(?:רשימ|list|bullets)/i, /רשימה\s+של|list\s+of|bullet\s+points/i, 'no-list vs list-of'],
  // "concise/brief" + "extensive/comprehensive/long"
  [/\b(?:קצר|תמציתי|concise|brief)\b/i, /\b(?:ארוך|מפורט\s+מאוד|extensive|comprehensive|long)\b/i, 'concise vs long'],
];

function hasContradictions(p: Parsed): boolean {
  // Explicit: "short" + a large word-count target (Hebrew OR English)
  const isShort = /קצר|תמציתי|קצרצר|short|brief|concise|terse/i.test(p.text);
  const longNumberMatch = p.text.match(/(\d{3,})\s*(מילים|words)/i);
  if (isShort && longNumberMatch) {
    const n = parseInt(longNumberMatch[1], 10);
    if (n >= 500) return true;
  }
  // Direct contradiction: "בלי X ... חייב X" / "without X ... must X"
  if (/ללא\s+(\w+)[\s\S]*חייב\s+\1/i.test(p.text)) return true;
  if (/without\s+(\w+)[\s\S]*must\s+\1/i.test(p.text)) return true;
  // Expanded pair list
  for (const [a, b] of CONTRADICTION_PAIRS) {
    if (a.test(p.text) && b.test(p.text)) return true;
  }
  return false;
}

// Research-mode signals
function hasSourcesRequirement(p: Parsed): boolean {
  if (p.sections.has('sources')) return true;
  return /מקורות|צטט|ציטוט|cite|citation|url|reference|בבליוגרפי|אימות|fact.?check|verify|verification/i.test(
    p.text
  );
}

function hasMethodology(p: Parsed): boolean {
  if (p.sections.has('method')) return true;
  return /שלבים|מתודולוגיה|framework|steps|method|גישה|תהליך|protocol|procedure/i.test(p.text);
}

function hasConfidenceProtocol(p: Parsed): boolean {
  if (p.sections.has('confidence')) return true;
  return /confidence|ביטחון|רמת\s+ודאות|ודאות|certainty|probability|likelihood/i.test(p.text);
}

function hasFalsifiability(p: Parsed): boolean {
  if (p.sections.has('falsifiability')) return true;
  return /יפריך|מפריך|falsif|counter[-\s]?example|מה\s+(לא\s+)?נכון|disconfirm/i.test(p.text);
}

function hasInfoGaps(p: Parsed): boolean {
  if (p.sections.has('info_gaps')) return true;
  return /פערי?\s+מידע|info\s+gaps?|unknowns?|חסר\s+מידע|missing\s+data|data\s+gap/i.test(p.text);
}

function hasMECE(p: Parsed): boolean {
  return /mece|ממצה\s+וזרה|mutually\s+exclusive|collectively\s+exhaustive/i.test(p.text);
}

// Agent-builder signals
function hasToolsSpec(p: Parsed): boolean {
  if (p.sections.has('tools')) return true;
  return /כלים|tools|api|integration|function\s+calling|ממשק/i.test(p.text);
}

function hasBoundaries(p: Parsed): boolean {
  if (p.sections.has('boundaries')) return true;
  return /גבולות|boundary|boundaries|scope|escalat|fallback|handoff|העברה/i.test(p.text);
}

function hasInputsOutputs(p: Parsed): boolean {
  if (p.sections.has('inputs_outputs')) return true;
  return /קלט|פלט|inputs?|outputs?|schema|מבנה\s+תשובה|response\s+format/i.test(p.text);
}

function hasPolicies(p: Parsed): boolean {
  if (p.sections.has('policies')) return true;
  return /מדיניות|policy|policies|rules|חוקים|guidelines|הנחיות/i.test(p.text);
}

function hasFailureModes(p: Parsed): boolean {
  if (p.sections.has('failure_modes')) return true;
  return /כשל|שגיאה|failure|error|edge\s+case|מקרי\s+קצה|exception/i.test(p.text);
}

// Image/Video signals
function hasImageSubject(p: Parsed): boolean {
  return p.wordCount >= 3 && /\b([א-ת]{3,}|[A-Za-z]{3,})\b/.test(p.text);
}

function hasImageStyle(p: Parsed): boolean {
  return /סגנון|מינימליסטי|ריאליסטי|אנימציה|illustration|painting|photography|render|3d|cinematic|cartoon|anime|watercolor|oil|sketch|digital\s+art|סטודיו/i.test(
    p.text
  );
}

function hasImageComposition(p: Parsed): boolean {
  return /קומפוזיציה|close[-\s]?up|wide\s+shot|portrait|landscape|low\s+angle|high\s+angle|symmetry|rule\s+of\s+thirds|מסגור|מרחק|זווית/i.test(
    p.text
  );
}

function hasAspectRatio(p: Parsed): boolean {
  return /\b\d{1,2}:\d{1,2}\b|aspect|יחס\s+גובה|ריבוע|פורטרט|landscape|square/i.test(p.text);
}

function hasImageLighting(p: Parsed): boolean {
  return /תאורה|lighting|soft\s+light|hard\s+light|golden\s+hour|rim\s+light|rembrandt|ambient|rim|backlit|studio\s+light|קרני\s+שמש|שקיעה|זריחה/i.test(
    p.text
  );
}

function hasImageColor(p: Parsed): boolean {
  return /צבע|גוון|פלטה|palette|monochrom|pastel|vibrant|muted|warm|cool|black\s+and\s+white|זהב|כסף|אדום|כחול|ירוק/i.test(
    p.text
  );
}

function hasImageQuality(p: Parsed): boolean {
  return /4k|8k|hd|hyper[-\s]?real|ultra\s+detailed|sharp|photorealistic|high\s+detail|רזולוציה|חדות|איכות\s+גבוהה/i.test(
    p.text
  );
}

function hasImageNegative(p: Parsed): boolean {
  return /ללא|בלי|avoid|no\s+\w+|negative\s+prompt|exclude/i.test(p.text);
}

function hasVideoMotion(p: Parsed): boolean {
  return /תנועה|מצלמה\s+נעה|pan|tilt|zoom|dolly|tracking|motion|movement|flying|running|drone|סלואו\s?מושן|slow\s?motion/i.test(
    p.text
  );
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
    key: 'role',
    label: 'תפקיד',
    tip: 'הגדר תפקיד/פרסונה בפתיחה: "אתה <תפקיד> עם <ניסיון/התמחות>"',
    test: (p) => {
      if (hasRoleStatement(p)) {
        const hasCreds = /\d+\s+(שנות|שנים|years)|מוסמך|בכיר|senior|expert|lead/i.test(p.text);
        return hasCreds
          ? { ratio: 1, matched: ['persona', 'credentials'], missing: [] }
          : { ratio: 0.7, matched: ['persona'], missing: ['credentials (שנות ניסיון / התמחות)'] };
      }
      if (hasRoleMention(p)) {
        return { ratio: 0.3, matched: ['role mentioned'], missing: ['"אתה …" statement'] };
      }
      return { ratio: 0, matched: [], missing: ['role definition'] };
    },
  },

  task: {
    key: 'task',
    label: 'משימה',
    tip: 'פתח בפועל פעולה ברור ואובייקט: "כתוב <מה>", "נתח <מה>"',
    test: (p) => {
      if (!hasTaskVerb(p)) return { ratio: 0, matched: [], missing: ['action verb'] };
      if (hasTaskVerbWithObject(p)) {
        return { ratio: 1, matched: ['action verb', 'specific object'], missing: [] };
      }
      return { ratio: 0.5, matched: ['action verb'], missing: ['specific object'] };
    },
  },

  context: {
    key: 'context',
    label: 'הקשר',
    tip: 'הוסף קהל יעד, מטרה עסקית, ורקע קצר',
    test: (p) => {
      const matched: string[] = [];
      const missing: string[] = [];
      let pts = 0;
      if (p.sections.has('audience') || /קהל\s?יעד|לקוחות|משתמשים|audience|target|persona|עבור/i.test(p.text)) {
        matched.push('audience');
        pts += 0.4;
      } else missing.push('target audience');
      if (p.sections.has('goal') || /מטרה|יעד|goal|objective|כדי\s+ל|so\s+that/i.test(p.text)) {
        matched.push('goal');
        pts += 0.3;
      } else missing.push('goal');
      if (p.sections.has('context') || /רקע|הקשר|מצב|context|background|situation/i.test(p.text)) {
        matched.push('background');
        pts += 0.3;
      } else missing.push('background');
      return { ratio: Math.min(1, pts), matched, missing };
    },
  },

  format: {
    key: 'format',
    label: 'פורמט פלט',
    tip: 'ציין מבנה פלט (טבלה/רשימה/סעיפים) ואורך',
    test: (p) => {
      const matched: string[] = [];
      const missing: string[] = [];
      let pts = 0;
      if (hasOutputFormat(p)) {
        matched.push('format structure');
        pts += 0.6;
      } else missing.push('output format');
      if (hasLengthSpec(p)) {
        matched.push('length spec');
        pts += 0.4;
      } else missing.push('length spec');
      return { ratio: Math.min(1, pts), matched, missing };
    },
  },

  constraints: {
    key: 'constraints',
    label: 'מגבלות',
    tip: 'הוסף מגבלות שליליות: "אל ת…", "ללא…", "בלי…"',
    test: (p) => {
      if (hasNegativeConstraints(p)) {
        return { ratio: 1, matched: ['negative constraints'], missing: [] };
      }
      return { ratio: 0, matched: [], missing: ['do/don\'t rules'] };
    },
  },

  specificity: {
    key: 'specificity',
    label: 'ספציפיות',
    tip: 'הוסף מספרים קשורים למשימה ושמות קונקרטיים',
    test: (p) => {
      const matched: string[] = [];
      const missing: string[] = [];
      let pts = 0;
      if (hasMeasurableQuantity(p)) {
        matched.push('task-relevant numbers');
        pts += 0.5;
      } else if (hasLooseNumber(p)) {
        matched.push('loose numbers');
        pts += 0.15;
        missing.push('numbers tied to task quantity');
      } else missing.push('concrete numbers');
      if (hasSpecificityProperNouns(p)) {
        matched.push('proper nouns / brands');
        pts += 0.3;
      } else missing.push('proper nouns / brands');
      if (hasExampleBlock(p)) {
        matched.push('example block');
        pts += 0.2;
      } else missing.push('inline example');
      return { ratio: Math.min(1, pts), matched, missing };
    },
  },

  structure: {
    key: 'structure',
    label: 'מבנה',
    tip: 'פרק את הפרומפט לסעיפים או שורות נפרדות',
    test: (p) => {
      if (hasStructure(p)) return { ratio: 1, matched: ['multi-line structure'], missing: [] };
      if (p.lines.length >= 2) return { ratio: 0.5, matched: ['some line breaks'], missing: ['bullets / headings'] };
      return { ratio: 0, matched: [], missing: ['structure'] };
    },
  },

  clarity: {
    key: 'clarity',
    label: 'בהירות',
    tip: 'הסר hedges ומילות באזז — היה ישיר ומדיד',
    test: (p) => {
      let pts = 1;
      const matched: string[] = ['clear language'];
      const missing: string[] = [];
      if (hasHedges(p)) {
        pts -= 0.4;
        matched.pop();
        missing.push('hedges (אולי/maybe)');
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
    key: 'examples',
    label: 'דוגמאות',
    tip: 'הוסף בלוק דוגמה מופרד: "דוגמה: ..."',
    test: (p) =>
      hasExampleBlock(p)
        ? { ratio: 1, matched: ['example block'], missing: [] }
        : { ratio: 0, matched: [], missing: ['concrete example'] },
  },

  measurability: {
    key: 'measurability',
    label: 'מדידות',
    tip: 'הוסף קריטריון הצלחה מספרי (X מילים, Y פריטים, טווח Z)',
    test: (p) =>
      hasMeasurableQuantity(p)
        ? { ratio: 1, matched: ['measurable criteria'], missing: [] }
        : { ratio: 0, matched: [], missing: ['success metric'] },
  },

  enforceability: {
    key: 'enforceability',
    label: 'אכיפות',
    tip: 'העדף מגבלות שאפשר לאכוף ("bullet points", "עד 5 סעיפים") על פני בלתי אפשריות ("בדיוק 500 מילים")',
    test: (p) => {
      const matched: string[] = [];
      const missing: string[] = [];

      // Enforceable patterns — things LLMs can reliably follow
      const enforceable = [
        { re: /(?:bullet|רשימה|סעיפים|numbered|ממוספר|טבלה|table|json|csv|markdown)/i, label: 'format control' },
        { re: /(?:עד|מקסימום|לכל\s+היותר|max(?:imum)?|up\s+to|at\s+most|no\s+more\s+than)\s+\d+/i, label: 'max limit' },
        { re: /(?:לפחות|מינימום|minimum|at\s+least)\s+\d+/i, label: 'min limit' },
        { re: /(?:בעברית|באנגלית|in\s+(?:hebrew|english|spanish|french|arabic))/i, label: 'language control' },
        { re: /(?:אל\s+ת|ללא|בלי|don['']?t|do\s+not|avoid|never|without)\s+\S+/i, label: 'negative constraint' },
      ];

      // Hard-to-enforce patterns — things LLMs struggle with
      const hardToEnforce = [
        { re: /בדיוק\s+\d+\s+(?:מילים|words|תווים|characters)/i, label: 'exact word count' },
        { re: /(?:100%|מלאה|full|complete|total)\s*(?:דיוק|accuracy|precision)/i, label: 'perfect accuracy' },
        { re: /(?:אל\s+תמציא|never\s+hallucinate|don['']?t\s+make\s+up|no\s+hallucination)/i, label: 'no hallucination' },
        { re: /(?:בדיוק|exactly)\s+\d+\s+(?:משפטים|sentences|פסקאות|paragraphs)/i, label: 'exact count' },
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
        return { ratio: 0, matched: [], missing: ['enforceable constraints'] };
      }

      // Score: enforceable constraints are good, hard-to-enforce deduct
      const base = Math.min(1, enforceableCount * 0.3);
      const penalty = hardCount * 0.25;
      return { ratio: Math.max(0, Math.min(1, base - penalty)), matched, missing };
    },
  },

  // ---- Research-mode dims ----
  research_sources: {
    key: 'research_sources',
    label: 'מקורות',
    tip: 'דרוש מקורות ראשוניים, ציטוט URL, ופסילת מקורות לא-מאומתים',
    test: (p) => {
      const matched: string[] = [];
      const missing: string[] = [];
      let pts = 0;
      if (hasSourcesRequirement(p)) {
        matched.push('sources required');
        pts += 0.6;
      } else missing.push('sources requirement');
      if (/url|http|אתר|official|ראשוני|primary\s+source|peer[-\s]?reviewed/i.test(p.text)) {
        matched.push('URL / primary sources');
        pts += 0.4;
      } else missing.push('URL / primary sources');
      return { ratio: Math.min(1, pts), matched, missing };
    },
  },

  research_method: {
    key: 'research_method',
    label: 'מתודולוגיה',
    tip: 'הגדר שלבי מחקר ומסגרת (MECE / שאלות מובילות)',
    test: (p) => {
      const matched: string[] = [];
      const missing: string[] = [];
      let pts = 0;
      if (hasMethodology(p)) {
        matched.push('method');
        pts += 0.6;
      } else missing.push('method / steps');
      if (hasMECE(p)) {
        matched.push('MECE');
        pts += 0.4;
      } else missing.push('MECE / taxonomy');
      return { ratio: Math.min(1, pts), matched, missing };
    },
  },

  confidence: {
    key: 'confidence',
    label: 'רמת ביטחון',
    tip: 'בקש דירוג ביטחון לכל טענה (low/medium/high)',
    test: (p) =>
      hasConfidenceProtocol(p)
        ? { ratio: 1, matched: ['confidence scale'], missing: [] }
        : { ratio: 0, matched: [], missing: ['confidence scale'] },
  },

  falsifiability: {
    key: 'falsifiability',
    label: 'הפרכה',
    tip: 'דרוש ציון "מה היה מפריך את הטענה"',
    test: (p) =>
      hasFalsifiability(p)
        ? { ratio: 1, matched: ['falsifiability asked'], missing: [] }
        : { ratio: 0, matched: [], missing: ['falsifiability'] },
  },

  info_gaps: {
    key: 'info_gaps',
    label: 'פערי מידע',
    tip: 'בקש סעיף "פערי מידע" / unknowns שידגיש מה לא ניתן לאמת',
    test: (p) =>
      hasInfoGaps(p)
        ? { ratio: 1, matched: ['info gaps flagged'], missing: [] }
        : { ratio: 0, matched: [], missing: ['info gaps section'] },
  },

  // ---- Agent-builder dims ----
  tools: {
    key: 'tools',
    label: 'כלים',
    tip: 'פרט אילו כלים/APIs הסוכן רשאי לקרוא',
    test: (p) =>
      hasToolsSpec(p)
        ? { ratio: 1, matched: ['tools listed'], missing: [] }
        : { ratio: 0, matched: [], missing: ['tools list'] },
  },

  boundaries: {
    key: 'boundaries',
    label: 'גבולות',
    tip: 'הגדר מה אסור לסוכן לעשות ומתי להעביר לאנושי',
    test: (p) =>
      hasBoundaries(p)
        ? { ratio: 1, matched: ['boundaries / escalation'], missing: [] }
        : { ratio: 0, matched: [], missing: ['boundaries / escalation'] },
  },

  inputs_outputs: {
    key: 'inputs_outputs',
    label: 'קלט/פלט',
    tip: 'הגדר schema מדויק לקלט ולפלט',
    test: (p) =>
      hasInputsOutputs(p)
        ? { ratio: 1, matched: ['i/o schema'], missing: [] }
        : { ratio: 0, matched: [], missing: ['input/output schema'] },
  },

  policies: {
    key: 'policies',
    label: 'מדיניות',
    tip: 'הוסף כללים/guardrails ברורים',
    test: (p) =>
      hasPolicies(p)
        ? { ratio: 1, matched: ['policies'], missing: [] }
        : { ratio: 0, matched: [], missing: ['policies / guardrails'] },
  },

  failure_modes: {
    key: 'failure_modes',
    label: 'מצבי כשל',
    tip: 'תאר כיצד הסוכן מגיב לשגיאות ומקרי קצה',
    test: (p) =>
      hasFailureModes(p)
        ? { ratio: 1, matched: ['failure modes'], missing: [] }
        : { ratio: 0, matched: [], missing: ['error handling / edge cases'] },
  },

  // ---- Visual dims ----
  subject: {
    key: 'subject',
    label: 'נושא',
    tip: 'תאר בבהירות מה נמצא בתמונה (מי/מה/איפה)',
    test: (p) =>
      hasImageSubject(p)
        ? { ratio: p.wordCount >= 8 ? 1 : 0.6, matched: ['subject described'], missing: [] }
        : { ratio: 0, matched: [], missing: ['subject'] },
  },
  style: {
    key: 'style',
    label: 'סגנון',
    tip: 'ציין מדיום/סגנון (צילום, איור, אנימציה, cinematic ...)',
    test: (p) =>
      hasImageStyle(p)
        ? { ratio: 1, matched: ['style'], missing: [] }
        : { ratio: 0, matched: [], missing: ['style / medium'] },
  },
  composition: {
    key: 'composition',
    label: 'קומפוזיציה',
    tip: 'ציין מסגור/זווית מצלמה (close-up, wide shot, זווית נמוכה ...)',
    test: (p) =>
      hasImageComposition(p)
        ? { ratio: 1, matched: ['composition'], missing: [] }
        : { ratio: 0, matched: [], missing: ['composition / framing'] },
  },
  aspect_ratio: {
    key: 'aspect_ratio',
    label: 'יחס גובה-רוחב',
    tip: 'ציין יחס גובה-רוחב (16:9 / 1:1 / 9:16)',
    test: (p) =>
      hasAspectRatio(p)
        ? { ratio: 1, matched: ['aspect ratio'], missing: [] }
        : { ratio: 0, matched: [], missing: ['aspect ratio'] },
  },
  lighting: {
    key: 'lighting',
    label: 'תאורה',
    tip: 'תאר תאורה (golden hour, soft light, rim, Rembrandt ...)',
    test: (p) =>
      hasImageLighting(p)
        ? { ratio: 1, matched: ['lighting'], missing: [] }
        : { ratio: 0, matched: [], missing: ['lighting'] },
  },
  color: {
    key: 'color',
    label: 'צבע',
    tip: 'פרט פלטת צבעים / מצב-רוח צבעוני',
    test: (p) =>
      hasImageColor(p)
        ? { ratio: 1, matched: ['color'], missing: [] }
        : { ratio: 0, matched: [], missing: ['color palette'] },
  },
  quality: {
    key: 'quality',
    label: 'איכות טכנית',
    tip: 'הוסף "4k / ultra detailed / photorealistic" וכו\'',
    test: (p) =>
      hasImageQuality(p)
        ? { ratio: 1, matched: ['quality'], missing: [] }
        : { ratio: 0, matched: [], missing: ['technical quality'] },
  },
  negative: {
    key: 'negative',
    label: 'מה לא לכלול',
    tip: 'ציין מה לא רוצים (negative prompt)',
    test: (p) =>
      hasImageNegative(p)
        ? { ratio: 1, matched: ['negative prompt'], missing: [] }
        : { ratio: 0, matched: [], missing: ['negative prompt'] },
  },
  motion: {
    key: 'motion',
    label: 'תנועה',
    tip: 'תאר תנועת מצלמה ותנועת נושא (pan, dolly, slow motion ...)',
    test: (p) =>
      hasVideoMotion(p)
        ? { ratio: 1, matched: ['motion'], missing: [] }
        : { ratio: 0, matched: [], missing: ['motion / camera movement'] },
  },
};

// ---------------------------------------------------------------------------
// Mode profiles (weights sum to 100)
// ---------------------------------------------------------------------------

type Profile = Array<{ key: string; weight: number }>;

const PROFILES: Record<CapabilityMode, Profile> = {
  [CapabilityMode.STANDARD]: [
    { key: 'role', weight: 14 },
    { key: 'task', weight: 14 },
    { key: 'context', weight: 12 },
    { key: 'format', weight: 11 },
    { key: 'constraints', weight: 8 },
    { key: 'specificity', weight: 10 },
    { key: 'structure', weight: 8 },
    { key: 'clarity', weight: 7 },
    { key: 'enforceability', weight: 6 },
    { key: 'examples', weight: 6 },
    { key: 'measurability', weight: 4 },
  ],
  [CapabilityMode.DEEP_RESEARCH]: [
    { key: 'task', weight: 12 },
    { key: 'research_sources', weight: 16 },
    { key: 'research_method', weight: 14 },
    { key: 'confidence', weight: 10 },
    { key: 'falsifiability', weight: 8 },
    { key: 'format', weight: 10 },
    { key: 'info_gaps', weight: 6 },
    { key: 'specificity', weight: 8 },
    { key: 'clarity', weight: 6 },
    { key: 'role', weight: 10 },
  ],
  [CapabilityMode.AGENT_BUILDER]: [
    { key: 'role', weight: 10 },
    { key: 'task', weight: 10 },
    { key: 'tools', weight: 12 },
    { key: 'boundaries', weight: 10 },
    { key: 'inputs_outputs', weight: 12 },
    { key: 'policies', weight: 10 },
    { key: 'failure_modes', weight: 8 },
    { key: 'enforceability', weight: 8 },
    { key: 'format', weight: 10 },
    { key: 'context', weight: 6 },
    { key: 'clarity', weight: 4 },
  ],
  [CapabilityMode.IMAGE_GENERATION]: [
    { key: 'subject', weight: 18 },
    { key: 'style', weight: 15 },
    { key: 'composition', weight: 14 },
    { key: 'lighting', weight: 14 },
    { key: 'color', weight: 10 },
    { key: 'quality', weight: 10 },
    { key: 'negative', weight: 10 },
    { key: 'aspect_ratio', weight: 9 },
  ],
  [CapabilityMode.VIDEO_GENERATION]: [
    { key: 'subject', weight: 14 },
    { key: 'motion', weight: 15 },
    { key: 'style', weight: 12 },
    { key: 'composition', weight: 12 },
    { key: 'lighting', weight: 12 },
    { key: 'color', weight: 9 },
    { key: 'quality', weight: 9 },
    { key: 'negative', weight: 8 },
    { key: 'aspect_ratio', weight: 9 },
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
    research_sources:
      'ציין: "השתמש רק במקורות ראשוניים מ‑2023 ואילך, צטט URL מלא לכל טענה"',
    research_method:
      'הוסף: "שלבי מחקר: 1) מיפוי MECE 2) איסוף 3) הצלבה 4) סינתזה"',
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
    role: '\nתפקיד: ',
    task: '\nמשימה: ',
    context: '\nקהל יעד: ',
    format: '\nפורמט: רשימה ממוספרת, עד 200 מילים',
    constraints: '\nמגבלות: אל תשתמש ב‑',
    specificity: '\nדרישות: 3 דוגמאות, עד 250 מילים',
    examples: '\nדוגמה: ',
    measurability: '\nקריטריון הצלחה: ',
    enforceability: '\nמגבלה: עד ',
  },
  [CapabilityMode.AGENT_BUILDER]: {
    role: '\nתפקיד: אתה סוכן ',
    tools: '\nכלים זמינים: ',
    boundaries: '\nגבולות: אל תענה מחוץ ל‑',
    inputs_outputs: '\nInput: { }; Output: JSON { }',
    policies: '\nמדיניות: ',
    failure_modes: '\nטיפול בשגיאות: אם כלי נכשל — ',
    enforceability: '\nמגבלה: JSON בלבד, עד 3 תוצאות',
  },
  [CapabilityMode.IMAGE_GENERATION]: {
    subject: '\nנושא: ',
    style: '\nסגנון: ',
    composition: '\nקומפוזיציה: ',
    lighting: '\nתאורה: ',
    negative: '\nללא: טקסט, watermark',
  },
};

// "Why" blurbs (why this dimension matters)
const MODE_WHYS: Record<string, string> = {
  role: 'בלי תפקיד ברור המודל משתמש בטון ברירת‑מחדל חיוור',
  task: 'בלי פועל פעולה המודל מנחש מה לעשות',
  context: 'בלי קהל יעד התוצאה גנרית ולא ממוקדת',
  format: 'בלי פורמט הפלט יוצא בלתי צפוי',
  constraints: 'בלי מגבלות שליליות המודל מוסיף דברים לא רצויים',
  specificity: 'מספרים ודוגמאות מקבעים את התוצאה',
  structure: 'פרומפט שטוח קשה לפרש; סעיפים מחדדים',
  clarity: 'hedges ו‑buzzwords מהללים את המודל לטון מתחמק',
  examples: 'דוגמה אחת שווה 100 הוראות',
  measurability: 'בלי מדד הצלחה אי אפשר להעריך תוצאה',
  research_sources: 'בלי דרישת מקורות המודל ממציא',
  research_method: 'בלי שלבים המחקר שטוח',
  confidence: 'בלי דירוג ביטחון אי אפשר לסנן טענות שבירות',
  falsifiability: 'בלי קריטריון הפרכה כל טענה נראית חזקה',
  info_gaps: 'בלי דיווח פערים המודל מסתיר את אי‑הוודאות',
  tools: 'בלי רשימת כלים הסוכן לא יכול לפעול',
  boundaries: 'בלי גבולות הסוכן חורג מסמכותו',
  inputs_outputs: 'בלי schema השילוב תוכנתית שביר',
  policies: 'בלי מדיניות הסוכן ייחשף לסיכון',
  failure_modes: 'בלי טיפול בשגיאות הסוכן קורס בשקט',
  enforceability: 'מגבלות לא-אכיפות ("בדיוק 500 מילים") גורמות לאכזבה; העדף מגבלות שהמודל יכול לכבד',
  subject: 'בלי נושא ברור המודל מייצר בליל ויזואלי',
  style: 'בלי סגנון הפלט נראה גנרי',
  composition: 'בלי מסגור הקומפוזיציה מקרית',
  aspect_ratio: 'בלי יחס גובה-רוחב הפלט לא מתאים לפלטפורמה',
  lighting: 'תאורה היא 50% מהפלט הסופי בתמונה',
  color: 'בלי פלטה הצבעים יוצאים עמומים',
  quality: 'בלי דגל איכות הפלט יצא בריזולוציה נמוכה',
  negative: 'negative prompt חוסם ארטיפקטים נפוצים',
  motion: 'בלי תיאור תנועה הסרטון סטטי',
};

const DIM_TITLES: Record<string, string> = {
  role: 'חסר תפקיד',
  task: 'חסר פועל משימה',
  context: 'חסר הקשר',
  format: 'חסר פורמט פלט',
  constraints: 'חסרות מגבלות',
  specificity: 'חסרה ספציפיות',
  structure: 'חסר מבנה',
  clarity: 'חסרה בהירות',
  examples: 'חסרה דוגמה',
  measurability: 'חסר מדד הצלחה',
  research_sources: 'חסרה דרישת מקורות',
  research_method: 'חסרה מתודולוגיה',
  confidence: 'חסר דירוג ביטחון',
  falsifiability: 'חסר קריטריון הפרכה',
  info_gaps: 'חסר סעיף פערי מידע',
  tools: 'חסרה רשימת כלים',
  boundaries: 'חסרים גבולות',
  inputs_outputs: 'חסר schema קלט/פלט',
  policies: 'חסרה מדיניות',
  failure_modes: 'חסר טיפול בשגיאות',
  enforceability: 'מגבלות לא אכיפות',
  subject: 'חסר נושא מרכזי',
  style: 'חסר סגנון',
  composition: 'חסרה קומפוזיציה',
  aspect_ratio: 'חסר יחס גובה-רוחב',
  lighting: 'חסרה תאורה',
  color: 'חסרה פלטת צבעים',
  quality: 'חסר דגל איכות',
  negative: 'חסר negative prompt',
  motion: 'חסרה תנועה',
};

// ---------------------------------------------------------------------------
// Level thresholds
// ---------------------------------------------------------------------------

function levelOf(total: number, wordCount: number): { level: InputScoreLevel; label: string } {
  if (wordCount === 0) return { level: 'empty', label: 'חסר' };
  if (total < 40) return { level: 'low', label: 'חלש' };
  if (total < 65) return { level: 'medium', label: 'בינוני' };
  if (total < 85) return { level: 'high', label: 'חזק' };
  return { level: 'elite', label: 'מצוין' };
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
        tip: dim?.tip ?? '',
      };
    });
    const topKeys = [...profile].sort((a, b) => b.weight - a.weight).slice(0, 3);
    return {
      total: 0,
      level: 'empty',
      label: 'חסר',
      strengths: [],
      missingTop: topKeys.map(({ key }) => ({
        key,
        title: DIM_TITLES[key] ?? key,
        why: MODE_WHYS[key] ?? '',
        example: MODE_EXAMPLES[mode]?.[key],
      })),
      breakdown: emptyBreakdown,
      mode,
    };
  }

  // Score every dimension in the profile
  const breakdown: InputScoreDimension[] = [];
  let totalRaw = 0;
  const strengths: string[] = [];

  for (const { key, weight } of profile) {
    const dim = DIMS[key];
    if (!dim) continue;
    const result = dim.test(p);
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
    why: MODE_WHYS[d.key] ?? '',
    example: MODE_EXAMPLES[mode]?.[d.key],
    insertText: MODE_INSERTS[mode]?.[d.key],
  }));

  // If contradictions exist, inject a contradiction warning at the top
  if (hasContradictions(p)) {
    missingTop.unshift({
      key: 'contradiction',
      title: 'סתירה פנימית',
      why: 'הפרומפט מכיל דרישות סותרות (למשל "קצר" + מאות מילים)',
      example: 'בחר כיוון אחד: "עד 100 מילים" או "500+ מילים" — לא שניהם',
    });
    missingTop.length = Math.min(missingTop.length, 3);
  }

  // Buzzword inflation warning — nudge toward concrete specs
  if (buzzCount >= 3 && !hasMeasurableQuantity(p) && !hasExampleBlock(p)) {
    missingTop.unshift({
      key: 'buzzword_inflation',
      title: 'ניפוח מילות באזז',
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
  };
}
