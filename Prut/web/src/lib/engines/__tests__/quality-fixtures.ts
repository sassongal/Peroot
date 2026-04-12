/**
 * Quality Fixtures — Known-good and known-bad prompts for regression testing.
 *
 * These fixtures lock in baseline quality expectations for the EnhancedScorer.
 * If a skill update or scoring tweak causes a baseline prompt's score to drop
 * below its expected band, the regression suite will fail.
 *
 * Categories:
 * - badText:     prompts that should score VERY low (< 20)
 * - weakText:    prompts that should score low (< 40)
 * - mediumText:  prompts that should score 30-60
 * - strongText:  RISEN-style prompts that should score > 70
 * - eliteText:   full CO-STAR prompts that should score > 85
 * - badVisual:   visual prompts that should score low (< 40)
 * - strongVisual: visual prompts that should score > 70
 */

interface PromptFixture {
  name: string;
  prompt: string;
  /** Expected lower bound (inclusive) */
  minScore: number;
  /** Expected upper bound (inclusive). Set to 100 for "no upper limit" */
  maxScore: number;
  /** Optional notes about why the score is expected to fall in this band */
  notes?: string;
}

// ── Known-bad text prompts ──

export const badTextFixtures: PromptFixture[] = [
  {
    name: 'empty string',
    prompt: '',
    minScore: 0,
    maxScore: 0,
    notes: 'empty input must always score 0',
  },
  {
    name: 'whitespace only',
    prompt: '   \n\t  ',
    minScore: 0,
    maxScore: 0,
  },
  {
    name: 'single word',
    prompt: 'מייל',
    minScore: 0,
    maxScore: 19,
    notes: 'one Hebrew noun, no verb, no context',
  },
  {
    name: 'two-word fragment',
    prompt: 'write something',
    minScore: 0,
    maxScore: 19,
  },
];

// ── Weak text prompts (some signal but missing core dimensions) ──

export const weakTextFixtures: PromptFixture[] = [
  {
    name: 'bare task verb + object',
    prompt: 'כתוב מייל',
    minScore: 0,
    maxScore: 39,
    notes: 'has task verb but no role, audience, format, constraints',
  },
  {
    name: 'task with channel only',
    prompt: 'כתוב פוסט לפייסבוק',
    minScore: 0,
    maxScore: 39,
  },
];

// ── Medium text prompts (3-5 dimensions populated) ──

export const mediumTextFixtures: PromptFixture[] = [
  {
    name: 'role + task + audience + tone',
    prompt:
      'אתה מומחה שיווק. כתוב מייל שיווקי לקהל יעד של מנהלי IT בחברות טכנולוגיה בטון מקצועי',
    minScore: 30,
    maxScore: 65,
  },
  {
    name: 'task + numbers + format',
    prompt:
      'כתוב רשימה של 5 טיפים לשיפור מכירות, פורמט bullet, אורך 200 מילים, טון ידידותי',
    minScore: 30,
    maxScore: 65,
  },
];

// ── Strong RISEN prompts (should hit high tier) ──

export const strongTextFixtures: PromptFixture[] = [
  {
    name: 'full RISEN Hebrew prompt',
    prompt: `אתה סטרטג שיווק דיגיטלי בכיר עם 15 שנות ניסיון בקמפיינים B2B SaaS, מתמחה במודל AARRR.

המשימה: כתוב מייל שיווקי לקהל יעד של מנהלי IT בחברות בינוניות (50-200 עובדים).

הקשר ורקע: המוצר הוא פלטפורמת ניטור ביצועים חדשה, מחיר 500 דולר לחודש, מתחרים: Datadog, New Relic.

קהל יעד: מנהלי IT עם 5-10 שנות ניסיון, אחראים על תקציבים של 100K-500K דולר.

פורמט פלט:
- נושא: עד 50 תווים
- פתיחה אישית
- 3 נקודות מפתח עם מספרים
- CTA ברור
- אורך: 200 מילים

הנחיות ומגבלות:
- טון מקצועי-ידידותי בעברית
- אל תכלול מונחים טכניים מורכבים
- אל תשתמש בביטויים שיווקיים שחוקים
- צטט מקור אחד אמין

דוגמה לפלט: "שלום [שם], לפני שבוע ראיתי..."

בסס את התוכן על עובדות. אם אינך בטוח - ציין זאת.`,
    minScore: 70,
    maxScore: 100,
    notes: 'should hit high tier with role+credentials, format, constraints, examples, grounding',
  },
];

// ── Elite CO-STAR prompts (should hit elite tier 90+) ──

