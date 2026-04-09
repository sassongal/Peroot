import { describe, it, expect } from 'vitest';
import { scoreInput } from '../input-scorer';
import { CapabilityMode } from '@/lib/capability-mode';

const DEEP_RESEARCH_FIXTURE = `
אתה אנליסט מחקרי בכיר עם 15 שנות ניסיון בתחום ה-SaaS בישראל.

משימה: חקור את שוק ה-SaaS בישראל לשנת 2026. נתח גודל שוק, שחקנים מובילים, והזדמנויות צמיחה.

מתודולוגיה:
1. מיפוי MECE של הקטגוריות
2. איסוף נתונים ממקורות ראשוניים (רשות החדשנות, IVC, דוחות רבעוניים)
3. הצלבת מקורות מול ראיונות עם CROs
4. סינתזה עם דירוג confidence

דרישות מקורות:
- השתמש רק במקורות ראשוניים מ-2023 ואילך
- צטט URL מלא לכל טענה
- אל תסתמך על פוסטים בבלוגים לא מאומתים
- בצע fact-check חי על כל נתון

פרוטוקול פלט:
- פלט כטבלה: טענה | ראיה | מקור URL | confidence (high/medium/low)
- סעיף נפרד: "פערי מידע" שמפרט unknowns
- לכל טענה: "מה היה מפריך אותה?" (falsifiability)

קהל יעד: משקיעים מוסדיים שמעריכים השקעות B2B SaaS.
מטרה: להחליט על אלוקציה של 50 מיליון דולר לקרן חדשה.

אורך: 8200 מילים, מובנה לסעיפים ממוספרים.
`;

describe('InputScorer — empty prompts', () => {
  it('returns level=empty and total=0 for every mode', () => {
    for (const mode of Object.values(CapabilityMode)) {
      const result = scoreInput('', mode);
      expect(result.level).toBe('empty');
      expect(result.total).toBe(0);
      expect(result.mode).toBe(mode);
      expect(result.missingTop.length).toBeGreaterThanOrEqual(2);
      expect(result.breakdown.length).toBeGreaterThan(0);
    }
  });

  it('empty prompt missingTop is drawn from the mode profile, not a generic list', () => {
    const std = scoreInput('', CapabilityMode.STANDARD);
    const img = scoreInput('', CapabilityMode.IMAGE_GENERATION);
    const stdKeys = std.missingTop.map((m) => m.key);
    const imgKeys = img.missingTop.map((m) => m.key);
    // STANDARD should surface role/task; IMAGE should surface subject/style
    expect(stdKeys).toEqual(expect.arrayContaining(['role', 'task']));
    expect(imgKeys).toEqual(expect.arrayContaining(['subject', 'style']));
    expect(stdKeys).not.toContain('subject');
    expect(imgKeys).not.toContain('role');
  });
});

describe('InputScorer — STANDARD mode', () => {
  it('short vague prompt scores low and surfaces role/format/context as missing', () => {
    const result = scoreInput('כתוב לי משהו על שיווק', CapabilityMode.STANDARD);
    expect(result.total).toBeLessThan(40);
    expect(result.level).toBe('low');
    const missingKeys = result.missingTop.map((m) => m.key);
    // role and format should both appear among the top missing items
    expect(missingKeys).toEqual(expect.arrayContaining(['role']));
  });

  it('full structured STANDARD prompt scores high', () => {
    const prompt = `
אתה מומחה שיווק דיגיטלי עם 10 שנות ניסיון.
כתוב פוסט לינקדאין לקמפיין השקה של מוצר SaaS B2B חדש.
קהל יעד: מנהלי שיווק בחברות טכנולוגיה בישראל.
מטרה: לייצר 50 לידים איכותיים ב-7 ימים.
רקע: מוצר CRM חדש שמייעל תהליך מכירה ב-40%.
פורמט: פוסט מובנה עם hook פותח, 3 bullet points, CTA ברור, עד 250 מילים.
אל תשתמש ב-buzzwords כמו "פורץ דרך" או "מהפכני".
דוגמה: "תארו לעצמכם שהצוות שלכם סוגר עסקאות ב-40% פחות זמן — זה לא חלום."
`;
    const result = scoreInput(prompt, CapabilityMode.STANDARD);
    expect(result.total).toBeGreaterThanOrEqual(65);
    expect(['high', 'elite', 'medium']).toContain(result.level);
    expect(result.strengths.length).toBeGreaterThan(0);
  });

  it('buzzwords without measurable spec get penalized via clarity', () => {
    const prompt = 'כתוב תוכן איכותי חדשני מעולה ברמה עולמית על מוצר שיווק';
    const result = scoreInput(prompt, CapabilityMode.STANDARD);
    const clarityDim = result.breakdown.find((d) => d.key === 'clarity');
    expect(clarityDim).toBeDefined();
    expect(clarityDim!.score).toBeLessThan(clarityDim!.max * 0.7);
  });

  it('contradictions (short + 2000 words) get penalized and flagged', () => {
    const prompt = 'אתה מומחה שיווק. כתוב פוסט קצר מאוד, בדיוק 2000 מילים, על AI.';
    const result = scoreInput(prompt, CapabilityMode.STANDARD);
    const topKeys = result.missingTop.map((m) => m.key);
    expect(topKeys).toContain('contradiction');
  });
});

