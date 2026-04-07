/**
 * Enhanced Prompt Scorer — World-class prompt quality analysis
 *
 * Upgrade from base-engine.ts scoring with:
 * - 15 dimensions for text (10 existing + 5 new)
 * - 8 dimensions for visual (image/video)
 * - Rich breakdown with matched/missing patterns
 * - Elite tier (90+) for truly exceptional prompts
 * - Actionable improvement plan
 * - Hebrew + English support throughout
 */

import { CapabilityMode } from '../../capability-mode';

export interface DimensionResult {
  dimension: string;
  score: number;
  maxScore: number;
  tip: string;
  matched: string[];
  missing: string[];
}

export interface EnhancedScore {
  total: number;
  level: 'low' | 'medium' | 'high' | 'elite';
  label: string;
  breakdown: DimensionResult[];
  topWeaknesses: string[];
  estimatedImpact: string;
  strengths: string[];
}

interface DimensionDef {
  key: string;
  maxPoints: number;
  tip: string;
  test: (text: string, wordCount: number) => { score: number; matched: string[]; missing: string[] };
  visual?: boolean;  // true for visual-only, undefined/false for text
  videoOnly?: boolean;
}

// ── TEXT DIMENSIONS (15 total) ──

const TEXT_DIMENSIONS: DimensionDef[] = [
  {
    key: 'length',
    maxPoints: 10,
    tip: 'הוסף עוד פרטים והקשר',
    test: (_t, wc) => {
      if (wc <= 3) return { score: 0, matched: [], missing: ['אורך'] };
      if (wc <= 6) return { score: 2, matched: ['מילים'], missing: ['פרטים'] };
      if (wc <= 12) return { score: 4, matched: ['אורך בינוני'], missing: ['פירוט'] };
      if (wc <= 25) return { score: 6, matched: ['אורך טוב'], missing: ['יותר הקשר'] };
      if (wc <= 50) return { score: 8, matched: ['מפורט'], missing: [] };
      return { score: 10, matched: ['מפורט מאוד'], missing: [] };
    },
  },
  {
    key: 'role',
    maxPoints: 10,
    tip: 'הגדר תפקיד/פרסונה (למשל: "אתה מומחה שיווק עם 15 שנות ניסיון")',
    test: (t) => {
      const matched: string[] = [];
      const missing: string[] = [];
      if (/אתה\s+(מומחה|יועץ|מנהל|כותב|עורך|מתכנת|מתכנן)|you\s+are\s+an?\s+(expert|specialist|consultant)/i.test(t)) {
        matched.push('persona defined');
        // Bonus for experience/credentials
        if (/\d+\s+(שנות|שנים|years)|מוסמך|בכיר|פרימיום/i.test(t)) {
          matched.push('credentials');
          return { score: 10, matched, missing };
        }
        return { score: 7, matched, missing: ['credentials (years, certifications)'] };
      }
      if (/מומחה|יועץ|expert|specialist/i.test(t)) {
        return { score: 3, matched: ['role mentioned'], missing: ['clear "אתה" statement'] };
      }
      missing.push('role definition');
      return { score: 0, matched, missing };
    },
  },
  {
    key: 'task',
    maxPoints: 10,
    tip: 'הגדר משימה ברורה עם פועל פעולה',
    test: (t) => {
      const matched: string[] = [];
      const missing: string[] = [];
      const taskVerbs = /כתוב|צור|בנה|נסח|הכן|תכנן|ערוך|סכם|תרגם|נתח|השווה|write|create|build|draft|prepare|plan|edit|summarize|translate|analyze|compare|generate|design/i;
      if (!taskVerbs.test(t)) {
        return { score: 0, matched, missing: ['action verb'] };
      }
      matched.push('action verb');
      if (/כתוב\s+\S+|צור\s+\S+|בנה\s+\S+|write\s+a\s+\S+|create\s+a\s+\S+/i.test(t)) {
        matched.push('specific object');
        return { score: 10, matched, missing };
      }
      return { score: 5, matched, missing: ['specific object of task'] };
    },
  },
  {
    key: 'context',
    maxPoints: 10,
    tip: 'ספק הקשר: קהל, מטרה, רקע',
    test: (t) => {
      const matched: string[] = [];
      const missing: string[] = [];
      let pts = 0;
      if (/קהל יעד|לקוחות|משתמשים|audience|target|persona|עבור/i.test(t)) { matched.push('audience'); pts += 4; }
      else missing.push('target audience');
      if (/מטרה|יעד|goal|objective|כדי\s+ל|so\s+that/i.test(t)) { matched.push('goal'); pts += 3; }
      else missing.push('goal/purpose');
      if (/רקע|הקשר|מצב|context|background|situation/i.test(t)) { matched.push('background'); pts += 3; }
      else missing.push('background info');
      return { score: pts, matched, missing };
    },
  },
  {
    key: 'specificity',
    maxPoints: 10,
    tip: 'הוסף מספרים, שמות ודוגמאות קונקרטיות',
    test: (t) => {
      const matched: string[] = [];
      const missing: string[] = [];
      let pts = 0;
      if (/\d+/.test(t)) { matched.push('numbers'); pts += 3; }
      else missing.push('concrete numbers');
      if (/[""״]|למשל|לדוגמה|for\s+example|e\.g\./i.test(t)) { matched.push('examples mentioned'); pts += 4; }
      else missing.push('examples');
      if (/[A-Z][a-z]{2,}/.test(t) || /\b[A-Z]{2,}\b/.test(t)) { matched.push('proper nouns'); pts += 3; }
      else missing.push('proper nouns/brands');
      return { score: Math.min(10, pts), matched, missing };
    },
  },
  {
    key: 'format',
    maxPoints: 10,
    tip: 'ציין פורמט פלט (רשימה, טבלה, אורך)',
    test: (t) => {
      const matched: string[] = [];
      const missing: string[] = [];
      let pts = 0;
      if (/פורמט|מבנה|טבלה|רשימה|bullet|markdown|json|csv/i.test(t)) { matched.push('output format'); pts += 5; }
      else missing.push('output format');
      if (/אורך|מילים|שורות|פסקאות|words|sentences|paragraphs|short|long|קצר|ארוך/i.test(t)) { matched.push('length spec'); pts += 3; }
      else missing.push('length spec');
      if (/כותרת|סעיפים|חלקים|header|section|intro|summary/i.test(t)) { matched.push('structure'); pts += 2; }
      return { score: Math.min(10, pts), matched, missing };
    },
  },
  {
    key: 'constraints',
    maxPoints: 10,
    tip: 'הגדר מגבלות (מה לא לעשות, טון, שפה)',
    test: (t) => {
      const matched: string[] = [];
      const missing: string[] = [];
      let pts = 0;
      if (/אל\s+ת|אסור|ללא|בלי|don'?t|avoid|never|without/i.test(t)) { matched.push('negative constraints'); pts += 4; }
      else missing.push('negative constraints');
      if (/טון|סגנון|tone|style|formal|casual|מקצועי|ידידותי/i.test(t)) { matched.push('tone'); pts += 3; }
      else missing.push('tone/style');
      if (/שפה|language|בעברית|באנגלית/i.test(t)) { matched.push('language'); pts += 3; }
      return { score: Math.min(10, pts), matched, missing };
    },
  },
  {
    key: 'structure',
    maxPoints: 6,
    tip: 'ארגן את הפרומפט בסעיפים',
    test: (t) => {
      const matched: string[] = [];
      let pts = 0;
      if (/\n/.test(t)) { matched.push('line breaks'); pts += 2; }
      if (/^\s*[\d•\-\*]\s*/m.test(t)) { matched.push('lists'); pts += 2; }
      if (/---|===|\*\*|##|:$/m.test(t)) { matched.push('delimiters'); pts += 2; }
      return { score: Math.min(6, pts), matched, missing: pts === 0 ? ['section breaks'] : [] };
    },
  },
  {
    key: 'channel',
    maxPoints: 6,
    tip: 'ציין פלטפורמה (מייל, אינסטגרם, בלוג, לינקדאין)',
    test: (t) => {
      if (/מייל|email|landing|מודעה|ad|לינקדאין|linkedin|פייסבוק|facebook|אינסטגרם|instagram|טיקטוק|tiktok|sms|וואטסאפ|whatsapp|בלוג|blog|newsletter|ניוזלטר|אתר|website|יוטיוב|youtube|טוויטר|twitter|podcast/i.test(t)) {
        return { score: 6, matched: ['channel specified'], missing: [] };
      }
      return { score: 0, matched: [], missing: ['target platform/channel'] };
    },
  },
  {
    key: 'examples',
    maxPoints: 6,
    tip: 'הוסף דוגמאות לפלט רצוי (few-shot)',
    test: (t) => {
      if (/דוגמה לפלט|output\s+example|expected\s+output|כמו\s+זה/i.test(t)) {
        return { score: 6, matched: ['explicit examples'], missing: [] };
      }
      if (/דוגמה|example|sample|template|תבנית/i.test(t)) {
        return { score: 3, matched: ['example mentioned'], missing: ['concrete example block'] };
      }
      return { score: 0, matched: [], missing: ['few-shot examples'] };
    },
  },
  // ── NEW DIMENSIONS (5) ──
  {
    key: 'clarity',
    maxPoints: 8,
    tip: 'השתמש בצורת ציווי ברורה, הימנע מ"אולי", "נסה", "ייתכן"',
    test: (t) => {
      const matched: string[] = [];
      const missing: string[] = [];
      let pts = 8;
      // Penalty for hedges
      const hedges = ['אולי', 'נסה ל', 'ייתכן', 'אפשר', 'maybe', 'perhaps', 'try to', 'somewhat', 'kind of', 'sort of'];
      const hedgeCount = hedges.filter(h => new RegExp(h, 'i').test(t)).length;
      if (hedgeCount > 0) {
        pts -= Math.min(6, hedgeCount * 2);
        missing.push(`${hedgeCount} hedge word(s)`);
      }
      // Bonus for strong imperatives
      if (/^(כתוב|צור|בנה|נסח|write|create|build|generate)\s/im.test(t)) {
        matched.push('strong imperative opening');
      }
      return { score: Math.max(0, pts), matched, missing };
    },
  },
  {
    key: 'groundedness',
    maxPoints: 8,
    tip: 'הוסף הוראות נגד הזיה: "בסס על עובדות", "אם לא בטוח - ציין"',
    test: (t) => {
      const matched: string[] = [];
      const missing: string[] = [];
      let pts = 0;
      if (/צטט|מקור|cite|source|reference|based\s+on/i.test(t)) { matched.push('source requirement'); pts += 3; }
      else missing.push('source/citation requirement');
      if (/אם לא בטוח|אל תמציא|don'?t\s+fabricate|if\s+unsure|אינני בטוח|i\s+don'?t\s+know|הסתמך על/i.test(t)) { matched.push('uncertainty permission'); pts += 3; }
      else missing.push('uncertainty permission');
      if (/עובדות|fact|ground|אמת|verify/i.test(t)) { matched.push('grounding'); pts += 2; }
      return { score: Math.min(8, pts), matched, missing };
    },
  },
  {
    key: 'safety',
    maxPoints: 6,
    tip: 'הגדר גבולות ומקרי קצה (Iron Dome)',
    test: (t) => {
      const matched: string[] = [];
      const missing: string[] = [];
      let pts = 0;
      if (/מחוץ לתחום|out\s+of\s+scope|not\s+covered|לא בתחום/i.test(t)) { matched.push('scope boundary'); pts += 3; }
      if (/מקרה קצה|edge\s+case|exception|חריג/i.test(t)) { matched.push('edge case handling'); pts += 2; }
      if (/אם\s+.*\s+אז|if\s+.*\s+then|fallback|נסיגה/i.test(t)) { matched.push('fallback logic'); pts += 1; }
      if (pts === 0) missing.push('boundary/edge-case handling');
      return { score: Math.min(6, pts), matched, missing };
    },
  },
  {
    key: 'measurability',
    maxPoints: 6,
    tip: 'ציין קריטריוני הצלחה מדידים (מספר פריטים, אורך מדויק)',
    test: (t) => {
      const matched: string[] = [];
      const missing: string[] = [];
      let pts = 0;
      if (/\d+\s*(פריטים|נקודות|שורות|פסקאות|bullets|items|sentences|paragraphs|points)/i.test(t)) {
        matched.push('numeric count'); pts += 3;
      } else missing.push('numeric success criteria');
      if (/מקסימום|לכל היותר|up\s+to|at\s+most|תקרה|ceiling|limit/i.test(t)) { matched.push('upper bound'); pts += 2; }
      if (/מינימום|לפחות|at\s+least|minimum|תחתית/i.test(t)) { matched.push('lower bound'); pts += 1; }
      return { score: Math.min(6, pts), matched, missing };
    },
  },
  {
    key: 'framework',
    maxPoints: 8,
    tip: 'השתמש במסגרת פרומפטינג (CO-STAR, RISEN, CTCO)',
    test: (t) => {
      const matched: string[] = [];
      const missing: string[] = [];
      // CO-STAR signature
      const costar = /context|objective|style|tone|audience|response\s+format/gi;
      const costarMatches = (t.match(costar) || []).length;
      // RISEN signature
      const risen = /role|instructions|steps|expectations|narrowing|end\s+goal/gi;
      const risenMatches = (t.match(risen) || []).length;
      // Hebrew framework keywords
      if (/תפקיד|משימה|שלבים|הגבלות|טון|פורמט פלט|קהל יעד|מטרה/i.test(t)) {
        matched.push('Hebrew framework elements');
      }
      let pts = 0;
      if (costarMatches >= 4) { matched.push('CO-STAR framework'); pts = 8; }
      else if (risenMatches >= 3) { matched.push('RISEN framework'); pts = 7; }
      else if (costarMatches >= 2 || risenMatches >= 2) { matched.push('partial framework'); pts = 4; }
      else if (matched.length > 0) { pts = 3; }
      else missing.push('structured framework (CO-STAR/RISEN/CTCO)');
      return { score: pts, matched, missing };
    },
  },
];

// ── VISUAL DIMENSIONS (8 total for video, 7 for image) ──

const VISUAL_DIMENSIONS: DimensionDef[] = [
  {
    key: 'length',
    maxPoints: 10,
    tip: 'הוסף תיאורים חזותיים מפורטים',
    visual: true,
    test: (_t, wc) => {
      if (wc <= 3) return { score: 0, matched: [], missing: ['detail'] };
      if (wc <= 12) return { score: 4, matched: ['basic'], missing: ['depth'] };
      if (wc <= 25) return { score: 7, matched: ['moderate detail'], missing: [] };
      return { score: 10, matched: ['rich detail'], missing: [] };
    },
  },
  {
    key: 'subject',
    maxPoints: 15,
    tip: 'תאר את הנושא המרכזי (מראה, תנוחה, ביטוי)',
    visual: true,
    test: (t) => {
      const matched: string[] = [];
      const missing: string[] = [];
      let pts = 0;
      if (/person|woman|man|child|character|portrait|face|figure|אישה|איש|דמות|ילד|פנים/i.test(t)) { matched.push('subject type'); pts += 5; }
      if (/wearing|dressed|hair|eyes|skin|clothes|לובש|שיער|עיניים|בגד/i.test(t)) { matched.push('appearance'); pts += 5; }
      else missing.push('subject appearance details');
      if (/car|building|landscape|forest|city|ocean|room|table|product|מכונית|בניין|נוף|יער|עיר|חדר/i.test(t)) { matched.push('object/scene'); pts += 5; }
      return { score: Math.min(15, pts), matched, missing };
    },
  },
  {
    key: 'style',
    maxPoints: 15,
    tip: 'ציין סגנון אמנותי (צילום, ציור שמן, 3D, אנימה)',
    visual: true,
    test: (t) => {
      const matched: string[] = [];
      const missing: string[] = [];
      let pts = 0;
      if (/photo|realistic|illustration|painting|3d|render|anime|watercolor|digital art|צילום|ציור|איור/i.test(t)) { matched.push('medium'); pts += 8; }
      else missing.push('artistic medium');
      if (/style of|בסגנון|aesthetic|art deco|cyberpunk|minimalist|vintage|retro|modern/i.test(t)) { matched.push('aesthetic'); pts += 7; }
      else missing.push('aesthetic reference');
      return { score: Math.min(15, pts), matched, missing };
    },
  },
  {
    key: 'composition',
    maxPoints: 12,
    tip: 'הוסף זווית מצלמה ומסגור',
    visual: true,
    test: (t) => {
      const matched: string[] = [];
      const missing: string[] = [];
      let pts = 0;
      if (/close-up|wide shot|aerial|medium shot|full body|low angle|high angle|תקריב|זווית/i.test(t)) { matched.push('shot type'); pts += 6; }
      else missing.push('shot type');
      if (/rule of thirds|centered|symmetr|diagonal|foreground|background|depth|bokeh|שדה|רקע/i.test(t)) { matched.push('composition'); pts += 6; }
      else missing.push('framing details');
      return { score: Math.min(12, pts), matched, missing };
    },
  },
  {
    key: 'lighting',
    maxPoints: 15,
    tip: 'תאר תאורה (שעת זהב, סטודיו, ניאון, כיוון האור)',
    visual: true,
    test: (t) => {
      const matched: string[] = [];
      const missing: string[] = [];
      let pts = 0;
      if (/golden hour|sunset|sunrise|natural light|studio|neon|backlight|rim light|volumetric|שעת זהב|תאורה|אור/i.test(t)) { matched.push('lighting type'); pts += 8; }
      else missing.push('lighting type');
      if (/soft|hard|dramatic|warm|cool|diffused|shadow|contrast|high key|low key|רך|חם|קר|דרמטי/i.test(t)) { matched.push('lighting quality'); pts += 7; }
      else missing.push('light quality/mood');
      return { score: Math.min(15, pts), matched, missing };
    },
  },
  {
    key: 'color',
    maxPoints: 10,
    tip: 'ציין פלטת צבעים ואווירה',
    visual: true,
    test: (t) => {
      const matched: string[] = [];
      const missing: string[] = [];
      let pts = 0;
      if (/red|blue|green|yellow|purple|orange|amber|teal|crimson|magenta|ciano|#[0-9a-f]{3,6}|אדום|כחול|ירוק/i.test(t)) { matched.push('specific colors'); pts += 5; }
      else missing.push('specific color palette');
      if (/mood|atmosphere|vibe|feeling|cinematic|אווירה|מצב רוח|קולנועי/i.test(t)) { matched.push('mood'); pts += 5; }
      else missing.push('atmosphere/mood');
      return { score: Math.min(10, pts), matched, missing };
    },
  },
  {
    key: 'quality',
    maxPoints: 10,
    tip: 'הוסף מפרטים טכניים (רזולוציה, עדשה, engine)',
    visual: true,
    test: (t) => {
      const matched: string[] = [];
      const missing: string[] = [];
      let pts = 0;
      if (/4k|8k|hdr|masterpiece|best quality|highly detailed|professional|ultra|premium/i.test(t)) { matched.push('quality boosters'); pts += 5; }
      else missing.push('quality booster tags');
      if (/sony|canon|nikon|leica|arri|85mm|50mm|35mm|f\/\d|octane|unreal|redshift/i.test(t)) { matched.push('camera/engine specs'); pts += 5; }
      else missing.push('camera specs / rendering engine');
      return { score: Math.min(10, pts), matched, missing };
    },
  },
  {
    key: 'motion',
    maxPoints: 13,
    tip: 'הוסף תנועת מצלמה, תנועת נושא והשפעות סביבתיות',
    visual: true,
    videoOnly: true,
    test: (t) => {
      const matched: string[] = [];
      const missing: string[] = [];
      let pts = 0;
      if (/dolly|pan|tracking|zoom|crane|handheld|steadicam|orbit|תנועת מצלמה/i.test(t)) { matched.push('camera movement'); pts += 5; }
      else missing.push('camera movement');
      if (/walks|runs|jumps|glides|sprints|rises|falls|turns|הולך|רץ|קופץ/i.test(t)) { matched.push('subject movement'); pts += 4; }
      else missing.push('subject action verbs');
      if (/rain|snow|smoke|dust|particles|mist|wind|fog|גשם|שלג|ערפל/i.test(t)) { matched.push('environmental'); pts += 4; }
      else missing.push('environmental motion');
      return { score: Math.min(13, pts), matched, missing };
    },
  },
];

// ── Main Scorer Class ──

export class EnhancedScorer {
  /**
   * Score a prompt with rich breakdown.
   */
  static score(text: string, mode: CapabilityMode = CapabilityMode.STANDARD): EnhancedScore {
    const trimmed = (text || '').trim();
    if (!trimmed) {
      return {
        total: 0,
        level: 'low',
        label: 'ריק',
        breakdown: [],
        topWeaknesses: ['The prompt is empty'],
        estimatedImpact: 'Start by describing your goal',
        strengths: [],
      };
    }

    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    const isVisual = mode === CapabilityMode.IMAGE_GENERATION || mode === CapabilityMode.VIDEO_GENERATION;
    const isVideo = mode === CapabilityMode.VIDEO_GENERATION;

    const dimensions = isVisual
      ? VISUAL_DIMENSIONS.filter(d => !d.videoOnly || isVideo)
      : TEXT_DIMENSIONS;

    const breakdown: DimensionResult[] = dimensions.map(dim => {
      const result = dim.test(trimmed, wordCount);
      return {
        dimension: dim.key,
        score: result.score,
        maxScore: dim.maxPoints,
        tip: dim.tip,
        matched: result.matched,
        missing: result.missing,
      };
    });

    const rawScore = breakdown.reduce((sum, d) => sum + d.score, 0);
    const maxPossible = breakdown.reduce((sum, d) => sum + d.maxScore, 0);
    const total = Math.min(100, Math.round((rawScore / maxPossible) * 100));

    // Determine level
    let level: EnhancedScore['level'];
    let label: string;
    if (total >= 90) { level = 'elite'; label = 'מצוין'; }
    else if (total >= 70) { level = 'high'; label = 'חזק'; }
    else if (total >= 40) { level = 'medium'; label = 'בינוני'; }
    else { level = 'low'; label = 'חלש'; }

    // Top weaknesses — dimensions with lowest % and biggest gap
    const sortedByGap = [...breakdown]
      .map(d => ({ ...d, gap: d.maxScore - d.score, pct: d.score / d.maxScore }))
      .sort((a, b) => b.gap - a.gap);

    const topWeaknesses = sortedByGap
      .filter(d => d.pct < 0.7 && d.gap >= 4)
      .slice(0, 3)
      .map(d => d.tip);

    // Strengths — dimensions at ≥80% of max
    const strengths = breakdown
      .filter(d => d.score / d.maxScore >= 0.8 && d.score >= 5)
      .slice(0, 3)
      .map(d => `${d.dimension}: ${d.matched.join(', ')}`);

    // Estimated impact — the single highest-leverage improvement
    const topGap = sortedByGap[0];
    const estimatedImpact = topGap && topGap.gap >= 4
      ? `${topGap.tip} → +${topGap.gap} נקודות`
      : 'הפרומפט כמעט מושלם';

    return {
      total,
      level,
      label,
      breakdown,
      topWeaknesses,
      estimatedImpact,
      strengths,
    };
  }
}

/**
 * Generate 3-5 specific, actionable improvement suggestions prioritized by impact.
 */
export function generateImprovementPlan(score: EnhancedScore, text: string): string[] {
  const suggestions: string[] = [];

  // Get dimensions sorted by gap
  const sortedByGap = [...score.breakdown]
    .map(d => ({ ...d, gap: d.maxScore - d.score, pct: d.score / d.maxScore }))
    .filter(d => d.gap >= 3)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 5);

  for (const d of sortedByGap) {
    const missingStr = d.missing.length > 0 ? ` (חסר: ${d.missing[0]})` : '';
    suggestions.push(`${d.tip}${missingStr} — פוטנציאל +${d.gap} נקודות`);
  }

  // Special suggestion for hedge words
  const clarityDim = score.breakdown.find(d => d.dimension === 'clarity');
  if (clarityDim && clarityDim.missing.some(m => m.includes('hedge'))) {
    suggestions.unshift('הסר מילים מחמיקות ("אולי", "נסה", "ייתכן") והשתמש בצורת ציווי ברורה');
  }

  // Framework upgrade suggestion if missing
  const frameworkDim = score.breakdown.find(d => d.dimension === 'framework');
  if (frameworkDim && frameworkDim.score < 4) {
    suggestions.push('הוסף מסגרת CO-STAR (Context, Objective, Style, Tone, Audience, Response format)');
  }

  return suggestions.slice(0, 5);
}
