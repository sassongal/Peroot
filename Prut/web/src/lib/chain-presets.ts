/**
 * 10 preset chain templates for the public library.
 * Each preset is a ready-to-use GeneratedChain that users can save and run.
 */

import type { GeneratedChain } from "./chain-types";

export const CHAIN_PRESETS: GeneratedChain[] = [
  {
    chain_id: "preset_newsletter",
    title: "Newsletter שבועי",
    description: "מחקר נושאים, כתיבת תוכן, subject lines ופוסט לסושיאל",
    steps: [
      {
        step_number: 1,
        title: "מחקר נושאים טרנדיים",
        mode: "research",
        prompt: `אתה עורך תוכן מקצועי המתמחה בניוזלטרים.

משימתך: מצא 5 נושאים טרנדיים ורלוונטיים בתחום {keyword} לקהל יעד של {target_audience}.

לכל נושא ציין:
1. כותרת הנושא
2. למה הוא רלוונטי עכשיו (2-3 משפטים)
3. זווית ייחודית אפשרית
4. מקור או דוגמה

מגבלות:
- התמקד בנושאים מהשבוע האחרון
- העדף נושאים עם ערך מעשי לקורא
- הימנע מנושאים שחוקים או כלליים מדי`,
        variables: [
          { name: "keyword", label: "תחום", default: "טכנולוגיה" },
          { name: "target_audience", label: "קהל יעד", default: "מנהלים ויזמים בישראל" },
        ],
        input_from_step: null,
        output_description: "רשימה של 5 נושאים טרנדיים עם זוויות ייחודיות",
      },
      {
        step_number: 2,
        title: "כתיבת גוף ה-Newsletter",
        mode: "text",
        prompt: `אתה כותב ניוזלטרים מקצועי עם סגנון כתיבה שהוא מעניין, תמציתי וידידותי.

בהתבסס על הפלט הקודם (רשימת נושאים טרנדיים), כתוב ניוזלטר שבועי מלא.

מבנה הניוזלטר:
1. פתיח מעניין (2-3 משפטים שמעוררים סקרנות)
2. סקציה 1 — הנושא המרכזי (150-200 מילים)
3. סקציה 2 — תובנה מעשית (100-150 מילים)
4. סקציה 3 — טיפ מהיר או כלי שימושי (50-80 מילים)
5. CTA — קריאה לפעולה בסיום

סגנון:
- טון שיחתי-מקצועי
- משפטים קצרים
- כולל emoji מותאם 1-2 לסקציה
- בעברית`,
        variables: [],
        input_from_step: 1,
        output_description: "גוף Newsletter מלא עם 3 סקציות",
      },
      {
        step_number: 3,
        title: "כותרות ו-Subject Lines",
        mode: "text",
        prompt: `אתה מומחה לשיווק במייל עם ניסיון בכתיבת subject lines שמשיגים open rates גבוהים.

בהתבסס על הפלט הקודם (גוף ה-Newsletter), צור:

1. **5 אפשרויות ל-Subject Line** — כל אחת עם:
   - הכותרת עצמה
   - סוג הגישה (סקרנות / ערך / דחיפות / שאלה / מספר)
   - ציון open-rate צפוי (1-10)

2. **Preview text** (2-3 אפשרויות) — הטקסט שמופיע אחרי ה-subject

3. **Pre-header** מומלץ

כללים:
- אורך subject מקסימלי: 50 תווים
- הימנע מ-spam words
- לפחות אחד עם אימוג'י
- בעברית`,
        variables: [],
        input_from_step: 2,
        output_description: "5 subject lines עם ציון open-rate צפוי",
      },
      {
        step_number: 4,
        title: "פוסט LinkedIn לקידום",
        mode: "text",
        prompt: `אתה מומחה לכתיבת תוכן ב-LinkedIn שמייצר engagement גבוה.

בהתבסס על הפלט הקודם (תוכן ה-Newsletter), כתוב פוסט LinkedIn שמקדם את ה-Newsletter.

מבנה הפוסט:
1. Hook — שורה ראשונה שעוצרת גלילה (שאלה / סטטיסטיקה / טענה מפתיעה)
2. גוף — 3-4 תובנות מפתח מה-Newsletter (bullet points)
3. CTA — הנעה להירשם / לקרוא
4. האשטגים — 3-5 רלוונטיים

כללים:
- אורך: 150-250 מילים
- שימוש ברווחים בין שורות (קריא ב-LinkedIn)
- סגנון אישי-מקצועי
- בעברית`,
        variables: [],
        input_from_step: 2,
        output_description: "פוסט LinkedIn עם hook, תובנות ו-CTA",
      },
    ],
  },
  {
    chain_id: "preset_social_series",
    title: "סדרת פוסטים שבועית",
    description: "רעיון מרכזי → 5 פוסטים → stories → אסטרטגיית engagement",
    steps: [
      {
        step_number: 1,
        title: "הגדרת רעיון מרכזי וזוויות",
        mode: "research",
        prompt: `אתה אסטרטג תוכן לרשתות חברתיות.

פתח רעיון מרכזי לסדרת פוסטים שבועית בנושא {topic} עבור {brand_type}.

הפלט:
1. הנושא המרכזי של השבוע
2. 5 זוויות שונות — כל אחת תהפוך לפוסט
3. הנרטיב שמחבר את כל הפוסטים
4. האשטג ייחודי לסדרה
5. טון וסגנון מומלצים

כללים:
- כל זווית צריכה לעמוד בפני עצמה אבל גם להתחבר לשאר
- שילוב בין ערך, בידור וקשר אישי`,
        variables: [
          { name: "topic", label: "נושא", default: "יזמות ועסקים" },
          { name: "brand_type", label: "סוג מותג", default: "עסק קטן" },
        ],
        input_from_step: null,
        output_description: "רעיון מרכזי + 5 זוויות לפוסטים",
      },
      {
        step_number: 2,
        title: "כתיבת 5 פוסטים",
        mode: "text",
        prompt: `אתה קופירייטר מומחה לרשתות חברתיות.

בהתבסס על הפלט הקודם (5 זוויות), כתוב 5 פוסטים מלאים.

לכל פוסט:
- Hook (שורה ראשונה עוצרת)
- גוף (80-150 מילים)
- CTA
- 3-5 האשטגים
- הצעת ויזואל (תיאור תמונה/סרטון)
- יום מומלץ לפרסום (א'-ה')

כללים:
- סגנון מותאם לאינסטגרם/פייסבוק
- מגוון פורמטים: שאלה, רשימה, סיפור, טיפ, ציטוט
- בעברית`,
        variables: [],
        input_from_step: 1,
        output_description: "5 פוסטים מלאים עם ויזואלים מומלצים",
      },
      {
        step_number: 3,
        title: "Stories ותוכן אינטראקטיבי",
        mode: "text",
        prompt: `אתה מומחה ל-Stories ותוכן אינטראקטיבי.

בהתבסס על הפלט הקודם (5 פוסטים), צור תוכן Stories משלים:

לכל פוסט — 3 Stories:
1. Teaser (לפני הפוסט)
2. Highlight (מהפוסט עצמו)
3. Engagement (אחרי — סקר/שאלה/quiz)

כולל:
- טקסט לכל Story
- סטיקרים מומלצים (סקר, שאלון, countdown)
- רקע/צבע מומלץ
- CTA (swipe up / link in bio / DM)

בעברית, 15 stories סה"כ.`,
        variables: [],
        input_from_step: 2,
        output_description: "15 Stories מחולקים ל-5 סטים של 3",
      },
    ],
  },
  {
    chain_id: "preset_seo_blog",
    title: "מאמר SEO מלא",
    description: "מחקר מילות מפתח → מתווה → מאמר → meta tags → פוסט סושיאל",
    steps: [
      {
        step_number: 1,
        title: "מחקר מילות מפתח",
        mode: "research",
        prompt: `אתה מומחה SEO ומחקר מילות מפתח.

בצע מחקר מילות מפתח עבור מאמר בנושא {topic}.

הפלט:
1. מילת מפתח ראשית (primary keyword)
2. 5-8 מילות מפתח משניות (secondary)
3. 5 שאלות נפוצות שאנשים שואלים (PAA - People Also Ask)
4. 3 נושאים קשורים (LSI keywords)
5. כוונת חיפוש (informational / transactional / navigational)
6. קושי משוער (נמוך/בינוני/גבוה)

כללים:
- התמקד בעברית
- העדף מילות מפתח עם כוונת חיפוש ברורה
- כלול long-tail keywords`,
        variables: [
          { name: "topic", label: "נושא המאמר", default: "" },
        ],
        input_from_step: null,
        output_description: "רשימת מילות מפתח + שאלות נפוצות + כוונת חיפוש",
      },
      {
        step_number: 2,
        title: "מתווה מאמר (Outline)",
        mode: "text",
        prompt: `אתה עורך תוכן בכיר המתמחה במאמרי SEO.

בהתבסס על הפלט הקודם (מחקר מילות מפתח), צור מתווה מפורט למאמר:

1. כותרת ראשית (H1) — כולל מילת מפתח ראשית
2. מבוא (100 מילים) — hook + הבטחת ערך
3. 4-6 סקציות (H2) — כל אחת עם:
   - כותרת משנה
   - 2-3 נקודות עיקריות
   - מילת מפתח משנית משולבת
4. FAQ — 3-5 שאלות (מה-PAA)
5. סיכום + CTA

כללים:
- אורך מטרה: 1,500-2,000 מילים
- כל H2 צריך לענות על שאלה ספציפית
- מבנה סקימבילי (scannable)`,
        variables: [],
        input_from_step: 1,
        output_description: "מתווה מפורט עם כותרות H2 ונקודות עיקריות",
      },
      {
        step_number: 3,
        title: "כתיבת המאמר",
        mode: "text",
        prompt: `אתה כותב תוכן SEO מקצועי.

בהתבסס על הפלט הקודם (מתווה המאמר), כתוב את המאמר המלא.

כללים:
- בעברית שוטפת וטבעית
- שלב מילות מפתח באופן טבעי (לא keyword stuffing)
- פסקאות קצרות (2-3 משפטים)
- שימוש ב-bullet points ורשימות
- כלול דוגמאות מעשיות
- סגנון מקצועי אך נגיש
- 1,500-2,000 מילים`,
        variables: [],
        input_from_step: 2,
        output_description: "מאמר SEO מלא בעברית",
      },
      {
        step_number: 4,
        title: "Meta Tags ו-Schema",
        mode: "text",
        prompt: `אתה מומחה SEO טכני.

בהתבסס על הפלט הקודם (המאמר), צור:

1. **Meta Title** (50-60 תווים) — 3 אפשרויות
2. **Meta Description** (150-160 תווים) — 3 אפשרויות
3. **URL Slug** מומלץ
4. **Schema Markup** (JSON-LD) — Article schema
5. **Alt text** ל-3 תמונות מומלצות
6. **Internal linking** — 3 הצעות לקישורים פנימיים

כללים:
- Meta title חייב לכלול מילת מפתח ראשית
- Meta description חייב לכלול CTA
- URL slug קצר וברור`,
        variables: [],
        input_from_step: 3,
        output_description: "Meta tags, schema markup ו-alt texts",
      },
      {
        step_number: 5,
        title: "פוסט סושיאל לקידום",
        mode: "text",
        prompt: `אתה מומחה שיווק תוכן בסושיאל.

בהתבסס על הפלט הקודם (המאמר ו-meta tags), כתוב 3 פוסטים שונים לקידום המאמר:

1. **פוסט LinkedIn** — מקצועי, 150-200 מילים, תובנה + קישור
2. **פוסט Twitter/X** — 280 תווים, hook + קישור
3. **פוסט Facebook** — שיחתי, 100-150 מילים, שאלה + קישור

לכל פוסט:
- האשטגים מותאמים לפלטפורמה
- CTA ברור
- זמן פרסום מומלץ

בעברית.`,
        variables: [],
        input_from_step: 3,
        output_description: "3 פוסטים לפלטפורמות שונות",
      },
    ],
  },
  {
    chain_id: "preset_proposal",
    title: "הצעת מחיר",
    description: "brief → scope → תמחור → מכתב נלווה",
    steps: [
      {
        step_number: 1,
        title: "ניתוח Brief",
        mode: "text",
        prompt: `אתה יועץ עסקי מנוסה.

נתח את הבריף הבא מהלקוח ומצא:

{client_brief}

הפלט:
1. סיכום הצרכים (3-5 נקודות)
2. אתגרים מזוהים
3. הזדמנויות
4. שאלות הבהרה (אם חסר מידע)
5. מתחרים אפשריים
6. דגשים מיוחדים שהלקוח ציין`,
        variables: [
          { name: "client_brief", label: "בריף מהלקוח", default: "" },
        ],
        input_from_step: null,
        output_description: "ניתוח מובנה של הצרכים והאתגרים",
      },
      {
        step_number: 2,
        title: "הגדרת Scope",
        mode: "text",
        prompt: `אתה מנהל פרויקטים בכיר.

בהתבסס על הפלט הקודם (ניתוח הבריף), הגדר scope מפורט:

1. **Deliverables** — רשימת תוצרים מדויקת
2. **Timeline** — שלבי ביצוע + אבני דרך
3. **Out of Scope** — מה לא כלול (חשוב!)
4. **תלויות** — מה נדרש מהלקוח
5. **סיכונים** — 2-3 סיכונים + mitigation

פורמט מקצועי, ברור, בעברית.`,
        variables: [],
        input_from_step: 1,
        output_description: "Scope מפורט עם deliverables ו-timeline",
      },
      {
        step_number: 3,
        title: "תמחור",
        mode: "text",
        prompt: `אתה מומחה תמחור ומכירות.

בהתבסס על הפלט הקודם (Scope), בנה הצעת תמחור:

1. **חלוקה לשלבים** — עלות לכל שלב
2. **3 מסלולים** (Basic / Pro / Premium)
3. **תנאי תשלום** מומלצים
4. **בונוסים** — מה נותנים מעבר (ערך נוסף)
5. **תוקף ההצעה**

כללים:
- הצג ערך לפני מחיר
- בנה anchoring (מסלול יקר ראשון)
- כלול ROI צפוי
- בעברית`,
        variables: [],
        input_from_step: 2,
        output_description: "הצעת מחיר ב-3 מסלולים",
      },
      {
        step_number: 4,
        title: "מכתב נלווה",
        mode: "text",
        prompt: `אתה מומחה מכירות ותקשורת עסקית.

בהתבסס על הפלט הקודם (הצעת המחיר), כתוב מכתב נלווה:

1. פנייה אישית
2. הבנת הצורך (1-2 משפטים שמראים שהקשבת)
3. למה אנחנו הבחירה הנכונה (3 נקודות)
4. סיכום ההצעה (תמצית)
5. Next steps ברורים
6. חתימה מקצועית

כללים:
- קצר (200-300 מילים)
- מקצועי אך חם
- מסתיים ב-CTA ברור
- בעברית`,
        variables: [],
        input_from_step: 3,
        output_description: "מכתב נלווה מקצועי להצעת המחיר",
      },
    ],
  },
  {
    chain_id: "preset_exam",
    title: "מבחן + מפתח תשובות",
    description: "נושא → שאלות → מפתח → רובריקת הערכה",
    steps: [
      {
        step_number: 1,
        title: "יצירת שאלות מבחן",
        mode: "text",
        prompt: `אתה מורה ומומחה ביצירת מבחנים.

צור מבחן בנושא {subject} לרמת {level}.

מבנה המבחן:
1. 5 שאלות אמריקאיות (4 אפשרויות כל אחת)
2. 3 שאלות פתוחות קצרות
3. 2 שאלות פתוחות ארוכות (הרחבה)
4. שאלת בונוס (אתגר)

לכל שאלה:
- ניקוד
- רמת קושי (קל/בינוני/קשה)
- מיומנות נבדקת (ידע/הבנה/ניתוח/יישום)

כללים:
- שאלות ברורות וחד-משמעיות
- הסחות סבירות בשאלות אמריקאיות
- בעברית`,
        variables: [
          { name: "subject", label: "נושא", default: "" },
          { name: "level", label: "רמה", default: "תיכון" },
        ],
        input_from_step: null,
        output_description: "מבחן מלא עם 11 שאלות + ניקוד",
      },
      {
        step_number: 2,
        title: "מפתח תשובות",
        mode: "text",
        prompt: `אתה מורה ומעריך מבחנים.

בהתבסס על הפלט הקודם (שאלות המבחן), צור מפתח תשובות מלא:

לכל שאלה:
1. תשובה נכונה + הסבר קצר
2. שאלות אמריקאיות: למה שאר האפשרויות שגויות
3. שאלות פתוחות: תשובה מיטבית + נקודות חובה
4. שאלות הרחבה: מתווה תשובה + מילות מפתח

בעברית.`,
        variables: [],
        input_from_step: 1,
        output_description: "מפתח תשובות מלא עם הסברים",
      },
      {
        step_number: 3,
        title: "רובריקת הערכה",
        mode: "text",
        prompt: `אתה מומחה בהערכה ומדידה בחינוך.

בהתבסס על הפלט הקודם (מפתח התשובות), צור רובריקת הערכה:

1. טבלת ניקוד מפורטת לכל שאלה
2. קריטריונים לכל רמת ציון (מצוין/טוב/מספיק/לא מספיק)
3. חלוקת ניקוד כוללת
4. ציון עובר
5. המלצות להערות על גבי המבחן

פורמט טבלה ברור, בעברית.`,
        variables: [],
        input_from_step: 2,
        output_description: "רובריקת הערכה מפורטת",
      },
    ],
  },
  {
    chain_id: "preset_ad_campaign",
    title: "קמפיין מודעות",
    description: "קהל יעד → 5 קופיים → דף נחיתה → email follow-up",
    steps: [
      {
        step_number: 1,
        title: "הגדרת קהל יעד",
        mode: "research",
        prompt: `אתה מומחה פרסום ממומן.

הגדר קהל יעד מפורט לקמפיין בנושא {product}:

1. **דמוגרפיה** — גיל, מגדר, מיקום, הכנסה
2. **פסיכוגרפיה** — ערכים, תחומי עניין, כאבים
3. **התנהגות** — איפה מבלים אונליין, מה קונים
4. **Buyer Persona** — 2 פרסונות מפורטות
5. **Targeting recommendations** — קהלים ב-Facebook/Google

בעברית.`,
        variables: [
          { name: "product", label: "מוצר/שירות", default: "" },
        ],
        input_from_step: null,
        output_description: "2 Buyer Personas + targeting recommendations",
      },
      {
        step_number: 2,
        title: "5 קופיים למודעות",
        mode: "text",
        prompt: `אתה קופירייטר מודעות מנוסה.

בהתבסס על הפלט הקודם (קהל יעד), כתוב 5 גרסאות מודעה:

לכל מודעה:
1. Headline ראשי (40 תווים מקס)
2. Headline משני
3. Body text (90 מילים מקס)
4. CTA button text
5. גישת שכנוע (כאב / שאיפה / FOMO / social proof / סקרנות)

כללים:
- 5 גישות שונות
- A/B test ready
- בעברית`,
        variables: [],
        input_from_step: 1,
        output_description: "5 גרסאות מודעה עם גישות שכנוע שונות",
      },
      {
        step_number: 3,
        title: "מתווה דף נחיתה",
        mode: "text",
        prompt: `אתה מומחה conversion ודפי נחיתה.

בהתבסס על הפלט הקודם (קופיי מודעות), צור מתווה דף נחיתה:

1. **Hero Section** — כותרת + תת-כותרת + CTA + תמונה
2. **Social Proof** — ציטוטים / לוגואים / מספרים
3. **Benefits** — 3-4 יתרונות עם אייקונים
4. **How It Works** — 3 שלבים
5. **FAQ** — 5 שאלות נפוצות
6. **CTA final** — הנעה אחרונה

כללים:
- מיקוד ב-conversion אחד
- Above the fold — הכל ברור
- Mobile first
- בעברית`,
        variables: [],
        input_from_step: 2,
        output_description: "מתווה דף נחיתה מלא עם כל הסקציות",
      },
      {
        step_number: 4,
        title: "Email Follow-up",
        mode: "text",
        prompt: `אתה מומחה email marketing ו-nurture sequences.

בהתבסס על הפלט הקודם (דף נחיתה), כתוב סדרת 3 מיילים:

**מייל 1** (מיידי) — תודה + delivery של ההבטחה
**מייל 2** (יום 2) — ערך נוסף + social proof
**מייל 3** (יום 5) — הצעה / urgency / CTA חזק

לכל מייל:
- Subject line (3 אפשרויות)
- Preview text
- גוף (150-200 מילים)
- CTA
- P.S. (אופציונלי)

בעברית, סגנון אישי ומקצועי.`,
        variables: [],
        input_from_step: 3,
        output_description: "3 מיילים עם subject lines",
      },
    ],
  },
  {
    chain_id: "preset_lesson_plan",
    title: "תוכנית שיעור שבועית",
    description: "נושא → 5 שיעורים → דפי עבודה → מבחן סיכום",
    steps: [
      {
        step_number: 1,
        title: "תכנון 5 שיעורים",
        mode: "text",
        prompt: `אתה מורה מנוסה ומומחה בתכנון לימודים.

תכנן 5 שיעורים שבועיים בנושא {subject} לכיתה {grade}.

לכל שיעור (45 דקות):
1. נושא השיעור
2. מטרות למידה (2-3)
3. מהלך השיעור:
   - פתיחה (5 דק) — hook
   - גוף (30 דק) — פעילויות
   - סיכום (10 דק)
4. אמצעי הוראה (מצגת/סרטון/חומר)
5. משימת בית

הדרגתיות: מקל למורכב לאורך השבוע.
בעברית.`,
        variables: [
          { name: "subject", label: "נושא", default: "" },
          { name: "grade", label: "כיתה", default: "ח'" },
        ],
        input_from_step: null,
        output_description: "5 מערכי שיעור מפורטים",
      },
      {
        step_number: 2,
        title: "דפי עבודה",
        mode: "text",
        prompt: `אתה מומחה ביצירת חומרי לימוד.

בהתבסס על הפלט הקודם (5 שיעורים), צור דפי עבודה:

לכל שיעור — דף עבודה אחד:
1. כותרת ושם התלמיד
2. 3-4 תרגילים מדורגים
3. שאלת חשיבה / אתגר
4. תיבת סיכום (התלמיד כותב מה למד)

כללים:
- שפה ברורה ומותאמת גיל
- הוראות חד-משמעיות
- מקום לכתיבה
- בעברית`,
        variables: [],
        input_from_step: 1,
        output_description: "5 דפי עבודה מדורגים",
      },
      {
        step_number: 3,
        title: "מבחן סיכום שבועי",
        mode: "text",
        prompt: `אתה מומחה הערכה בחינוך.

בהתבסס על הפלט הקודם (דפי העבודה והשיעורים), צור מבחן סיכום:

1. 5 שאלות אמריקאיות (כיסוי כל השיעורים)
2. 3 שאלות פתוחות
3. שאלת יישום (העברה לחיים)
4. מפתח תשובות
5. ניקוד מוצע

כללים:
- מכסה את כל 5 השיעורים
- מדרג: ידע → הבנה → יישום
- 30 דקות
- בעברית`,
        variables: [],
        input_from_step: 2,
        output_description: "מבחן סיכום עם מפתח תשובות",
      },
    ],
  },
  {
    chain_id: "preset_landing_page",
    title: "דף נחיתה",
    description: "מחקר מתחרים → קופי → מבנה סקציות → SEO",
    steps: [
      {
        step_number: 1,
        title: "מחקר מתחרים",
        mode: "research",
        prompt: `אתה מנתח שיווקי מקצועי.

בצע ניתוח מתחרים עבור {product_type}:

1. 3 מתחרים עיקריים — מה הם עושים טוב/רע
2. USP (Unique Selling Proposition) שלנו vs. שלהם
3. Pain points של הקהל שלא מקבלים מענה
4. מסרים שעובדים בתעשייה
5. הזדמנויות לבידול

בעברית.`,
        variables: [
          { name: "product_type", label: "מוצר/שירות", default: "" },
        ],
        input_from_step: null,
        output_description: "ניתוח מתחרים + USP + הזדמנויות",
      },
      {
        step_number: 2,
        title: "קופי לדף נחיתה",
        mode: "text",
        prompt: `אתה קופירייטר conversion.

בהתבסס על הפלט הקודם (ניתוח מתחרים), כתוב את כל הטקסטים לדף:

1. Hero: כותרת + תת-כותרת + CTA
2. Social Proof: 3 ציטוטים + 3 מספרים
3. Benefits: 4 יתרונות (כותרת + פסקה + אייקון)
4. How It Works: 3 שלבים
5. Pricing: 3 מסלולים + כפתורי CTA
6. FAQ: 6 שאלות ותשובות
7. Final CTA: headline + sub + button

בעברית, סגנון משכנע ותמציתי.`,
        variables: [],
        input_from_step: 1,
        output_description: "קופי מלא ל-7 סקציות",
      },
      {
        step_number: 3,
        title: "Meta Tags ו-SEO",
        mode: "text",
        prompt: `אתה מומחה SEO לדפי נחיתה.

בהתבסס על הפלט הקודם (קופי הדף), צור:

1. Meta Title (3 אפשרויות)
2. Meta Description (3 אפשרויות)
3. OG Tags (title, description, image description)
4. Schema Markup (JSON-LD Product/Service)
5. H1-H6 hierarchy מומלצת
6. Alt text ל-5 תמונות מומלצות

בעברית.`,
        variables: [],
        input_from_step: 2,
        output_description: "Meta tags, schema ו-SEO מלא",
      },
    ],
  },
  {
    chain_id: "preset_product_launch",
    title: "השקת מוצר",
    description: "מסר מרכזי → press release → סושיאל → email",
    steps: [
      {
        step_number: 1,
        title: "הגדרת מסר מרכזי",
        mode: "text",
        prompt: `אתה אסטרטג מותגים ושיווק.

הגדר את המסר המרכזי להשקת {product_name}:

1. Elevator Pitch (30 מילים)
2. Value Proposition (משפט אחד)
3. Key Messages (3 מסרים מרכזיים)
4. Proof Points (3 הוכחות/נתונים)
5. Brand Voice Guidelines להשקה
6. Target Audience + Persona

בעברית.`,
        variables: [
          { name: "product_name", label: "שם המוצר", default: "" },
        ],
        input_from_step: null,
        output_description: "מסר מרכזי + value proposition + key messages",
      },
      {
        step_number: 2,
        title: "הודעה לעיתונות",
        mode: "text",
        prompt: `אתה כתב יחסי ציבור.

בהתבסס על הפלט הקודם, כתוב הודעה לעיתונות:

1. כותרת (headline + subheadline)
2. פסקה ראשונה — מי, מה, מתי, למה
3. ציטוט מהמנכ"ל
4. פרטים טכניים / תכונות
5. זמינות ומחיר
6. Boilerplate (על החברה)
7. פרטי קשר

פורמט AP style, בעברית, 400-500 מילים.`,
        variables: [],
        input_from_step: 1,
        output_description: "הודעה לעיתונות מלאה",
      },
      {
        step_number: 3,
        title: "פוסטים לסושיאל",
        mode: "text",
        prompt: `אתה מומחה סושיאל ו-launch campaigns.

בהתבסס על הפלט הקודם, צור חבילת פוסטים להשקה:

1. **Teaser** (שבוע לפני) — 2 פוסטים מסתוריים
2. **Launch Day** — 3 פוסטים (LinkedIn, Instagram, Twitter)
3. **Day After** — 1 פוסט תגובות ראשוניות
4. **Week After** — 1 פוסט סיכום

לכל פוסט: טקסט + האשטגים + visual description.
בעברית.`,
        variables: [],
        input_from_step: 2,
        output_description: "7 פוסטים לפני, ביום ואחרי ההשקה",
      },
    ],
  },
  {
    chain_id: "preset_content_repurpose",
    title: "מחזור תוכן",
    description: "מאמר/פודקאסט → 10 פורמטים → לוח שנה",
    steps: [
      {
        step_number: 1,
        title: "ניתוח ופירוק התוכן",
        mode: "text",
        prompt: `אתה אסטרטג תוכן המתמחה ב-content repurposing.

נתח את התוכן הבא וחלץ ממנו את כל ה"גרעינים" שניתן למחזר:

{original_content}

הפלט:
1. 5 תובנות מפתח (quotes/insights)
2. 3 סטטיסטיקות או נתונים
3. 2 סיפורים/דוגמאות
4. רשימת טיפים (אם יש)
5. שאלות שהתוכן עונה עליהן

בעברית.`,
        variables: [
          { name: "original_content", label: "הדבק את התוכן המקורי", default: "" },
        ],
        input_from_step: null,
        output_description: "גרעיני תוכן: תובנות, נתונים, סיפורים, טיפים",
      },
      {
        step_number: 2,
        title: "10 פורמטים שונים",
        mode: "text",
        prompt: `אתה מומחה content repurposing.

בהתבסס על הפלט הקודם (גרעיני תוכן), צור 10 יחידות תוכן:

1. Thread טוויטר (5-8 ציוצים)
2. קרוסלת אינסטגרם (6 שקופיות)
3. פוסט LinkedIn ארוך
4. Reel/TikTok script (30 שניות)
5. ציטוט גרפי (quote card)
6. Infographic (מתווה טקסטואלי)
7. Email newsletter snippet
8. Story poll (3 שאלות)
9. מאמר מקוצר (200 מילים)
10. פוסט שאלה/דיון

לכל יחידה: טקסט מוכן + פלטפורמה + visual notes.
בעברית.`,
        variables: [],
        input_from_step: 1,
        output_description: "10 יחידות תוכן מוכנות לפרסום",
      },
      {
        step_number: 3,
        title: "לוח שנה שבועי",
        mode: "text",
        prompt: `אתה מנהל תוכן וסושיאל.

בהתבסס על הפלט הקודם (10 יחידות תוכן), בנה לוח שנה שבועי:

לכל יום (א'-ה'):
1. פלטפורמה
2. פורמט (פוסט/story/reel)
3. שעת פרסום מומלצת
4. תוכן (הפניה ליחידה הרלוונטית)
5. מטרה (reach/engagement/conversion)
6. קישור לתוכן מקורי (כן/לא)

בנוסף:
- סה"כ פרסומים בשבוע
- מטרת engagement כוללת
- טיפ לאופטימיזציה

בעברית.`,
        variables: [],
        input_from_step: 2,
        output_description: "לוח שנה שבועי עם 10 פרסומים",
      },
    ],
  },
];