describe('InputScorer — DEEP_RESEARCH mode', () => {
  it('full research fixture scores high and does NOT flag role/task/format as missing', () => {
    const result = scoreInput(DEEP_RESEARCH_FIXTURE, CapabilityMode.DEEP_RESEARCH);

    expect(result.total).toBeGreaterThanOrEqual(75);
    expect(['high', 'elite']).toContain(result.level);

    const missingKeys = result.missingTop.map((m) => m.key);
    expect(missingKeys).not.toContain('role');
    expect(missingKeys).not.toContain('task');
    expect(missingKeys).not.toContain('format');
    expect(missingKeys).not.toContain('research_sources');
  });

  it('research profile uses research_* dims and omits STANDARD-only dims', () => {
    const result = scoreInput(DEEP_RESEARCH_FIXTURE, CapabilityMode.DEEP_RESEARCH);
    const dimKeys = result.breakdown.map((d) => d.key);
    expect(dimKeys).toContain('research_sources');
    expect(dimKeys).toContain('research_method');
    expect(dimKeys).toContain('confidence');
    expect(dimKeys).toContain('falsifiability');
    // DEEP_RESEARCH profile does not include 'examples' or 'measurability' or 'constraints' directly
    expect(dimKeys).not.toContain('examples');
  });
});

describe('InputScorer — AGENT_BUILDER mode', () => {
  it('short agent prompt surfaces tools/boundaries/inputs_outputs as missing', () => {
    const result = scoreInput(
      'בנה לי סוכן שירות לקוחות לחנות אופנה אונליין',
      CapabilityMode.AGENT_BUILDER
    );
    const missingKeys = result.missingTop.map((m) => m.key);
    expect(missingKeys).toEqual(expect.arrayContaining(['tools']));
    expect(result.total).toBeLessThan(60);
  });
});

describe('InputScorer — IMAGE_GENERATION mode', () => {
  it('prompt missing only aspect_ratio flags it as the top gap', () => {
    const result = scoreInput(
      'אישה צעירה ברחוב טוקיו, סגנון צילום קולנועי 35mm, close-up rule of thirds, זווית נמוכה, תאורת רמברנדט golden hour, פלטת צבעים חמה זהב וענבר, 8k photorealistic ultra detailed, ללא watermark ללא טקסט',
      CapabilityMode.IMAGE_GENERATION
    );
    const missingKeys = result.missingTop.map((m) => m.key);
    expect(missingKeys).toContain('aspect_ratio');
  });

  it('full image prompt scores high', () => {
    const result = scoreInput(
      'תמונה: אישה צעירה יושבת ליד חלון קפה. סגנון: צילום קולנועי 35mm. קומפוזיציה: close-up, rule of thirds. תאורה: golden hour, soft rim light. פלטת צבעים חמה של זהב וענבר. 4k, photorealistic, ultra detailed. יחס גובה-רוחב 1:1. ללא טקסט.',
      CapabilityMode.IMAGE_GENERATION
    );
    expect(result.total).toBeGreaterThanOrEqual(75);
  });
});

describe('InputScorer — role detection regression', () => {
  it('"אתה אנליסט נתונים..." scores full role points', () => {
    const prompt =
      'אתה אנליסט נתונים עם 10 שנות ניסיון. נתח את מגמות השוק ב-2026 וכתוב דוח מפורט של 500 מילים.';
    const result = scoreInput(prompt, CapabilityMode.STANDARD);
    const roleDim = result.breakdown.find((d) => d.key === 'role');
    expect(roleDim).toBeDefined();
    expect(roleDim!.score).toBe(roleDim!.max);
  });

  it('"אתה סופר טכני" also detected as full role', () => {
    const prompt =
      'אתה סופר טכני בכיר. כתוב מאמר של 800 מילים על מיקרו-שירותים עם 3 דוגמאות קוד.';
    const result = scoreInput(prompt, CapabilityMode.STANDARD);
    const roleDim = result.breakdown.find((d) => d.key === 'role');
    expect(roleDim!.score).toBe(roleDim!.max);
  });
});

describe('InputScorer — backward compat smoke', () => {
  it('returns a valid shape for every mode', () => {
    for (const mode of Object.values(CapabilityMode)) {
      const result = scoreInput('בדיקה עם קצת טקסט ומספר 42', mode);
      expect(result).toMatchObject({
        total: expect.any(Number),
        level: expect.any(String),
        label: expect.any(String),
        strengths: expect.any(Array),
        missingTop: expect.any(Array),
        breakdown: expect.any(Array),
        mode,
      });
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.total).toBeLessThanOrEqual(100);
    }
  });
});