export const eliteTextFixtures: PromptFixture[] = [
  {
    name: 'elite CO-STAR with all 15 dimensions',
    prompt: `אתה Dr. Sarah Cohen, סטרטגית שיווק דיגיטלי בכירה עם 18 שנות ניסיון מוסמך ב-MIT, מתמחה במודל AARRR ו-Product-Led Growth, יועצת לחברות Fortune 500 כמו Microsoft ו-Salesforce.

Context: חברת SaaS ישראלית בשם DataFlow, ARR של 5M דולר, 80 עובדים, מתמחה ב-data observability לחברות פינטק.

Objective: כתוב מייל שיווקי שיגדיל את שיעור הקליקים מ-2.3% ל-5% ברבעון הקרוב.

Style: מייל cold outreach בסגנון פרסונלי-נתוני, עם hook שאלה פרובוקטיבית.

Tone: מקצועי-ידידותי, סמכותי אך לא מתנשא, שפה ברורה ללא buzzwords.

Audience: VPs of Engineering ו-CTOs בחברות פינטק ישראליות עם 100-500 עובדים, מקבלים 50+ מיילים יומית.

Response format:
- נושא: עד 45 תווים, חובה לכלול מספר
- פתיחה: 2 משפטים מקסימום, התייחסות אישית לחברה
- גוף: בדיוק 3 פסקאות, כל אחת בת 25-35 מילים
- CTA: שאלה פתוחה לפגישת 15 דקות
- אורך כולל: 150-180 מילים, לא יותר ולא פחות
- פורמט markdown עם **bold** להדגשות

מגבלות:
- אל תכלול: "מהפכני", "פורץ דרך", "מוביל בתעשייה", "AI", "blockchain"
- אסור להשתמש בקלישאות שיווקיות
- ללא יותר מ-3 פריטים ברשימה
- שפה: עברית בלבד, מינימום 150 מילים, מקסימום 180 מילים
- אם אינך בטוח בנתון - ציין במפורש "אינני בטוח"

דוגמה לפלט:
Subject: 47% שיפור ב-uptime
"שלום דוד, ראיתי שהקבוצה שלך פרסמה אתמול על אתגרי..."

בסס את כל הטענות על עובדות מאומתות. צטט מקור לכל מספר. אם אין לך מקור אמין - אל תמציא, ציין זאת.

חשוב צעד אחר צעד לפני הכתיבה: 1) זהה את הכאב המרכזי 2) הצע ערך מדיד 3) צור urgency עדין.`,
    minScore: 80,
    maxScore: 100,
    notes: 'CO-STAR framework, all 15 dimensions populated',
  },
];

// ── Visual: known-bad prompts ──

export const badVisualFixtures: PromptFixture[] = [
  {
    name: 'bare visual concept',
    prompt: 'cat',
    minScore: 0,
    maxScore: 39,
  },
  {
    name: 'two-word visual',
    prompt: 'beautiful sunset',
    minScore: 0,
    maxScore: 39,
  },
];

// ── Visual: strong prompts (cover most layers) ──

export const strongVisualFixtures: PromptFixture[] = [
  {
    name: 'detailed visual portrait',
    prompt:
      'A photorealistic close-up portrait of an elderly Japanese woman in her 70s, weathered face with kind brown eyes, wearing a navy blue silk kimono, hair in a traditional bun. Studio lighting, soft golden hour key light from camera left, gentle fill, deep shadow on the right side of her face, dramatic high contrast. Warm amber and deep crimson color palette, cinematic mood. Shot on Sony A7IV with 85mm f/1.4 lens, 4k, ultra detailed, masterpiece, professional editorial portrait photography.',
    minScore: 65,
    maxScore: 100,
  },
];

// ── Strong video prompts (should also include motion dimension) ──

export const strongVideoFixtures: PromptFixture[] = [
  {
    name: 'detailed cinematic video',
    prompt:
      'Wide tracking shot following a young woman in a red dress as she walks through a misty forest at golden hour. Camera glides smoothly via steadicam, dollying alongside her at waist height. She turns and smiles softly toward camera. Particles of dust and pollen float in the warm backlit beams piercing through the trees. Soft natural lighting, golden hour key light, warm amber and deep emerald color palette, cinematic mood. Shot on ARRI Alexa with 35mm lens, anamorphic look, in the style of Emmanuel Lubezki. Wind rustles through leaves, mist drifts across the ground. 4k professional cinematography.',
    minScore: 65,
    maxScore: 100,
  },
];
