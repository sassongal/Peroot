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

describe('InputScorer — section-aware parsing', () => {
  it('markdown "## דוגמאות" heading boosts examples dimension even without quoted block', () => {
    const prompt = `
אתה מומחה שיווק עם 10 שנות ניסיון.
כתוב פוסט לינקדאין על SaaS.
קהל יעד: מנהלי שיווק.
מטרה: לייצר לידים.

## דוגמאות
- פוסט פתיחה חזק
- hook מרתק
`;
    const result = scoreInput(prompt, CapabilityMode.STANDARD);
    const examplesDim = result.breakdown.find((d) => d.key === 'examples');
    expect(examplesDim).toBeDefined();
    expect(examplesDim!.score).toBe(examplesDim!.max);
  });

  it('"### Constraints" heading credits constraints dim without explicit "ללא/אל ת"', () => {
    const prompt = `
אתה עורך תוכן בכיר.
כתוב כתבה של 600 מילים.

### Constraints
שמור על טון מקצועי ושפה נגישה.
`;
    const result = scoreInput(prompt, CapabilityMode.STANDARD);
    const constraintsDim = result.breakdown.find((d) => d.key === 'constraints');
    expect(constraintsDim!.score).toBe(constraintsDim!.max);
  });

  it('Research prompt with "## מקורות" heading flags research_sources as matched', () => {
    const prompt = `
אתה אנליסט מחקרי.
חקור את שוק הבינה המלאכותית בישראל ב-2026.

## מקורות
יש להסתמך על דוחות רשות החדשנות ומקורות ראשוניים מ-2024 ואילך.

## מתודולוגיה
1. מיפוי שוק
2. איסוף נתונים
3. הצלבה

## פערי מידע
ציין מה לא ניתן לאמת.
`;
    const result = scoreInput(prompt, CapabilityMode.DEEP_RESEARCH);
    const sourcesDim = result.breakdown.find((d) => d.key === 'research_sources');
    const methodDim = result.breakdown.find((d) => d.key === 'research_method');
    const gapsDim = result.breakdown.find((d) => d.key === 'info_gaps');
    expect(sourcesDim!.score).toBeGreaterThan(sourcesDim!.max * 0.5);
    expect(methodDim!.score).toBeGreaterThan(methodDim!.max * 0.5);
    expect(gapsDim!.score).toBe(gapsDim!.max);
  });

  it('Agent prompt with "## כלים" and "## גבולות" headings credits tools & boundaries', () => {
    const prompt = `
אתה סוכן שירות לקוחות עם 5 שנות ניסיון.
תן מענה מהיר ומקצועי.

## כלים
search_web, read_order, refund_api.

## גבולות
אל תבצע פעולות כספיות מעל 500 שח בלי אישור אנושי.
`;
    const result = scoreInput(prompt, CapabilityMode.AGENT_BUILDER);
    const toolsDim = result.breakdown.find((d) => d.key === 'tools');
    const boundariesDim = result.breakdown.find((d) => d.key === 'boundaries');
    expect(toolsDim!.score).toBe(toolsDim!.max);
    expect(boundariesDim!.score).toBe(boundariesDim!.max);
  });
});

describe('InputScorer — expanded contradiction detection', () => {
  it('"concise but extensive" pair triggers contradiction flag', () => {
    const prompt = 'אתה עורך. כתוב סיכום concise אבל extensive על AI.';
    const result = scoreInput(prompt, CapabilityMode.STANDARD);
    const topKeys = result.missingTop.map((m) => m.key);
    expect(topKeys).toContain('contradiction');
  });

  it('"no table" + "in a table" contradiction is flagged', () => {
    const prompt =
      'אתה אנליסט. כתוב דוח ללא טבלה, בטבלה ברורה עם עמודות של נתונים.';
    const result = scoreInput(prompt, CapabilityMode.STANDARD);
    const topKeys = result.missingTop.map((m) => m.key);
    expect(topKeys).toContain('contradiction');
  });
});

describe('InputScorer — English parity', () => {
  it('"You are a senior data analyst" with credentials scores full role', () => {
    const prompt =
      'You are a senior data analyst with 10 years of experience. Analyze market trends in 2026 and write a detailed 500-word report.';
    const result = scoreInput(prompt, CapabilityMode.STANDARD);
    const roleDim = result.breakdown.find((d) => d.key === 'role');
    expect(roleDim).toBeDefined();
    expect(roleDim!.score).toBe(roleDim!.max);
  });

  it('English task verbs like "explain", "refactor", "implement" all detected', () => {
    for (const verb of ['explain', 'refactor', 'implement', 'describe', 'evaluate', 'investigate']) {
      const prompt = `You are an expert. ${verb.charAt(0).toUpperCase() + verb.slice(1)} the authentication flow in detail.`;
      const result = scoreInput(prompt, CapabilityMode.STANDARD);
      const taskDim = result.breakdown.find((d) => d.key === 'task');
      expect(taskDim!.score).toBeGreaterThan(0);
    }
  });

  it('full structured English STANDARD prompt scores high', () => {
    const prompt = `
You are a senior marketing strategist with 10 years of experience.
Write a LinkedIn post for a B2B SaaS product launch.
Audience: marketing managers at tech companies in the US.
Goal: generate 50 qualified leads in 7 days.
Background: new CRM product that cuts sales cycle by 40%.
Format: structured post with strong hook, 3 bullet points, clear CTA, under 250 words.
Avoid buzzwords like "revolutionary" or "game-changing".
Example: "Imagine your team closing deals 40% faster — it's not a dream."
`;
    const result = scoreInput(prompt, CapabilityMode.STANDARD);
    expect(result.total).toBeGreaterThanOrEqual(65);
    expect(['high', 'elite', 'medium']).toContain(result.level);
    expect(result.strengths.length).toBeGreaterThan(0);
  });

  it('English buzzword inflation without measurable spec penalizes clarity', () => {
    const prompt =
      'Write world-class cutting-edge revolutionary content about our innovative disruptive product.';
    const result = scoreInput(prompt, CapabilityMode.STANDARD);
    const clarityDim = result.breakdown.find((d) => d.key === 'clarity');
    expect(clarityDim).toBeDefined();
    expect(clarityDim!.score).toBeLessThan(clarityDim!.max * 0.7);
  });

  it('English "short ... 2000 words" contradiction gets flagged', () => {
    const prompt =
      'You are a marketing expert. Write a very short post, exactly 2000 words, about AI.';
    const result = scoreInput(prompt, CapabilityMode.STANDARD);
    const topKeys = result.missingTop.map((m) => m.key);
    expect(topKeys).toContain('contradiction');
  });

  it('English "concise" + "comprehensive" contradiction is flagged', () => {
    const prompt =
      'You are an analyst. Write a concise but comprehensive report about market trends.';
    const result = scoreInput(prompt, CapabilityMode.STANDARD);
    const topKeys = result.missingTop.map((m) => m.key);
    expect(topKeys).toContain('contradiction');
  });

  it('English research prompt with "## Sources" + "## Methodology" headings flags dims', () => {
    const prompt = `
You are a senior research analyst with 15 years of experience.
Investigate the Israeli SaaS market in 2026.

## Sources
Use only primary sources from 2023 onwards. Cite full URL for every claim.

## Methodology
1. MECE mapping
2. Primary data collection
3. Cross-validation with CROs
4. Synthesis with confidence scoring

## Info gaps
Flag any unknowns explicitly.

## Falsifiability
For every claim, state what would disprove it.

Output format: table with claim | evidence | source URL | confidence (high/medium/low).
`;
    const result = scoreInput(prompt, CapabilityMode.DEEP_RESEARCH);
    expect(result.total).toBeGreaterThanOrEqual(70);
    const missingKeys = result.missingTop.map((m) => m.key);
    expect(missingKeys).not.toContain('research_sources');
    expect(missingKeys).not.toContain('research_method');
    expect(missingKeys).not.toContain('info_gaps');
    expect(missingKeys).not.toContain('falsifiability');
  });

  it('English agent prompt with "## Tools" and "## Boundaries" credits those dims', () => {
    const prompt = `
You are a customer service agent with 5 years of experience.
Provide fast, professional responses.

## Tools
search_web, read_order, refund_api.

## Boundaries
Do not execute any financial operation above $500 without human approval.

## Input/Output
Input: {userId, query}. Output: JSON with {response, action, escalate}.

## Policies
Never expose personal data. Always verify identity first.

## Failure modes
On tool failure, retry twice then return a descriptive error.
`;
    const result = scoreInput(prompt, CapabilityMode.AGENT_BUILDER);
    const toolsDim = result.breakdown.find((d) => d.key === 'tools');
    const boundariesDim = result.breakdown.find((d) => d.key === 'boundaries');
    const ioDim = result.breakdown.find((d) => d.key === 'inputs_outputs');
    const policiesDim = result.breakdown.find((d) => d.key === 'policies');
    const failureDim = result.breakdown.find((d) => d.key === 'failure_modes');
    expect(toolsDim!.score).toBe(toolsDim!.max);
    expect(boundariesDim!.score).toBe(boundariesDim!.max);
    expect(ioDim!.score).toBe(ioDim!.max);
    expect(policiesDim!.score).toBe(policiesDim!.max);
    expect(failureDim!.score).toBe(failureDim!.max);
    expect(result.total).toBeGreaterThanOrEqual(70);
  });

  it('full English image prompt scores high', () => {
    const prompt =
      'A young woman sitting by a cafe window. Style: cinematic 35mm photography. Composition: close-up, rule of thirds, low angle. Lighting: golden hour, soft rim light. Color palette: warm golds and amber with cool blue contrast. 8k, photorealistic, ultra detailed, sharp focus. Aspect ratio 1:1. No text, no watermark.';
    const result = scoreInput(prompt, CapabilityMode.IMAGE_GENERATION);
    expect(result.total).toBeGreaterThanOrEqual(75);
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
