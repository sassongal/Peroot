/* ================================================================
 *  IMAGE GUIDES — Hebrew AI image-generation prompt guides
 *  ================================================================
 *  Exports the shared Guide interface (used by video-guides.ts too)
 *  and IMAGE_GUIDES: Guide[] with 7 platform-specific guides.
 * ================================================================ */

// ── shared types ────────────────────────────────────────────────
export interface GuideParam {
  name: string;
  values: string;
  description: string;
}

export interface GuideExample {
  concept: string;
  prompt: string;
  explanation: string;
}

export interface GuideMistake {
  bad: string;
  good: string;
  why: string;
}

export interface Guide {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  platform: string;
  category: "image" | "video";
  color: string;
  icon: string;
  readTime: string;
  lastUpdated: string;
  relatedSlugs: string[];

  intro: string;
  whatIs: string;
  structure: string;
  rules: string[];
  params: GuideParam[];
  examples: GuideExample[];
  mistakes: GuideMistake[];
  personalTip: string;
  faq: { question: string; answer: string }[];
}

// ── guides ──────────────────────────────────────────────────────
export const IMAGE_GUIDES: Guide[] = [
  /* ──────────────────────────────────────────────
   * 1. Midjourney
   * ────────────────────────────────────────────── */
  {
    slug: "midjourney",
    title: "מדריך פרומפטים למידג׳רני v7 — המדריך המלא",
    metaTitle: "מדריך פרומפטים ל-Midjourney v7 — נוסחה, פרמטרים וטיפים | Peroot",
    metaDescription:
      "למד ליצור תמונות AI מדהימות עם Midjourney v7 — נוסחת 4 רכיבים, פרמטרים מתקדמים כמו --sref ו---oref, דוגמאות מעשיות וטיפים",
    platform: "Midjourney v7",
    category: "image",
    color: "#f59e0b",
    icon: "✨",
    readTime: "8 דקות קריאה",
    lastUpdated: "2026-04-06",
    relatedSlugs: ["gpt-image", "flux", "image-prompts"],

    intro: `<p>כשהתחלתי לעבוד עם Midjourney, הייתי כותב פרומפטים ארוכים ומסובכים עם 50 מילים ותוצאה בינונית. אחרי מאות ניסויים הבנתי שהסוד הוא לא באורך — אלא במבנה.</p>
<p>Midjourney v7 שינה את כל הכללים. במקום רשימת מילות מפתח, המודל מעדיף <strong>שפה טבעית</strong> — תיאורים זורמים שנקראים כמו סיפור קצר. הפרמטרים המתקדמים — style references, object references, personalize — הופכים את Midjourney לכלי מקצועי ברמה אחרת.</p>
<p>v8 Alpha כבר כאן עם מצב --hd שמייצר תמונות ברזולוציות גבוהות במיוחד. במדריך הזה אני מכסה את כל מה שצריך — מהנוסחה הבסיסית ועד לטכניקות מתקדמות.</p>`,

    whatIs: `<p>Midjourney הוא מודל יצירת תמונות AI שנחשב למוביל בשוק מבחינת איכות אסתטית. המודל פועל דרך Discord או דרך הממשק באתר, ומייצר תמונות מפרומפטים טקסטואליים.</p>
<p>גרסה v7 עברה למודל שפה טבעית — במקום "beautiful woman, golden hour, bokeh, 8K" מעדיפים לכתוב "a portrait of a woman bathed in golden hour light with soft bokeh in the background". התיאור הזורם נותן תוצאות טובות יותר.</p>
<p>v8 Alpha מוסיף מצב <strong>--hd</strong> שמייצר תמונות ברזולוציה גבוהה במיוחד, עם פרטים מדויקים בטקסטורות ובמרקמים. לייצור יומיומי, v7 עדיין הבחירה הראשית.</p>`,

    structure: `<p>הנוסחה האופטימלית ל-Midjourney מורכבת מ-<strong>4 רכיבים מרכזיים</strong>:</p>
<ol>
<li><strong>Subject</strong> — מה מצולם? "A weathered fisherman mending nets on a wooden dock"</li>
<li><strong>Medium / Style</strong> — באיזה מדיום? "Oil painting on textured canvas" / "35mm film photography" / "watercolor illustration"</li>
<li><strong>Lighting / Mood</strong> — מה האווירה? "Soft diffused morning light, mist rising from the water, contemplative mood"</li>
<li><strong>Aspect Ratio + Technical</strong> — פרמטרים טכניים: --ar 16:9 --s 500 --quality 2</li>
</ol>
<p>סדר חשוב: Midjourney נותן משקל גבוה יותר למילים הראשונות בפרומפט. לכן תמיד התחל בנושא המרכזי.</p>
<p><strong>טיפ מפתח:</strong> בגרסה v7, תיאורים טבעיים עובדים טוב יותר מרשימות מילים. כתוב כאילו אתה מתאר תמונה לחבר — לא כאילו אתה ממלא טופס.</p>`,

    rules: [
      "כתוב בשפה טבעית זורמת — v7 מעדיף 'a cat sleeping on a sunlit windowsill' על פני 'cat, sleeping, window, sunlight, cozy'. תיאורים כמו סיפור קצר.",
      "התחל עם הנושא המרכזי — המילים הראשונות הכי משפיעות. 'A lone lighthouse on a cliff at sunset' עדיף על 'Sunset scene with a lighthouse'.",
      "הגדר מדיום אמנותי — 'oil painting', '35mm film photograph', 'watercolor', 'digital illustration'. מדיום קובע את כל האסתטיקה של התמונה.",
      "השתמש ב---sref ל-style reference — העלה תמונת ייחוס של סגנון שאתה רוצה. --sw קובע כמה חזק ההשפעה (0-1000).",
      "השתמש ב---no לשלילה — במקום לנסות לנסח בצורה חיובית, --no מאפשר להגיד מה לא לכלול: --no text, watermark, frame.",
      "שלב --chaos עם --stylize — chaos גבוה (50-100) נותן תוצאות מפתיעות, stylize גבוה (500-1000) נותן תוצאות אסתטיות. שניהם ביחד יוצרים אמנות מקורית.",
    ],

    params: [
      { name: "--ar", values: "רוחב:גובה", description: "יחס גובה-רוחב — 16:9 לנוף, 9:16 לפורטרט, 1:1 לסושיאל, 3:2 לצילום" },
      { name: "--s (stylize)", values: "0–1000", description: "כמה Midjourney מוסיף סגנון משלו — 0 צמוד לפרומפט, 1000 אמנותי מאוד" },
      { name: "--chaos", values: "0–100", description: "מגוון בתוצאות — 0 תוצאות דומות, 100 תוצאות מפתיעות ושונות" },
      { name: "--no", values: "רשימת מילים", description: "שלילה — מה לא לכלול בתמונה: --no text, watermark, people" },
      { name: "--raw", values: "דגל", description: "מפחית את ההתערבות האמנותית של Midjourney — תוצאה גולמית יותר, פחות 'מלוטשת'" },
      { name: "--oref / --ow", values: "מזהה תמונה / 0-1000", description: "Object reference — שמירה על עקביות אובייקט ספציפי בין תמונות. --ow קובע עוצמה" },
      { name: "--sref / --sw", values: "מזהה תמונה / 0-1000", description: "Style reference — שמירה על סגנון ויזואלי עקבי. --sw קובע עוצמה" },
      { name: "--draft", values: "דגל", description: "מצב טיוטה מהיר — 2-3 שניות במקום 30-60. מושלם לאיטרציה" },
      { name: "--personalize", values: "דגל", description: "התאמה לטעם האישי שלך על סמך דירוגים קודמים" },
      { name: "--quality", values: "1 / 2 / 4", description: "זמן עיבוד — 1 רגיל, 2 כפול, 4 פי ארבע. quality 4 לתוצאות בהן כל פיקסל חשוב" },
    ],

    examples: [
      {
        concept: "פורטרט צילומי",
        prompt:
          "A portrait of a jazz musician in his 60s, deep wrinkles telling stories, wearing a worn fedora hat. He holds a tarnished saxophone close to his chest. Shot on Kodak Portra 400 film, shallow depth of field, warm amber light from a nearby streetlamp, smoke drifting through the frame. New Orleans alleyway at night. --ar 2:3 --s 400 --quality 2",
        explanation:
          "נוסחת 4 רכיבים: Subject (jazz musician + תיאור פיזי) → Medium (Kodak Portra 400 film) → Lighting (warm amber, streetlamp) → Params (2:3 לפורטרט, stylize 400 לאסתטיקה מאוזנת). שפה טבעית זורמת.",
      },
      {
        concept: "נוף פנטזיה",
        prompt:
          "An ancient library carved inside a giant tree trunk, thousands of glowing books lining the curved wooden walls. A spiral staircase made of living roots winds upward through shafts of golden light. Tiny fireflies float between the shelves. Painted in the style of a detailed fantasy illustration with rich warm tones. --ar 9:16 --s 750 --chaos 30",
        explanation:
          "Subject מורכב (ספרייה בתוך עץ) עם פרטים ספציפיים (ספרים זוהרים, מדרגות שורשים, גחליליות). --chaos 30 מוסיף הפתעות ויזואליות בלי לאבד שליטה. --s 750 מאפשר ל-Midjourney להוסיף נגיעות אמנותיות.",
      },
      {
        concept: "עיצוב מוצר",
        prompt:
          "A minimalist perfume bottle made of frosted glass with a single gold accent ring. The bottle sits on a slab of raw white marble. Studio lighting: one key light from the upper left creating a soft gradient shadow. Clean white background, product photography for luxury brand. --ar 1:1 --s 200 --no text, logo, label",
        explanation:
          "Stylize 200 נמוך יחסית כי צריך שליטה מדויקת על המוצר. --no מסיר טקסט ולוגו שמופיעים לפעמים. תיאור תאורה מדויק (key light, upper left) נותן תוצאת סטודיו מקצועית.",
      },
      {
        concept: "אמנות מופשטת",
        prompt:
          "An explosion of liquid metallic paint in zero gravity — gold, deep teal, and crimson droplets frozen mid-air, swirling into organic shapes. Light refracts through each droplet creating tiny rainbows. Shot with a macro lens against a pure black background. High contrast, ultra-sharp detail. --ar 16:9 --s 900 --chaos 60 --quality 4",
        explanation:
          "--chaos 60 ו---s 900 ביחד — שילוב שמייצר אמנות מקורית ומפתיעה. --quality 4 לפרטים מירביים בטיפות הנוזל. תיאור פיזיקלי (zero gravity, refracts light) עוזר ל-Midjourney ליצור ריאליזם תוך כדי אבסטרקציה.",
      },
    ],

    mistakes: [
      {
        bad: "כתיבת רשימת מילים: 'cat, cute, fluffy, sunlight, window, cozy, warm, golden hour, bokeh, 8K, masterpiece'",
        good: "שפה טבעית: 'A fluffy ginger cat curled up on a sunlit windowsill, golden hour light streaming through lace curtains, soft bokeh'",
        why: "v7 מפרסר שפה טבעית הרבה יותר טוב מרשימות. מילים כמו 'masterpiece' ו-'8K' הן שאריות מגרסאות ישנות — בגרסה 7 הן מיותרות ולפעמים מזיקות.",
      },
      {
        bad: "שימוש ב---s 1000 --chaos 100 בפרומפט ראשון — פרמטרים קיצוניים בלי לדעת מה לצפות",
        good: "התחלה עם --s 300 --chaos 15 והעלאה הדרגתית לפי תוצאות",
        why: "chaos 100 נותן תוצאות שונות לגמרי ממה שביקשת — מעולה לאקספלור, אבל לא לפרומפט ראשון. stylize 1000 גורם ל-Midjourney להתעלם מחלק מהבקשה לטובת אסתטיקה. התחל נמוך ותעלה.",
      },
      {
        bad: "הכללת הנחיות שליליות בטקסט: 'no watermark, not blurry, without people, don't add text'",
        good: "שימוש בפרמטר --no: '--no watermark, blur, people, text'",
        why: "Midjourney לפעמים מתעלם ממילים שליליות בטקסט — או גרוע יותר, מכניס בדיוק את מה שביקשת להימנע ממנו. הפרמטר --no הוא הדרך הרשמית והמהימנה לשלילה.",
      },
    ],

    personalTip:
      "הטריק הכי חזק שלי ב-Midjourney: אני משתמש ב---draft לאיטרציה מהירה. במקום לחכות 30-60 שניות לכל תוצאה, --draft נותן תמונה ב-2-3 שניות. אני עושה 10-15 ניסיונות ב-draft, מזהה את הכיוון הטוב, ואז מריץ פעם אחת ב---quality 2 לתוצאה הסופית. זה חוסך לי שעות. גם, --sref הוא game changer — כשמצאתי סגנון שאני אוהב, אני שומר את ה-reference ומשתמש בו בכל הפרויקט.",

    faq: [
      {
        question: "מה ההבדל בין v7 ל-v8 Alpha?",
        answer:
          "v7 הוא הגרסה היציבה עם תמיכה מלאה בכל הפרמטרים. v8 Alpha מוסיף מצב --hd עם רזולוציה גבוהה במיוחד ופרטי טקסטורה משופרים, אבל עדיין בבטא — לא כל הפרמטרים עובדים בו. לייצור יומיומי, v7 עדיין הבחירה הנכונה. v8 מתאים כש-texture ופרטים קטנים קריטיים.",
      },
      {
        question: "מתי להשתמש ב---raw?",
        answer:
          "--raw מבטל את 'המגע האמנותי' של Midjourney. בלעדיו, Midjourney מוסיף אסתטיקה מלוטשת — מה שנהדר לאמנות אבל לא לצילום תיעודי או מוצר ספציפי. השתמש ב---raw כשאתה רוצה תוצאה גולמית, ריאליסטית, פחות 'מצוירת'. מושלם לצילום מוצר, ארכיטקטורה, ודוקומנטרי.",
      },
      {
        question: "איך --sref שונה מ---oref?",
        answer:
          "--sref (style reference) שומר על סגנון ויזואלי — צבעים, טקסטורות, אווירה. --oref (object reference) שומר על אובייקט ספציפי — צורה, פרופורציות, פרטים. למשל, --sref לשמור על סגנון 'צילום פילם אנלוגי' לאורך פרויקט, ו---oref לשמור על עיצוב של דמות או מוצר ספציפי.",
      },
      {
        question: "מה הערך האידיאלי ל---stylize?",
        answer:
          "תלוי במטרה. 0-200: שליטה מקסימלית, המודל צמוד לפרומפט — מתאים למוצרים ולדיוק טכני. 200-500: איזון טוב בין שליטה לאסתטיקה — מתאים לרוב השימושים. 500-750: Midjourney מוסיף נגיעות אמנותיות — מתאים לאיורים ופנטזיה. 750-1000: אמנות חופשית — Midjourney מפרש את הפרומפט בחופשיות.",
      },
    ],
  },

  /* ──────────────────────────────────────────────
   * 2. GPT Image (GPT-4o)
   * ────────────────────────────────────────────── */
  {
    slug: "gpt-image",
    title: "מדריך פרומפטים ל-GPT Image — יצירת תמונות עם ChatGPT",
    metaTitle: "מדריך פרומפטים ל-GPT Image (GPT-4o) — טקסט בתמונה, סגנונות וטיפים | Peroot",
    metaDescription:
      "למד ליצור תמונות AI עם GPT-4o — כתיבת פרוזה עשירה, רינדור טקסט מושלם, רקע שקוף ודוגמאות מעשיות",
    platform: "GPT Image (OpenAI)",
    category: "image",
    color: "#10b981",
    icon: "🎨",
    readTime: "7 דקות קריאה",
    lastUpdated: "2026-04-06",
    relatedSlugs: ["midjourney", "flux", "image-prompts"],

    intro: `<p>כשהתחלתי לייצר תמונות עם ChatGPT, הייתי כותב פרומפטים קצרים כמו ב-Midjourney — ומקבל תוצאות בינוניות. רק כשהבנתי שה-GPT-4o image generator הוא מודל שפה קודם כל, הכל השתנה.</p>
<p>GPT Image לא רוצה רשימות מילים או פרמטרים טכניים. הוא רוצה <strong>פרוזה עשירה</strong> — תיאור מפורט כמו סצנה בספר. ככל שהתיאור עשיר יותר ומפורט יותר, התוצאה מדויקת יותר. וכאן טמון היתרון שלו: הוא מבין הקשר, ניואנסים, וגם מרנדר טקסט בעברית ובאנגלית ברמה שאף מודל אחר לא מגיע אליה.</p>`,

    whatIs: `<p>GPT Image הוא מנוע יצירת תמונות מובנה בתוך GPT-4o של OpenAI. בשונה מ-DALL-E 3 שהיה מודל נפרד, GPT-4o מייצר תמונות <strong>כחלק מהשיחה</strong> — מה שאומר שהוא מבין הקשר, יכול לערוך תמונות קיימות, ומגיב להנחיות מילוליות מורכבות.</p>
<p>היתרון הגדול: <strong>רינדור טקסט</strong>. GPT Image הוא המודל היחיד שמרנדר טקסט באופן אמין — שלטים, לוגואים, כותרות, כרטיסי ביקור. גם בעברית. זה game changer לגרפיקה שיווקית.</p>
<p>בנוסף, הוא תומך ב<strong>רקע שקוף</strong> (background: transparent) — מה שהופך אותו למושלם ליצירת אלמנטים גרפיים שמשתלבים בעיצוב קיים.</p>`,

    structure: `<p>המבנה האופטימלי ל-GPT Image הוא <strong>פרוזה תיאורית עשירה</strong>:</p>
<ol>
<li><strong>Context</strong> — הסבר מה אתה צריך ולמה: "אני מעצב פוסטר לפסטיבל מוזיקה של ג'אז"</li>
<li><strong>Subject description</strong> — תיאור מפורט של הנושא: "סקסופון זהוב מוארך, עם השתקפויות של אורות עיר בגוף המתכת"</li>
<li><strong>Composition</strong> — מיקום ומרחב: "הסקסופון ממוקם באלכסון מהפינה השמאלית התחתונה לפינה הימנית העליונה"</li>
<li><strong>Typography</strong> — טקסט בתמונה (אם נדרש): "בחלק העליון הכותרת 'Jazz Nights' בפונט אלגנטי serif, מתחתיו '2026 Summer Festival' בפונט דק יותר"</li>
<li><strong>Style + Mood</strong> — אווירה וסגנון: "סגנון פוסטר וינטג' Art Deco עם פלטת צבעים של זהב כהה, כחול חצות ושחור. אווירה אלגנטית ונוסטלגית."</li>
</ol>
<p><strong>טיפ קריטי:</strong> GPT Image מגיב לפרוזה — לא לפרמטרים טכניים. אין --ar או --stylize. במקום זה, תתאר בדיוק מה אתה רוצה לראות.</p>`,

    rules: [
      "כתוב פרוזה עשירה ומפורטת — GPT-4o הוא מודל שפה. 'A haunting portrait of a cellist' עדיף על 'cellist, dark, moody'. ככל שהתיאור עשיר יותר, התוצאה מדויקת יותר.",
      "נצל את יכולת רינדור הטקסט — GPT Image מצטיין בטקסט בתמונה. תמיד ציין את הטקסט המדויק, הפונט (serif, sans-serif, handwritten), והמיקום.",
      "השתמש ב-background: transparent לאלמנטים גרפיים — מושלם לאייקונים, לוגואים ואלמנטים שצריכים להשתלב בעיצוב קיים.",
      "הגדר context — ספר ל-GPT למה אתה צריך את התמונה. 'פוסטר לאירוע' נותן תוצאה שונה מ'איור לספר ילדים' גם עם אותו נושא.",
      "ערוך בשיחה — ה-advantage הגדול של GPT Image הוא שאפשר לבקש 'תשנה את הצבע של הרקע לכחול' או 'תוסיף טקסט בפינה'. אין צורך לכתוב פרומפט חדש מאפס.",
      "ציין גודל ויחס — size קובע את ממדי התמונה: 1024x1024 לריבוע, 1792x1024 לרוחב, 1024x1792 לגובה.",
    ],

    params: [
      { name: "quality", values: "low / medium / high", description: "איכות הפלט — low מהיר, high מפורט ואיטי יותר" },
      { name: "size", values: "1024x1024 / 1792x1024 / 1024x1792", description: "ממדי התמונה — ריבוע, אופקי, או אנכי" },
      { name: "background", values: "auto / transparent", description: "רקע שקוף — מושלם ללוגואים ואלמנטים גרפיים" },
    ],

    examples: [
      {
        concept: "פוסטר שיווקי עם טקסט",
        prompt:
          "Create a promotional poster for a summer music festival. The background is a gradient from deep midnight blue at the top to warm sunset orange at the bottom. In the center, a silhouette of a guitarist playing, with golden light rays emanating from the guitar. At the top, large bold text reading 'SUMMER FEST 2026' in a clean modern sans-serif font, white with a subtle golden glow. Below the silhouette, smaller text: 'June 15-17 | Tel Aviv Port' in a thin elegant font. The overall aesthetic is premium, modern, and energetic.",
        explanation:
          "פרוזה תיאורית שמכסה הכל: רקע (gradient), נושא (silhouette), טקסט מדויק (שני שורות עם פונטים שונים), ואסתטיקה. GPT Image יְרנדר את הטקסט בצורה מושלמת כולל הפונט הנכון.",
      },
      {
        concept: "איור לוגו מינימליסטי",
        prompt:
          "Design a minimalist logo icon for a coffee brand called 'Morning Ritual'. A single coffee cup seen from above, the coffee surface forming the shape of a rising sun with subtle rays. The design uses only two colors: warm brown (#6B4423) and cream white (#F5F0E8). Clean vector style, no gradients, suitable for printing at any size. Transparent background.",
        explanation:
          "context ברור (לוגו למותג קפה), תיאור מדויק של הקונספט (כוס מלמעלה = שמש עולה), צבעים מדויקים בהקסדצימל, ובקשה לרקע שקוף. GPT Image מצטיין בעיצוב מינימליסטי כזה.",
      },
      {
        concept: "כרטיס ביקור דו-צדדי",
        prompt:
          "Design the front side of a business card for a photographer named 'Daniel Cohen'. The card is landscape orientation, dark charcoal gray background (#2D2D2D). On the left side, a thin vertical gold line. To its right, the name 'DANIEL COHEN' in elegant spaced-out uppercase letters in white, and below it in smaller gold text 'PHOTOGRAPHY'. In the bottom right corner, small text in a clean font: 'daniel@example.com | +972-50-1234567'. The style is clean, premium, and modern with generous whitespace.",
        explanation:
          "GPT Image מבין layout מורכב: קווים, טקסט במיקומים ספציפיים, היררכיה טיפוגרפית. הפירוט של כל אלמנט (שם, תפקיד, פרטי קשר) עם מיקום מדויק נותן תוצאה שמוכנה כמעט להדפסה.",
      },
      {
        concept: "איור בסגנון ספר ילדים",
        prompt:
          "A whimsical children's book illustration of a tiny mouse wearing a red scarf, sitting on a mushroom cap in a magical forest. The mushroom has white spots on a red cap. Around the mouse, tiny glowing fireflies float in the evening air. The trees are tall with twisting trunks and leaves in autumn colors — amber, rust, and golden yellow. Painted in soft watercolor style with visible brushstrokes, warm and cozy atmosphere. The mouse has large expressive eyes and holds a miniature lantern.",
        explanation:
          "תיאור פרוזאי מלא שמרגיש כמו קטע מספר. כל פרט מתואר בשפה טבעית — ה'גלימה' של העכבר, הזבובי אש, העצים. GPT Image מתרגם פרוזה לויזואל בצורה מעולה כי הוא מודל שפה ראשית.",
      },
    ],

    mistakes: [
      {
        bad: "כתיבת פרומפט בסגנון Midjourney: 'cat, cute, fluffy, bokeh, 8K, masterpiece --ar 2:3'",
        good: "כתיבת פרוזה: 'A fluffy Persian cat with amber eyes resting on a velvet cushion, soft directional light creating a warm glow on its fur, creamy bokeh in the background'",
        why: "GPT Image הוא מודל שפה — הוא מבין משפטים, לא רשימות. פרמטרים כמו --ar לא עובדים בו. ככל שהפרוזה עשירה יותר, התוצאה טובה יותר.",
      },
      {
        bad: "בקשת טקסט בלי לציין מיקום, גודל או פונט: 'הוסף את הטקסט Summer Sale'",
        good: "ציון מדויק: 'In the top center, large bold text reading SUMMER SALE in white Impact font, with a thin golden underline beneath it'",
        why: "GPT Image מרנדר טקסט מעולה — אבל הוא צריך הנחיות מדויקות. בלי מיקום ופונט, הטקסט יופיע במקום אקראי בגודל אקראי. ככל שתהיה מדויק יותר, התוצאה מושלמת.",
      },
      {
        bad: "בקשת תמונה בלי context: 'צור תמונה של כלב'",
        good: "הוספת context: 'אני צריך תמונה לפוסט אינסטגרם של חנות חיות מחמד — גולדן רטריבר שמח עם בנדנה צבעונית, רקע טבעי ירוק, אווירה שמחה ואנרגטית, פורמט ריבועי'",
        why: "Context משנה הכל. 'כלב' נותן תמונה גנרית. 'כלב לפוסט אינסטגרם של חנות חיות' נותן תמונה עם הקומפוזיציה, הצבעים והאווירה הנכונים לשימוש.",
      },
    ],

    personalTip:
      "הטריק שלי עם GPT Image: אני משתמש בו כמעצב גרפי אינטראקטיבי. אני מתחיל עם תיאור כללי, מקבל תוצאה ראשונה, ואז מנהל 'שיחה' — 'תשנה את הרקע לכהה יותר', 'תזיז את הטקסט שמאלה', 'תוסיף צל מתחת ללוגו'. בשלוש-ארבע איטרציות אני מגיע לתוצאה מושלמת. שום מודל אחר לא מאפשר עריכה בשיחה כזו.",

    faq: [
      {
        question: "האם GPT Image מרנדר טקסט בעברית?",
        answer:
          "כן, GPT Image הוא המודל היחיד שמרנדר עברית באופן אמין. הוא מבין כיוון RTL ומייצר טקסט קריא. עדיין מומלץ לבדוק — לפעמים באותיות קטנות יש שגיאות — אבל ברמה כללית הוא מוביל בעברית. לטקסט קריטי, כתוב את הטקסט המדויק בגרשיים בפרומפט.",
      },
      {
        question: "מה ההבדל בין quality low, medium ו-high?",
        answer:
          "low מהיר מאוד (2-3 שניות) עם פרטים בסיסיים — מתאים לאיטרציה מהירה ולטיוטות. medium הוא ברירת המחדל — איזון טוב בין מהירות לאיכות. high איטי יותר (10-20 שניות) אבל עם פרטים, טקסטורות וגוונים עשירים הרבה יותר. השתמש ב-high לתוצאה סופית.",
      },
      {
        question: "GPT Image או Midjourney?",
        answer:
          "GPT Image עדיף ל: טקסט בתמונה, עיצוב גרפי, לוגואים, פוסטרים, עריכה אינטראקטיבית, ורקע שקוף. Midjourney עדיף ל: אמנות, צילום אמנותי, פנטזיה, נופים, ותמונות עם אסתטיקה מלוטשת. כלל אצבע: אם יש טקסט בתמונה — GPT Image. אם זו אמנות טהורה — Midjourney.",
      },
    ],
  },

  /* ──────────────────────────────────────────────
   * 3. FLUX
   * ────────────────────────────────────────────── */
  {
    slug: "flux",
    title: "מדריך פרומפטים ל-FLUX.2 — המדריך המלא",
    metaTitle: "מדריך פרומפטים ל-FLUX.2 — סדר מילים, רזולוציה ופרמטרים | Peroot",
    metaDescription:
      "למד ליצור תמונות AI עם FLUX.2 — סדר מילים = עדיפות, ללא negative prompts, צבעי hex, מפרט מצלמה ודוגמאות מעשיות",
    platform: "FLUX.2 (Black Forest Labs)",
    category: "image",
    color: "#ec4899",
    icon: "⚡",
    readTime: "8 דקות קריאה",
    lastUpdated: "2026-04-06",
    relatedSlugs: ["midjourney", "stable-diffusion", "image-prompts"],

    intro: `<p>כשהתחלתי לעבוד עם FLUX, הגישה הראשונה שלי הייתה להתייחס אליו כמו Stable Diffusion — עם negative prompts ומשקלות. טעות. FLUX הוא עולם אחר לגמרי.</p>
<p>FLUX.2 בנוי על עיקרון פשוט ועוצמתי: <strong>סדר המילים קובע עדיפות</strong>. המילה הראשונה הכי חשובה, השנייה פחות, וכן הלאה. אין negative prompts, אין (word:1.3), אין CFG שאפשר לשחק איתו. במקום כל הפרמטרים האלה, FLUX מבקש ממך פשוט <strong>לכתוב מה שחשוב קודם</strong>.</p>
<p>אורך הפרומפט האופטימלי? 15-75 מילים. קצר מדי — חסר מידע. ארוך מדי — המודל מתבלבל. ב-sweet spot הזה, FLUX מייצר תמונות מדהימות במהירות שיא.</p>`,

    whatIs: `<p>FLUX.2 הוא מודל יצירת תמונות open-source מבית Black Forest Labs (הצוות שפיתח את Stable Diffusion המקורי). הוא נחשב למודל הקוד-פתוח המוביל, עם שלושה מצבים: <strong>schnell</strong> (מהיר), <strong>dev</strong> (מאוזן), ו-<strong>pro</strong> (איכות מקסימלית).</p>
<p>העיקרון המרכזי של FLUX הוא <strong>סדר מילים = עדיפות</strong>. אין negative prompts — כלל. אין משקלות כמו (word:1.3). המילים הראשונות בפרומפט מקבלות את המשקל הגבוה ביותר.</p>
<p>תכונה ייחודית: FLUX מגיב מצוין ל<strong>צבעי hex שנקשרים לאובייקט</strong>. במקום 'red dress', כתוב 'dress in #FF2D2D crimson'. המודל קורא hex ומייצר את הגוון בדיוק.</p>
<p><strong>רזולוציה:</strong> מכפלות של 16, עד 4 מגה-פיקסל. 1024x1024 או 1360x768 הן בחירות טובות.</p>`,

    structure: `<p>המבנה האופטימלי ל-FLUX מבוסס על <strong>סדר עדיפויות</strong>:</p>
<ol>
<li><strong>Primary subject</strong> (הכי חשוב, מופיע ראשון) — "A red fox standing on a moss-covered rock"</li>
<li><strong>Key attribute</strong> — התכונה הכי חשובה: "looking directly at the camera with piercing amber eyes"</li>
<li><strong>Environment</strong> — סביבה: "in a misty ancient forest, morning light filtering through trees"</li>
<li><strong>Technical specs</strong> — מפרט מצלמה: "shot with Canon EOS R5, 85mm f/1.4, shallow depth of field"</li>
<li><strong>Color binding</strong> (אופציונלי) — צבעי hex: "fur in #D4520B warm copper, eyes #F5A623 golden amber"</li>
</ol>
<p><strong>כלל ה-15-75:</strong> פחות מ-15 מילים — חסר מידע. יותר מ-75 מילים — FLUX מתחיל להתעלם מהחלק האחרון. 30-50 מילים הוא ה-sweet spot.</p>
<p><strong>חשוב:</strong> אין negative prompts ב-FLUX. אם אתה לא רוצה משהו — פשוט אל תכתוב אותו. במקום 'no watermark' — אל תזכיר watermark כלל.</p>`,

    rules: [
      "סדר מילים = עדיפות — המילה הראשונה בפרומפט היא הכי חשובה. תמיד התחל עם הנושא המרכזי.",
      "אין negative prompts — בכלל. לא 'no watermark', לא 'without text'. אם אתה לא רוצה משהו, פשוט אל תזכיר אותו.",
      "שמור על 15-75 מילים — FLUX עובד הכי טוב ב-sweet spot הזה. 30-50 מילים אידיאלי. מעל 75, החלק האחרון מאבד השפעה.",
      "השתמש בצבעי hex עם קשירה לאובייקט — 'dress in #FF2D2D' עדיף על 'red dress'. FLUX קורא hex ומייצר את הגוון בדיוק.",
      "הוסף מפרט מצלמה — 'Canon EOS R5, 85mm f/1.4, ISO 200'. FLUX מגיב מעולה לפרטים טכניים של מצלמה ומייצר תוצאה צילומית.",
      "רזולוציה חייבת להיות מכפלות של 16 — 1024x1024, 1360x768, 1024x1792. מקסימום 4 מגה-פיקסל. מספרים שאינם כפולות של 16 גורמים לשגיאות.",
    ],

    params: [
      { name: "Resolution", values: "מכפלות של 16, עד 4MP", description: "1024x1024 / 1360x768 / 1024x1792 — חייב כפולות של 16" },
      { name: "Model", values: "schnell / dev / pro", description: "schnell מהיר (1-2s), dev מאוזן (5-10s), pro איכות מקסימלית (20-30s)" },
      { name: "Guidance scale", values: "1.0–5.0", description: "כמה צמוד לפרומפט — 2.5-3.5 אידיאלי. מעל 5 גורם לאובר-סאטורציה" },
      { name: "Steps", values: "20–50", description: "מספר שלבי דיפוזיה — 25-30 מאוזן, 50 לפרטים מקסימליים" },
    ],

    examples: [
      {
        concept: "צילום פורטרט ריאליסטי",
        prompt:
          "A weathered fisherman in his 70s mending a net on a wooden boat, deep sun lines on his face, salt-and-pepper beard. Shot with Hasselblad X2D, 90mm f/2.5, golden hour side lighting, skin tones in #D4A574 warm bronze, ocean background in #2E5984 deep teal. Shallow depth of field, documentary photography.",
        explanation:
          "Subject ראשון (fisherman), אחריו key attribute (mending net, facial features), מפרט מצלמה (Hasselblad, 90mm), וצבעי hex נקשרים לאובייקטים ספציפיים (skin = bronze, ocean = teal). 47 מילים — בתוך ה-sweet spot.",
      },
      {
        concept: "ארכיטקטורה מודרנית",
        prompt:
          "A brutalist concrete building with dramatic geometric shadows, late afternoon sun creating sharp diagonal lines across the facade. Shot with Sony A7R V, 24mm f/8, deep shadows in #1A1A2E, warm highlights in #E8C07D golden. Architectural photography, high contrast, minimal composition.",
        explanation:
          "סדר עדיפויות: הבניין ראשון, אחריו תאורה (late afternoon sun), מפרט מצלמה, וצבעים. 'Architectural photography' בסוף מגדיר את הז'אנר. שים לב — אין negative prompt.",
      },
      {
        concept: "אוכל צילומי",
        prompt:
          "Fresh ramen bowl viewed from 45 degrees above, steam rising from rich broth in #8B4513 dark miso brown, soft-boiled egg sliced in half revealing #FF8C00 golden yolk, green onions, nori sheets. Shot with Canon EOS R5, 50mm macro, shallow depth of field, single softbox from upper left. Dark moody food photography.",
        explanation:
          "כל אלמנט באוכל נקשר לצבע hex ספציפי — מרק (#8B4513), חלמון (#FF8C00). מפרט תאורה (single softbox, upper left) מדויק. 47 מילים ב-sweet spot.",
      },
      {
        concept: "נוף טבעי",
        prompt:
          "A lone pine tree on a cliff edge overlooking a vast fjord at dawn. Low clouds weaving between mountains, water surface in #4A6B8A steel blue reflecting the sky. Shot with Nikon Z9, 35mm f/5.6, landscape photography, ethereal atmosphere, mist in #C8D0D8 silver gray.",
        explanation:
          "Subject ראשון (pine tree on cliff), סביבה (fjord at dawn), צבעים (steel blue, silver gray), ומפרט. 42 מילים. FLUX מצטיין בנופים כי המודל מגיב מעולה למפרט מצלמה + צבעי hex.",
      },
    ],

    mistakes: [
      {
        bad: "כתיבת negative prompt: 'beautiful landscape, no people, no buildings, no text, --negative blurry, ugly, deformed'",
        good: "רק מה שרוצים: 'A pristine mountain lake surrounded by pine forests at dawn, mist hovering over still water, shot with 24mm wide angle'",
        why: "FLUX לא תומך ב-negative prompts. כל הזכרה של 'no', 'without', '--negative' מתעלמת — או גרוע יותר, המודל מכניס את מה שביקשת להימנע. כתוב רק מה שרוצים לראות.",
      },
      {
        bad: "שימוש במשקלות: '(beautiful eyes:1.5), (sharp focus:1.3), (bokeh:0.8)'",
        good: "סדר עדיפויות: 'Striking green eyes in sharp focus, portrait, creamy background bokeh, shot with 85mm f/1.4'",
        why: "FLUX לא מפרסר (word:weight). סדר המילים הוא כל המשקל שיש. שים את מה שחשוב ראשון במשפט — זו הדרך לתת עדיפות ב-FLUX.",
      },
      {
        bad: "פרומפט של 120 מילים עם תיאור מפורט של כל פרט קטן בסצנה",
        good: "30-50 מילים ממוקדות: subject ראשון, key attribute, environment, technical specs",
        why: "מעל 75 מילים, FLUX מתחיל להתעלם מהחלק האחרון. במקום לכתוב הכל, תמקד ב-4-5 אלמנטים החשובים ביותר ותשים אותם לפי סדר עדיפות.",
      },
    ],

    personalTip:
      "הטריק הכי חזק שלי ב-FLUX: צבעי hex נקשרים לאובייקטים. כשאני כותב 'red dress' — FLUX מחליט איזה אדום. כשאני כותב 'dress in #C41E3A carmine red' — אני מקבל בדיוק את הגוון שרציתי. זה עובד בטירוף לצילום מוצר ולמיתוג. גם, אני תמיד מוסיף מפרט מצלמה (brand + focal length + aperture) — זה ההבדל בין 'תמונה של נוף' ל'צילום נוף מקצועי'.",

    faq: [
      {
        question: "מה ההבדל בין FLUX schnell, dev ו-pro?",
        answer:
          "schnell מייצר תמונה ב-1-2 שניות — מושלם לאיטרציה מהירה ולבדיקת כיוונים. dev מייצר ב-5-10 שניות עם פרטים טובים יותר — מתאים לרוב השימושים. pro מייצר ב-20-30 שניות עם איכות מקסימלית — לתוצאות סופיות. הטיפ: התחל ב-schnell, מצא כיוון, וסיים ב-pro.",
      },
      {
        question: "למה FLUX לא תומך ב-negative prompts?",
        answer:
          "FLUX בנוי על ארכיטקטורת Flow Matching שונה מ-Stable Diffusion. הוא לא משתמש ב-classifier-free guidance באותו אופן, ולכן negative prompts פשוט לא עובדים. במקום זה, סדר המילים קובע — מה שמופיע ראשון מקבל הכי הרבה משקל. זה בעצם פשוט יותר ונותן שליטה אינטואיטיבית.",
      },
      {
        question: "איך צבעי hex עובדים ב-FLUX?",
        answer:
          "כותבים את קוד ה-hex צמוד לאובייקט: 'dress in #FF2D2D crimson', 'sky in #1E3A5F navy blue'. FLUX מזהה את הקוד ומייצר את הגוון המדויק. חשוב: תמיד תוסיף שם צבע אחרי ה-hex ('crimson', 'navy blue') כ-fallback — לפעמים המודל צריך את המילה כגיבוי.",
      },
      {
        question: "FLUX או Stable Diffusion?",
        answer:
          "FLUX מצטיין בפשטות ומהירות — פרומפט ישיר, תוצאה מהירה, צבעים מדויקים. Stable Diffusion (SDXL/SD3.5) מציע יותר שליטה — negative prompts, CFG, samplers, LoRA. אם אתה רוצה תוצאה מהירה ונקייה — FLUX. אם אתה רוצה שליטה מלאה על כל פרמטר — SD.",
      },
    ],
  },

  /* ──────────────────────────────────────────────
   * 4. Stable Diffusion
   * ────────────────────────────────────────────── */
  {
    slug: "stable-diffusion",
    title: "מדריך פרומפטים ל-Stable Diffusion — SDXL ו-SD3.5",
    metaTitle: "מדריך פרומפטים ל-Stable Diffusion SDXL & SD3.5 — משקלות, CFG וטיפים | Peroot",
    metaDescription:
      "למד ליצור תמונות AI עם Stable Diffusion — SDXL עם משקלות (word:1.3), SD3.5 בשפה טבעית, CFG, samplers ודוגמאות",
    platform: "Stable Diffusion",
    category: "image",
    color: "#8b5cf6",
    icon: "🔮",
    readTime: "9 דקות קריאה",
    lastUpdated: "2026-04-06",
    relatedSlugs: ["flux", "midjourney", "image-prompts"],

    intro: `<p>Stable Diffusion היה המודל הראשון שלי. זוכר את ההרגשה כשהרצתי אותו בפעם הראשונה על ה-GPU שלי — תמונה נוצרה מאפס, על המחשב שלי, ללא תלות בשום שירות ענן. מאז הכל השתנה.</p>
<p>היום יש שני עולמות של Stable Diffusion: <strong>SDXL</strong> — שעובד עם רשימות מילות מפתח, משקלות (word:1.3), ו-negative prompts חזקים. ו-<strong>SD3.5</strong> — שעבר לשפה טבעית בדומה ל-Midjourney, עם CFG נמוך בהרבה ומודל שמבין הקשר.</p>
<p>לדעת באיזה מודל אתה עובד — ולכתוב את הפרומפט בהתאם — זה ההבדל בין תוצאה בינונית לתוצאה מעולה.</p>`,

    whatIs: `<p>Stable Diffusion הוא מודל יצירת תמונות open-source מבית Stability AI. הוא הפופולרי ביותר בעולם ה-open-source בזכות הגמישות — אפשר להריץ אותו לוקלית, להוסיף LoRA (fine-tuned models), ControlNet (שליטה מבנית), ו-IP-Adapter (העברת סגנון).</p>
<p>שני מודלים מובילים:</p>
<ul>
<li><strong>SDXL (Stable Diffusion XL)</strong> — מודל ותיק וממוצק. עובד עם מילות מפתח, משקלות כמו <code>(beautiful eyes:1.3)</code>, negative prompts מפורטים, ו-CFG 7-9. המודל הכי נתמך בקהילה עם אלפי LoRA.</li>
<li><strong>SD3.5 (Stable Diffusion 3.5)</strong> — מודל חדש יותר שעבר לשפה טבעית. CFG 3.5-4.5 (הרבה נמוך יותר!), negative prompts מינימליים, ומבנה פרומפט דומה ל-Midjourney. פחות LoRA זמינים אבל תוצאות out-of-the-box טובות יותר.</li>
</ul>`,

    structure: `<p>המבנה משתנה בין SDXL ל-SD3.5:</p>
<h3>SDXL — מבנה מילות מפתח</h3>
<ol>
<li><strong>Quality tags</strong> — "masterpiece, best quality, ultra detailed"</li>
<li><strong>Subject</strong> — "(beautiful young woman:1.2), silver hair, wearing a (blue velvet dress:1.1)"</li>
<li><strong>Environment</strong> — "standing in a moonlit garden, roses, fountain"</li>
<li><strong>Style</strong> — "cinematic lighting, (film grain:0.8), shallow depth of field"</li>
<li><strong>Negative prompt</strong> — "(worst quality:1.4), blurry, deformed, extra limbs, watermark, text"</li>
</ol>
<h3>SD3.5 — שפה טבעית</h3>
<ol>
<li><strong>Subject description</strong> — "A young woman with flowing silver hair in an elegant blue velvet dress"</li>
<li><strong>Scene + Mood</strong> — "standing in a moonlit rose garden next to an old stone fountain"</li>
<li><strong>Style</strong> — "Cinematic photograph with soft film grain, shallow depth of field, cool moonlight tones"</li>
<li><strong>Negative</strong> (מינימלי) — "blurry, deformed"</li>
</ol>
<p><strong>ההבדל הקריטי:</strong> ב-SDXL, CFG 7-9. ב-SD3.5, CFG 3.5-4.5. שימוש ב-CFG 7 על SD3.5 ייצר אובר-סאטורציה והפרזה.</p>`,

    rules: [
      "דע באיזה מודל אתה עובד — SDXL ו-SD3.5 דורשים פרומפטים שונים לחלוטין. SDXL = מילות מפתח + משקלות. SD3.5 = שפה טבעית.",
      "ב-SDXL, השתמש במשקלות (word:weight) — (1.0-1.5) מחזק, (0.5-0.8) מחליש. אל תעלה מעל 1.5 — זה גורם לעיוותים.",
      "ב-SD3.5, כתוב שפה טבעית — 'A portrait of an elderly man with deep wrinkles' עדיף על 'old man, (wrinkles:1.3), portrait'.",
      "CFG חייב להתאים למודל — SDXL: 7-9. SD3.5: 3.5-4.5. טעות ב-CFG היא הסיבה הנפוצה ביותר לתוצאות גרועות.",
      "Negative prompt: מפורט ב-SDXL, מינימלי ב-SD3.5 — ב-SDXL כתוב 10-20 פריטים. ב-SD3.5 הגבל ל-3-5 פריטים.",
      "בחר sampler בהתאם — SDXL: DPM++ 2M Karras, Euler a. SD3.5: Euler, UniPC. ה-sampler משפיע על הטקסטורה והפרטים.",
    ],

    params: [
      { name: "CFG Scale", values: "SDXL: 7–9 / SD3.5: 3.5–4.5", description: "כמה צמוד לפרומפט — ערך שונה לכל מודל!" },
      { name: "Sampler", values: "DPM++ 2M Karras / Euler / UniPC", description: "אלגוריתם דגימה — משפיע על טקסטורה ופרטים" },
      { name: "Steps", values: "20–50", description: "שלבי דיפוזיה — 25-30 ברוב המקרים, 50 לפרטים מקסימליים" },
      { name: "Negative prompt", values: "טקסט חופשי", description: "SDXL: מפורט (10-20 פריטים). SD3.5: מינימלי (3-5)" },
      { name: "Weight syntax", values: "(word:0.5-1.5)", description: "SDXL בלבד — משקל לכל מילה. 1.0 = רגיל, 1.3 = חזק" },
      { name: "Resolution", values: "1024x1024 / 1344x768 / 768x1344", description: "SDXL תומך ברזולוציות שונות. 1024x1024 ברירת מחדל" },
    ],

    examples: [
      {
        concept: "פורטרט SDXL עם משקלות",
        prompt:
          "masterpiece, best quality, (cinematic portrait:1.2) of a warrior woman with (braided red hair:1.1), (battle scars:0.8) across her cheek, wearing dented iron armor. Standing on a misty battlefield at dawn. (Dramatic rim lighting:1.3), volumetric fog, desaturated color palette, shallow depth of field, shot on 85mm lens\n\nNegative prompt: (worst quality:1.4), (blurry:1.2), deformed, extra limbs, bad hands, watermark, text, logo, oversaturated",
        explanation:
          "מבנה SDXL קלאסי: quality tags → subject עם משקלות → environment → style. משקלות: portrait 1.2 (חשוב), battle scars 0.8 (עדין), rim lighting 1.3 (דרמטי). Negative prompt מפורט עם משקלות.",
      },
      {
        concept: "נוף SD3.5 בשפה טבעית",
        prompt:
          "A dramatic volcanic landscape at sunset, glowing rivers of lava flowing down black rock slopes into the sea. Massive steam clouds rising where lava meets ocean water. The sky is painted in deep crimson and amber. Wide angle landscape photography, ultra-sharp detail, high dynamic range.\n\nNegative: blurry, cartoon, painting",
        explanation:
          "SD3.5 בשפה טבעית — אין משקלות, אין quality tags, negative prompt מינימלי (3 פריטים). CFG 3.5-4.5. התיאור זורם ועשיר, המודל מבין הקשר.",
      },
      {
        concept: "סצנת פנטזיה SDXL",
        prompt:
          "masterpiece, (fantasy art:1.3), an ancient (crystal dragon:1.2) perched atop a floating island, translucent wings catching prismatic light, (amethyst and sapphire:1.1) scales glittering. Waterfalls cascading off the island edges into clouds below. (Epic scale:1.2), golden hour, (Greg Rutkowski style:0.7), vibrant colors\n\nNegative prompt: (low quality:1.4), blurry, deformed, extra heads, bad anatomy, modern elements, photo, realistic",
        explanation:
          "SDXL עם שימוש אסטרטגי במשקלות: crystal dragon 1.2 (נושא מרכזי), amethyst and sapphire 1.1 (צבעים חשובים), Greg Rutkowski 0.7 (השפעת סגנון עדינה). Negative חוסם גם 'realistic' כי רוצים fantasy.",
      },
      {
        concept: "צילום מוצר SD3.5",
        prompt:
          "A sleek matte black wireless headphone floating slightly above a dark concrete surface, surrounded by a subtle aura of soft blue light. One ear cup angled toward the camera showing the premium leather padding. Studio photography with a single overhead softbox, clean dark background, product catalog aesthetic.\n\nNegative: text, logo, watermark",
        explanation:
          "SD3.5 — שפה טבעית נקייה ללא משקלות. תיאור מדויק של מוצר, תאורה, ואסתטיקה. CFG 4.0 ו-negative מינימלי. 'Floating slightly' נותן למוצר תחושת premium.",
      },
    ],

    mistakes: [
      {
        bad: "שימוש ב-CFG 7-8 על SD3.5: תוצאה מוגזמת עם צבעים שרופים ופרטים מעוותים",
        good: "CFG 3.5-4.5 ל-SD3.5, CFG 7-9 ל-SDXL — לדעת מה מתאים לכל מודל",
        why: "SD3.5 נבנה לעבוד עם CFG נמוך. ערך 7+ גורם לאובר-סאטורציה, contrasts קיצוניים, ועיוותים. זו הטעות הנפוצה ביותר של מי שעובר מ-SDXL ל-SD3.5.",
      },
      {
        bad: "כתיבת (word:2.0) או (word:3.0) ב-SDXL: משקלות קיצוניים שגורמים לעיוותים",
        good: "משקלות בטווח 0.6-1.4: (beautiful eyes:1.2), (soft lighting:1.1), (film grain:0.7)",
        why: "מעל 1.5 המודל 'דוחף' את המילה כל כך חזק שהיא מעוותת את התמונה. מתחת ל-0.5 המילה כמעט נעלמת. הטווח הבטוח והיעיל: 0.6-1.4.",
      },
      {
        bad: "שימוש במילות מפתח SDXL על SD3.5: 'masterpiece, best quality, ultra detailed, 8K'",
        good: "שפה טבעית: 'A highly detailed macro photograph of a dewdrop on a rose petal'",
        why: "SD3.5 לא אומן על quality tags כמו 'masterpiece'. המילים האלה מבלבלות אותו ומייצרות אובר-סאטורציה. ב-SD3.5 — כתוב כמו שמדברים.",
      },
    ],

    personalTip:
      "הטריק שלי ב-Stable Diffusion: אני מחזיק שני 'פרופילים' שמורים — אחד ל-SDXL ואחד ל-SD3.5. כל פרופיל כולל CFG, sampler, steps, ו-negative prompt בסיסי. ככה אני לא טועה ב-CFG כשאני עובר בין מודלים. גם, ב-SDXL, הטריק הכי חזק הוא לשלב LoRA מותאם אישית — LoRA של סגנון ספציפי + LoRA של דמות = תוצאות שאף מודל סגור לא יכול לייצר.",

    faq: [
      {
        question: "SDXL או SD3.5 — מה עדיף?",
        answer:
          "תלוי במה שחשוב לך. SDXL: קהילה ענקית עם אלפי LoRA, שליטה מלאה במשקלות, negative prompts חזקים, ControlNet מלא. SD3.5: תוצאות טובות יותר out-of-the-box, שפה טבעית אינטואיטיבית, טקסט טוב יותר, פחות צורך בהנדסת פרומפטים. למקצוענים שרוצים שליטה — SDXL. למי שרוצה תוצאה מהירה — SD3.5.",
      },
      {
        question: "מה זה LoRA ולמה זה חשוב?",
        answer:
          "LoRA (Low-Rank Adaptation) הוא fine-tune קטן שאפשר להוסיף למודל בסיס. למשל, LoRA של 'צילום פילם אנלוגי' הופך כל פרומפט לצילום בסגנון Kodak. יש LoRA לסגנונות (anime, watercolor, pixel art), לדמויות ספציפיות, ולקונספטים. ב-SDXL יש אלפי LoRA זמינים ב-Civitai ו-HuggingFace.",
      },
      {
        question: "למה ה-negative prompt חשוב ב-SDXL?",
        answer:
          "ב-SDXL, ה-negative prompt הוא כלי שליטה קריטי. הוא לא רק אומר 'מה לא' — הוא מכוון את המודל לאזור ספציפי במרחב הלטנטי. 'Negative: low quality, blurry' דוחף את המודל לכיוון איכות גבוהה. 'Negative: realistic, photo' דוחף לכיוון אמנותי. זה כלי ניווט, לא רק רשימת שלילה.",
      },
    ],
  },

  /* ──────────────────────────────────────────────
   * 5. Imagen 4
   * ────────────────────────────────────────────── */
  {
    slug: "imagen",
    title: "מדריך פרומפטים ל-Google Imagen 4",
    metaTitle: "מדריך פרומפטים ל-Google Imagen 4 — פרוזה, טקסט ורזולוציה 2K | Peroot",
    metaDescription:
      "למד ליצור תמונות AI עם Imagen 4 — כתיבת פרוזה נרטיבית, סינטקס exclude, טקסט עד 25 תווים, רזולוציה 2K ודוגמאות",
    platform: "Google Imagen 4",
    category: "image",
    color: "#f97316",
    icon: "🌟",
    readTime: "6 דקות קריאה",
    lastUpdated: "2026-04-06",
    relatedSlugs: ["gemini-image", "gpt-image", "image-prompts"],

    intro: `<p>כשהגעתי ל-Imagen, הייתי מגיע עם הרגלים מ-Stable Diffusion — מילות מפתח, negative prompts ארוכים, CFG גבוה. הכל היה לא נכון. Imagen הוא עולם אחר.</p>
<p>Imagen 4 של Google רוצה <strong>פרוזה נרטיבית</strong>. תחשוב עליו כמודל שקורא סיפור קצר ומצייר אותו. ככל שהסיפור עשיר יותר ומתאר תחושות, אווירה ופרטים — התמונה מדויקת ומרגשת יותר.</p>
<p>היתרון הגדול: רזולוציה מקורית של 2K, טקסט עד 25 תווים שמרונדר מעולה, וסינטקס <code>[exclude: items]</code> פשוט ואלגנטי לשלילה.</p>`,

    whatIs: `<p>Imagen 4 הוא מודל יצירת תמונות מבית Google DeepMind. הוא בנוי על ארכיטקטורת diffusion transformer וזמין דרך Vertex AI, Google AI Studio, ו-Gemini.</p>
<p>שלוש תכונות מרכזיות:</p>
<ul>
<li><strong>רזולוציה 2K מקורית</strong> — ללא upscale. התמונות נולדות ב-2048 פיקסל ומעלה עם פרטים מדויקים.</li>
<li><strong>טקסט עד 25 תווים לביטוי</strong> — Imagen מרנדר טקסט באופן אמין, כולל לוגואים, שלטים וכותרות. הגבלה: 25 תווים מקסימום לכל ביטוי טקסט.</li>
<li><strong>סינטקס exclude</strong> — במקום negative prompts ארוכים, כותבים <code>[exclude: watermark, text, blurry]</code> — רשימת פריטים פשוטה, ללא משקלות.</li>
</ul>`,

    structure: `<p>המבנה האופטימלי ל-Imagen הוא <strong>פרוזה נרטיבית</strong> — כתוב כאילו אתה מספר סיפור:</p>
<ol>
<li><strong>Scene setting</strong> — הצב את הסצנה: "In a quiet corner of an old European bookshop"</li>
<li><strong>Subject narrative</strong> — תאר את הנושא כחלק מסיפור: "an elderly bookseller with round spectacles carefully examines a leather-bound first edition, his weathered fingers tracing the gold-embossed title"</li>
<li><strong>Sensory details</strong> — פרטים חושיים: "Dust particles dance in the beam of warm afternoon light streaming through a tall arched window. The scent of old paper hangs in the air."</li>
<li><strong>Visual style</strong> — סגנון: "Captured in the style of a Dutch Golden Age painting, with Rembrandt-like chiaroscuro lighting"</li>
<li><strong>[exclude]</strong> (אופציונלי) — <code>[exclude: modern elements, phone, computer]</code></li>
</ol>
<p><strong>טיפ:</strong> "The scent of old paper" — כן, גם תיאורים של ריח ומגע עוזרים. Imagen קורא אותם כרמזים לאווירה ומתרגם לתאורה, טקסטורה וצבעים.</p>
<p><strong>טקסט בתמונה:</strong> הגבל ל-25 תווים מקסימום לכל ביטוי. 'OPEN' — מעולה. 'The Grand Opening Celebration 2026' — ארוך מדי, עלול להיות משובש.</p>`,

    rules: [
      "כתוב פרוזה נרטיבית — Imagen רוצה סיפור, לא רשימה. 'A boy kneels beside a rain puddle, his reflection shimmering' עדיף על 'boy, puddle, reflection, rain'.",
      "הגבל טקסט ל-25 תווים לביטוי — Imagen מרנדר טקסט מצוין עד 25 תווים. מעבר לזה, סיכוי גבוה לשגיאות. פצל טקסט ארוך לכמה ביטויים קצרים.",
      "השתמש בסינטקס [exclude: items] לשלילה — רשימה פשוטה, ללא משקלות: [exclude: watermark, text, people]. 5-8 פריטים מקסימום.",
      "נצל את רזולוציה 2K — Imagen מייצר ב-2K מקורית. תאר טקסטורות ופרטים קטנים — הם יהיו חדים ומדויקים.",
      "הוסף פרטים חושיים — תאר לא רק מראה אלא גם מגע, ריח, טמפרטורה. 'cold morning air', 'rough stone surface', 'sweet aroma of cinnamon'. Imagen מתרגם את זה לאווירה ויזואלית.",
      "השתמש בהפניות לסגנון אמנותי — 'in the style of Vermeer', 'reminiscent of Ansel Adams photography'. Imagen מגיב מעולה להפניות אמנותיות.",
    ],

    params: [
      { name: "Resolution", values: "עד 2K (2048px)", description: "רזולוציה מקורית 2K — ללא upscale, פרטים חדים" },
      { name: "[exclude]", values: "רשימת פריטים", description: "שלילה — [exclude: watermark, text, people]. 5-8 פריטים מקסימום" },
      { name: "Aspect ratio", values: "1:1 / 16:9 / 9:16 / 4:3 / 3:4", description: "יחס גובה-רוחב — תלוי בשימוש" },
    ],

    examples: [
      {
        concept: "פורטרט נרטיבי",
        prompt:
          "In a dimly lit jazz club in 1950s Harlem, a trumpet player stands alone on stage under a single warm spotlight. His eyes are closed, face lifted toward the ceiling, completely lost in the music. Sweat glistens on his forehead. The trumpet's brass catches the light, almost glowing. Behind him, smoke curls lazily through the amber air, and the silhouettes of a captivated audience are barely visible in the darkness. The mood is intimate, sacred, timeless. Captured in rich, warm tones with deep shadows, like a Gordon Parks photograph.",
        explanation:
          "פרוזה נרטיבית מלאה — סיפור קצר שמתאר סצנה, רגש, פרטים חושיים (sweat, smoke, amber air), ו-style reference (Gordon Parks). Imagen מתרגם את כל זה לתמונה עם אווירה מושלמת.",
      },
      {
        concept: "נוף עם טקסט",
        prompt:
          "A vintage-style travel poster of the Amalfi Coast in Italy. The view from high above shows colorful houses cascading down steep cliffs to a turquoise sea. A winding road with a tiny yellow Vespa. In large decorative Art Deco lettering at the top: 'AMALFI'. Below in smaller text: 'Italian Riviera'. Color palette of warm terracotta, deep azure blue, and sun-bleached cream. [exclude: modern elements, phone, realistic photo style]",
        explanation:
          "טקסט קצר ומדויק — 'AMALFI' (6 תווים) ו-'Italian Riviera' (15 תווים) — בטווח ה-25 תווים. Imagen יְרנדר אותם בצורה מושלמת. [exclude] מינימלי ורלוונטי.",
      },
      {
        concept: "צילום אוכל נרטיבי",
        prompt:
          "The morning ritual: A heavy ceramic mug of black coffee sits on a worn wooden kitchen table, morning light slanting through muslin curtains casting soft striped shadows. A half-eaten croissant rests on a blue-rimmed plate, flaky layers visible where it was torn. A few crumbs scattered on the table. The warmth of the coffee is almost tangible — steam rising in a lazy curl. Everything feels lived-in, unhurried, and deeply human. Shot in warm analog film tones, soft focus at the edges.",
        explanation:
          "סיפור של רגע — לא רק 'קפה על שולחן'. פרטים חושיים: 'worn wooden', 'flaky layers', 'warmth almost tangible'. הפרוזה הנרטיבית גורמת ל-Imagen ליצור תמונה שמרגישה אמיתית ורגשית.",
      },
      {
        concept: "אמנות דיגיטלית",
        prompt:
          "A colossal ancient tree growing in the center of a ruined cathedral, its roots breaking through the stone floor, branches reaching through the shattered stained-glass ceiling toward a stormy sky. Vines and wildflowers reclaim the pews and altar. A single shaft of golden light breaks through the clouds and illuminates the tree trunk, creating an almost divine atmosphere. The scene speaks of nature's quiet triumph over human creation. Painted in a detailed fantasy illustration style with rich, saturated colors. [exclude: people, animals, modern objects]",
        explanation:
          "נרטיב עם מסר (nature's triumph over human creation). פרטים מפורטים: שורשים שוברים אבן, ענפים דרך ויטראז', פרחי בר על הספסלים. הפרוזה הסיפורית נותנת ל-Imagen את ההקשר הרגשי שהוא צריך.",
      },
    ],

    mistakes: [
      {
        bad: "כתיבת negative prompt בסגנון SD: 'Negative: (worst quality:1.4), blurry, deformed, bad hands, extra limbs'",
        good: "שימוש בסינטקס Imagen: '[exclude: blurry, deformed, extra limbs]' — רשימה פשוטה ללא משקלות",
        why: "Imagen לא מכיר את סינטקס ה-negative prompts של SD. הוא משתמש ב-[exclude: ] עם רשימה פשוטה. משקלות כמו (word:1.4) יתעלם מהם.",
      },
      {
        bad: "בקשת טקסט ארוך: 'Write on the sign: Welcome to the Grand Annual Summer Music Festival 2026'",
        good: "טקסט קצר: 'A wooden sign reading SUMMER FEST' (11 תווים) — בתוך הגבלת 25 התווים",
        why: "Imagen מרנדר טקסט מעולה עד 25 תווים לביטוי. מעבר ל-25, אותיות מתערבבות, מילים קטועות, ושגיאות כתיב. פצל ביטויים ארוכים או קצר את הטקסט.",
      },
      {
        bad: "כתיבת רשימת מילות מפתח: 'sunset, beach, palm tree, golden hour, waves, tropical, paradise, HDR, 8K'",
        good: "פרוזה: 'A quiet tropical beach at the golden hour. A single palm tree bends gently over calm turquoise water. The last rays of sunlight paint the wet sand in amber and rose.'",
        why: "Imagen בנוי לפרוזה נרטיבית. רשימות מילים נותנות תוצאה גנרית כי המודל לא מקבל הקשר. הסיפור נותן הקשר — והקשר נותן איכות.",
      },
    ],

    personalTip:
      "הטריק הכי חזק שלי ב-Imagen: אני מוסיף פרטים חושיים שאי אפשר 'לראות' — ריח, טמפרטורה, מגע. 'The cold morning air carries the scent of pine needles' לא נראה כמו מידע ויזואלי, אבל Imagen מתרגם את זה לטיפות טל, ערפל קל, ואור בוקר כחלחל. ככל שאתה מעשיר את הסיפור החושי, התמונה מרגישה 'אמיתית' יותר.",

    faq: [
      {
        question: "מה ההבדל בין Imagen ל-Gemini Image?",
        answer:
          "Imagen 4 הוא מודל יצירת תמונות ייעודי — מתמקד ביצירת תמונות מפרומפט טקסט עם רזולוציה 2K. Gemini Image מבוסס על Gemini 2.0 Flash ומתמחה בעריכה אינטראקטיבית, עקביות דמויות (עד 5 דמויות), ושילוב עם שיחה. בקיצור: Imagen לתמונות חדשות באיכות מקסימלית, Gemini Image לעריכה ועקביות.",
      },
      {
        question: "האם Imagen מרנדר טקסט בעברית?",
        answer:
          "Imagen 4 מרנדר טקסט באנגלית באופן מצוין. בעברית התוצאות משתנות — מילים קצרות (3-5 אותיות) בדרך כלל עובדות, אבל משפטים ארוכים עלולים להיות משובשים. לטקסט עברי חשוב, GPT Image הוא בחירה בטוחה יותר. ל-Imagen, העדף אנגלית.",
      },
      {
        question: "מה הסינטקס המדויק של exclude?",
        answer:
          "כותבים [exclude: item1, item2, item3] — רשימה פשוטה עם פסיקים. ללא משקלות, ללא סוגריים נוספים. 5-8 פריטים מקסימום. דוגמה: [exclude: watermark, text, modern clothing, bright colors]. חשוב: הפריטים צריכים להיות ספציפיים — 'modern clothing' עדיף על 'bad things'.",
      },
    ],
  },

  /* ──────────────────────────────────────────────
   * 6. Gemini Image
   * ────────────────────────────────────────────── */
  {
    slug: "gemini-image",
    title: "מדריך פרומפטים ל-Gemini Image — יצירת תמונות עם Gemini",
    metaTitle: "מדריך פרומפטים ל-Gemini Image — עקביות 5 דמויות, 14 refs וטיפים | Peroot",
    metaDescription:
      "למד ליצור תמונות AI עם Gemini Image — עקביות עד 5 דמויות, 14 תמונות ייחוס, Text-first, imageSize CASE SENSITIVE ודוגמאות",
    platform: "Gemini Image",
    category: "image",
    color: "#3b82f6",
    icon: "💎",
    readTime: "7 דקות קריאה",
    lastUpdated: "2026-04-06",
    relatedSlugs: ["imagen", "gpt-image", "image-prompts"],

    intro: `<p>כשהתחלתי לעבוד עם Gemini Image, ניסיתי להשתמש בו כמו Midjourney — פרומפט → תמונה → הבא. טעות. Gemini Image הוא לא מחולל תמונות רגיל — הוא <strong>עורך אינטראקטיבי</strong> שמבין הקשר, זוכר דמויות, ומגיב לשיחה.</p>
<p>היתרון המשמעותי שלו: <strong>עקביות דמויות</strong>. Gemini Image יכול לשמור על עד 5 דמויות עקביות לאורך סדרת תמונות. מעלים 14 תמונות ייחוס, והמודל מבין מי כל דמות ושומר על המראה שלה בסיטואציות שונות.</p>
<p>אבל — ויש אזהרה קריטית — ה-imageSize הוא <strong>CASE SENSITIVE</strong>. אם תכתוב "1k" במקום "1K", תקבל שגיאה. כן, זה מטורף, אבל ככה זה עובד.</p>`,

    whatIs: `<p>Gemini Image הוא מנוע יצירת ועריכת תמונות מבוסס Gemini 2.0 Flash של Google. בשונה ממודלים אחרים שמייצרים תמונה חד-פעמית, Gemini Image <strong>עובד בשיחה</strong> — אפשר לבקש שינויים, לערוך חלקים, ולשמור על עקביות לאורך זמן.</p>
<p>תכונות מרכזיות:</p>
<ul>
<li><strong>עקביות עד 5 דמויות</strong> — מעלים תמונות ייחוס של דמויות, ו-Gemini שומר על המראה שלהן בכל תמונה חדשה</li>
<li><strong>עד 14 תמונות ייחוס</strong> — אפשר להעלות תמונות reference לדמויות, סגנונות, סביבות</li>
<li><strong>Text-first approach</strong> — Gemini מצפה לטקסט לפני תמונות. הסבר מה אתה רוצה ואז העלה references</li>
<li><strong>imageSize CASE SENSITIVE</strong> — "1K" עובד, "1k" נותן שגיאה. תמיד אותיות גדולות!</li>
</ul>`,

    structure: `<p>המבנה האופטימלי ל-Gemini Image מבוסס על <strong>גישת Text-first</strong>:</p>
<ol>
<li><strong>Intent / Context</strong> — מה אתה רוצה ולמה: "Generate a product photo for an e-commerce listing"</li>
<li><strong>Subject description</strong> — תיאור מפורט: "A pair of handcrafted leather boots, dark brown, with visible stitching and a rugged sole"</li>
<li><strong>Character references</strong> (אם רלוונטי) — "Keep the character consistent with the reference images provided — same face, hair color, and body type"</li>
<li><strong>Scene / Composition</strong> — סצנה: "The boots placed on a rustic wooden floor, next to a folded wool blanket, warm cabin setting"</li>
<li><strong>Style + Technical</strong> — "Warm, inviting lifestyle photography. Natural window light, shallow depth of field. imageSize: 1K"</li>
</ol>
<p><strong>סדר קריטי:</strong> טקסט קודם לתמונות ייחוס. תמיד כתוב מה אתה רוצה ואז העלה references.</p>
<p><strong>שגיאה נפוצה:</strong> imageSize חייב להיות CASE SENSITIVE — "1K" ולא "1k"!</p>`,

    rules: [
      "טקסט קודם לתמונות — תמיד כתוב את הפרומפט לפני שאתה מעלה תמונות ייחוס. Gemini מעבד טקסט ראשון ואז משתמש בתמונות כ-reference.",
      "imageSize הוא CASE SENSITIVE — '1K' עובד, '1k' נכשל. תמיד השתמש באותיות גדולות: '1K', '2K'. זו טעות נפוצה שמבזבזת זמן.",
      "הגבל עקביות דמויות ל-5 — Gemini שומר על עקביות עד 5 דמויות בו-זמנית. מעל 5, המודל מתחיל לערבב מאפיינים בין הדמויות.",
      "העלה עד 14 תמונות ייחוס — ככל שהתמונות מגוונות יותר (זוויות שונות, תאורות שונות), העקביות טובה יותר. תמונה אחת לא מספיקה.",
      "נצל את העריכה בשיחה — Gemini זוכר הקשר. 'תשנה את הרקע לחורף' עובד בלי לתאר מחדש את כל הסצנה.",
      "ציין סגנון טקסט ב-English — גם אם הפרומפט בעברית, כתוב מונחי סגנון באנגלית: 'product photography', 'editorial style'. המודל מגיב טוב יותר.",
    ],

    params: [
      { name: "imageSize", values: "1K / 2K (CASE SENSITIVE!)", description: "גודל תמונה — חייב אותיות גדולות! '1K' ולא '1k'" },
      { name: "Character refs", values: "עד 5 דמויות", description: "תמונות ייחוס לשמירת עקביות דמויות" },
      { name: "Reference images", values: "עד 14 תמונות", description: "תמונות ייחוס לסגנון, סביבה, ודמויות" },
    ],

    examples: [
      {
        concept: "עקביות דמות בסיטואציות שונות",
        prompt:
          "Generate an image of Maya — the character from the reference photos — sitting at a café table outdoors, reading a book. She's wearing a casual summer dress, her hair in a loose ponytail exactly as shown in the references. Warm afternoon light, a cappuccino on the table, European street in the background. Lifestyle photography, natural and candid feel. imageSize: 1K",
        explanation:
          "Text-first: הפרומפט מתאר מה רוצים לפני שמעלים references. 'Maya — the character from the reference photos' מקשר בין השם לתמונות. 'exactly as shown in the references' מדגיש עקביות. imageSize: 1K באותיות גדולות.",
      },
      {
        concept: "עריכה אינטראקטיבית",
        prompt:
          "Take the previous image and change the setting from a café to a cozy library. Keep Maya exactly the same — same dress, same hairstyle, same expression. Replace the outdoor background with floor-to-ceiling bookshelves, warm reading lamps, and a leather armchair. The book in her hands stays the same. Warm ambient lighting. imageSize: 1K",
        explanation:
          "שימוש ביכולת העריכה של Gemini — 'Take the previous image' שומר על הקשר. הנחיות ברורות על מה לשמור (Maya, בגדים, ספר) ומה לשנות (רקע, תאורה). זה יתרון ייחודי של Gemini.",
      },
      {
        concept: "צילום מוצר עם סגנון",
        prompt:
          "Create a product photograph of a handmade ceramic coffee mug in earthy terracotta tones. The mug has a slightly imperfect, artisan feel with visible finger marks in the clay. Place it on a raw linen cloth, next to a sprig of dried lavender. Morning light streaming from the left, casting a soft shadow. The aesthetic should feel like a premium Etsy listing — warm, authentic, inviting. White background with subtle warm tone. imageSize: 1K",
        explanation:
          "Context ברור (premium Etsy listing), תיאור חומרי (finger marks in clay, raw linen), פרטים חושיים (morning light, dried lavender). 'Slightly imperfect, artisan feel' — הנחיה שנותנת אותנטיות.",
      },
      {
        concept: "סצנה מרובת דמויות",
        prompt:
          "Generate an image of all three characters — Alex (tall, dark hair), Sam (short, red curly hair), and Jordan (medium build, glasses) — from the reference photos. They're sitting around a campfire at night, laughing together. Alex is telling a story with animated hand gestures. Sam is leaning back on their hands. Jordan is roasting a marshmallow. Starry sky above, pine forest behind them, warm firelight on their faces. Candid documentary style, warm tones. imageSize: 1K",
        explanation:
          "3 דמויות עם תיאור ייחודי לכל אחת — שם + מאפיין פיזי מזהה. כל דמות עם פעולה ייחודית (מספר סיפור, נשען, צולה מרשמלו). Gemini שומר על עקביות כל דמות כל עוד יש reference photos.",
      },
    ],

    mistakes: [
      {
        bad: "כתיבת imageSize: 1k (אות קטנה) — שגיאה CASE SENSITIVE",
        good: "imageSize: 1K (אות גדולה) — תמיד אותיות גדולות",
        why: "הפרמטר imageSize הוא CASE SENSITIVE — '1k' לא מזוהה ונותן שגיאה או תוצאה ברזולוציה ברירת מחדל. זו הטעות הכי שכיחה ב-Gemini Image. תמיד '1K' או '2K'.",
      },
      {
        bad: "העלאת תמונות ייחוס לפני כתיבת הטקסט — Gemini מעבד אותן בלי הקשר",
        good: "טקסט ראשון, תמונות אחר כך — 'Generate an image of this character [description]...' ואז העלאת references",
        why: "Gemini Image עובד ב-Text-first — הוא קורא את הטקסט ראשון ואז משתמש בתמונות כ-reference. אם מעלים תמונות קודם, המודל לא יודע מה לעשות איתן ומתעלם מחלקן.",
      },
      {
        bad: "בקשת עקביות ל-8 דמויות שונות בסצנה אחת",
        good: "הגבלה ל-5 דמויות מקסימום עם references, או פיצול לתמונות נפרדות",
        why: "Gemini תומך בעקביות עד 5 דמויות. מעבר ל-5, המאפיינים מתערבבים — אדם אחד עלול לקבל שיער של אחר, או פנים משתנות. 5 = הגבול הבטוח.",
      },
    ],

    personalTip:
      "הטריק שלי עם Gemini Image: אני משתמש בו כ'סוכנות צילום אינטראקטיבית'. מתחיל עם תמונה ראשונה, ואז בשיחה: 'תחליף את התאורה ל-golden hour', 'תוסיף גשם לרקע', 'תשנה את ההבעה לחיוך'. ב-3-4 איטרציות מגיע לתמונה מושלמת. גם, לעקביות דמויות — תמיד מעלה לפחות 3-4 תמונות ייחוס מזוויות שונות. תמונה אחת לא מספיקה לעקביות אמיתית.",

    faq: [
      {
        question: "מה ההבדל בין Gemini Image ל-Imagen 4?",
        answer:
          "Imagen 4 הוא מודל text-to-image ייעודי — מייצר תמונות ב-2K מפרומפט טקסט. Gemini Image מבוסס על Gemini 2.0 Flash — עורך אינטראקטיבי שעובד בשיחה, תומך בעקביות דמויות, ומאפשר עריכה מתמשכת. Imagen לתמונות חדשות באיכות מקסימלית. Gemini Image לעריכה, עקביות, ושיחה.",
      },
      {
        question: "למה imageSize הוא case sensitive?",
        answer:
          "זו מגבלה של ה-API של Gemini — הפרמטר imageSize מפרסר את הערך כ-enum, ו-'1K' ו-'1k' הם ערכים שונים. רק 'K' גדולה מזוהה. Google לא תיקנו את זה עדיין. הפתרון: תמיד תכתוב '1K' או '2K' עם אותיות גדולות.",
      },
      {
        question: "כמה references צריך להעלות לעקביות טובה?",
        answer:
          "מינימום 3, אידיאלי 5-7 לכל דמות. הגיוון חשוב: תמונות מזוויות שונות (חזית, צד, 3/4), תאורות שונות (טבעי, סטודיו), והבעות שונות (חיוך, רציני, מפתיע). ככל שה-references מגוונים יותר, Gemini 'מבין' את הדמות טוב יותר ושומר על עקביות מדויקת.",
      },
      {
        question: "Gemini Image או GPT Image לעריכה?",
        answer:
          "שניהם עובדים בשיחה אינטראקטיבית, אבל Gemini Image עדיף לעקביות דמויות (5 דמויות + 14 references). GPT Image עדיף לטקסט בתמונה ולעיצוב גרפי. לעריכת צבעים ורקע — שניהם שווים. לסצנות עם דמויות חוזרות — Gemini. לפוסטרים ולוגואים — GPT Image.",
      },
    ],
  },

  /* ──────────────────────────────────────────────
   * 7. מדריך כללי — תמונות
   * ────────────────────────────────────────────── */
  {
    slug: "image-prompts",
    title: "מדריך כללי ליצירת תמונות עם AI — כל מה שצריך לדעת",
    metaTitle:
      "מדריך יצירת תמונות AI — ארכיטקטורת 7 שכבות, השוואה וטיפים | Peroot",
    metaDescription:
      "המדריך המלא ליצירת תמונות AI — ארכיטקטורת 7 שכבות הפרומפט, השוואה בין Midjourney, GPT Image, FLUX, Stable Diffusion, Imagen ו-Gemini",
    platform: "כל הפלטפורמות",
    category: "image",
    color: "#64748b",
    icon: "📸",
    readTime: "10 דקות קריאה",
    lastUpdated: "2026-04-06",
    relatedSlugs: ["midjourney", "flux", "gpt-image", "video-prompts"],

    intro: `<p>כשהתחלתי ליצור תמונות עם AI, חשבתי שזה פשוט — כותבים מה רוצים ומקבלים תמונה. אחרי אלפי תמונות בכל הפלטפורמות, הבנתי שהשטן הוא בפרטים — ושכל פלטפורמה מדברת 'שפה' אחרת.</p>
<p>אחרי עבודה אינטנסיבית עם Midjourney, GPT Image, FLUX, Stable Diffusion, Imagen ו-Gemini Image — בניתי מתודולוגיה שעובדת בכל מקום. במדריך הזה אני חולק את ארכיטקטורת 7 השכבות האוניברסלית, השוואה מפורטת בין כל הפלטפורמות, וטיפים שהופכים פרומפטים בינוניים למעולים.</p>`,

    whatIs: `<p>יצירת תמונות עם AI היא תהליך שבו מודלי Generative AI ממירים טקסט לתמונה. בשנת 2026, 6 פלטפורמות מובילות את השוק:</p>
<ul>
<li><strong>Midjourney</strong> — אסתטיקה מלוטשת, style references, --personalize</li>
<li><strong>GPT Image</strong> — פרוזה עשירה, רינדור טקסט, עריכה בשיחה</li>
<li><strong>FLUX</strong> — סדר מילים = עדיפות, צבעי hex, מהירות</li>
<li><strong>Stable Diffusion</strong> — שליטה מלאה, LoRA, negative prompts (SDXL), שפה טבעית (SD3.5)</li>
<li><strong>Imagen 4</strong> — פרוזה נרטיבית, 2K מקורי, סינטקס exclude</li>
<li><strong>Gemini Image</strong> — עקביות דמויות, 14 references, עריכה אינטראקטיבית</li>
</ul>
<p>כל פלטפורמה מצטיינת במשהו אחר — ולדעת מתי להשתמש באיזו זה מחצית הדרך לתוצאות מקצועיות.</p>`,

    structure: `<p>ארכיטקטורת <strong>7 השכבות האוניברסלית</strong> — המבנה שעובד בכל פלטפורמה:</p>
<ol>
<li><strong>Subject</strong> — מה מצולם: הנושא המרכזי, עם תיאור מפורט</li>
<li><strong>Medium / Style</strong> — באיזה מדיום: צילום, ציור שמן, איור דיגיטלי, אקוורל</li>
<li><strong>Composition</strong> — קומפוזיציה: close-up, wide shot, rule of thirds, symmetry, leading lines</li>
<li><strong>Lighting</strong> — תאורה: golden hour, studio, Rembrandt, rim light, diffused, high key, low key</li>
<li><strong>Color Palette</strong> — צבעים: warm/cool, complementary, monochromatic, pastel, neon</li>
<li><strong>Technical</strong> — מפרט: focal length, aperture, film stock, resolution</li>
<li><strong>Mood / Atmosphere</strong> — אווירה: serene, dramatic, intimate, epic, nostalgic</li>
</ol>
<p>לא כל שכבה חייבת להופיע בכל פרומפט — אבל ככל שתכלול יותר שכבות, התוצאה תהיה מדויקת ומקצועית יותר.</p>

<h3>טבלת השוואה בין הפלטפורמות</h3>
<table style="width:100%; border-collapse:collapse; font-size:14px;">
<thead>
<tr style="border-bottom:2px solid currentColor;">
<th style="text-align:right; padding:8px;">תכונה</th>
<th style="text-align:center; padding:8px;">Midjourney</th>
<th style="text-align:center; padding:8px;">GPT Image</th>
<th style="text-align:center; padding:8px;">FLUX</th>
<th style="text-align:center; padding:8px;">Stable Diffusion</th>
<th style="text-align:center; padding:8px;">Imagen 4</th>
<th style="text-align:center; padding:8px;">Gemini Image</th>
</tr>
</thead>
<tbody>
<tr style="border-bottom:1px solid rgba(128,128,128,0.3);">
<td style="padding:8px; font-weight:bold;">שפת פרומפט</td>
<td style="text-align:center; padding:8px;">שפה טבעית</td>
<td style="text-align:center; padding:8px;">פרוזה עשירה</td>
<td style="text-align:center; padding:8px;">סדר עדיפויות</td>
<td style="text-align:center; padding:8px;">מילות מפתח / טבעי</td>
<td style="text-align:center; padding:8px;">פרוזה נרטיבית</td>
<td style="text-align:center; padding:8px;">Text-first</td>
</tr>
<tr style="border-bottom:1px solid rgba(128,128,128,0.3);">
<td style="padding:8px; font-weight:bold;">Negative prompts</td>
<td style="text-align:center; padding:8px;">--no</td>
<td style="text-align:center; padding:8px;">-</td>
<td style="text-align:center; padding:8px;">-</td>
<td style="text-align:center; padding:8px;">נתמך (SDXL)</td>
<td style="text-align:center; padding:8px;">[exclude:]</td>
<td style="text-align:center; padding:8px;">-</td>
</tr>
<tr style="border-bottom:1px solid rgba(128,128,128,0.3);">
<td style="padding:8px; font-weight:bold;">רזולוציה מקסימלית</td>
<td style="text-align:center; padding:8px;">~2K</td>
<td style="text-align:center; padding:8px;">1792x1024</td>
<td style="text-align:center; padding:8px;">4MP</td>
<td style="text-align:center; padding:8px;">1024x1024+</td>
<td style="text-align:center; padding:8px;">2K</td>
<td style="text-align:center; padding:8px;">2K</td>
</tr>
<tr style="border-bottom:1px solid rgba(128,128,128,0.3);">
<td style="padding:8px; font-weight:bold;">טקסט בתמונה</td>
<td style="text-align:center; padding:8px;">בינוני</td>
<td style="text-align:center; padding:8px;">מצוין</td>
<td style="text-align:center; padding:8px;">בסיסי</td>
<td style="text-align:center; padding:8px;">SD3.5 טוב</td>
<td style="text-align:center; padding:8px;">טוב (25 תווים)</td>
<td style="text-align:center; padding:8px;">טוב</td>
</tr>
<tr style="border-bottom:1px solid rgba(128,128,128,0.3);">
<td style="padding:8px; font-weight:bold;">עריכה בשיחה</td>
<td style="text-align:center; padding:8px;">-</td>
<td style="text-align:center; padding:8px;">מצוין</td>
<td style="text-align:center; padding:8px;">-</td>
<td style="text-align:center; padding:8px;">ControlNet</td>
<td style="text-align:center; padding:8px;">-</td>
<td style="text-align:center; padding:8px;">מצוין</td>
</tr>
<tr style="border-bottom:1px solid rgba(128,128,128,0.3);">
<td style="padding:8px; font-weight:bold;">עקביות דמויות</td>
<td style="text-align:center; padding:8px;">--oref</td>
<td style="text-align:center; padding:8px;">בשיחה</td>
<td style="text-align:center; padding:8px;">-</td>
<td style="text-align:center; padding:8px;">IP-Adapter</td>
<td style="text-align:center; padding:8px;">-</td>
<td style="text-align:center; padding:8px;">5 דמויות</td>
</tr>
<tr>
<td style="padding:8px; font-weight:bold;">חוזקה מרכזית</td>
<td style="text-align:center; padding:8px;">אסתטיקה</td>
<td style="text-align:center; padding:8px;">טקסט + גרפיקה</td>
<td style="text-align:center; padding:8px;">מהירות + דיוק צבע</td>
<td style="text-align:center; padding:8px;">שליטה מלאה</td>
<td style="text-align:center; padding:8px;">נרטיב + 2K</td>
<td style="text-align:center; padding:8px;">עקביות + עריכה</td>
</tr>
</tbody>
</table>`,

    rules: [
      "התאם את שפת הפרומפט לפלטפורמה — Midjourney רוצה שפה טבעית, FLUX רוצה סדר עדיפויות, SDXL רוצה מילות מפתח, Imagen רוצה פרוזה נרטיבית.",
      "תמיד הגדר מדיום / סגנון — 'oil painting', 'photograph', 'watercolor'. ללא מדיום, כל מודל בוחר ברירת מחדל שנראית גנרית.",
      "הוסף תאורה ספציפית — 'golden hour', 'studio lighting', 'Rembrandt light'. תאורה היא ההבדל בין תמונה שטוחה לתמונה תלת-ממדית ומרשימה.",
      "הגדר פלטת צבעים — 'warm tones', 'desaturated', 'complementary colors of teal and orange'. צבע קובע אווירה ונותן עקביות ויזואלית.",
      "השתמש במפרט מצלמה לריאליזם — 'shot with 85mm f/1.4', '35mm film'. מפרט מצלמה עוזר לכל המודלים לייצר תוצאה צילומית מקצועית.",
      "בחר פלטפורמה לפי המשימה — טקסט בתמונה → GPT Image. אסתטיקה אמנותית → Midjourney. מהירות + דיוק → FLUX. שליטה מלאה → SD. נרטיב → Imagen. עקביות דמויות → Gemini.",
    ],

    params: [],

    examples: [
      {
        concept: "פרומפט אוניברסלי (עובד בכל פלטפורמה)",
        prompt:
          "A solitary lighthouse on a rocky cliff at dusk. Dramatic storm clouds parting to reveal the last golden light of the day. The lighthouse beam cuts through gathering mist. Waves crash against the base of the cliff, white spray caught mid-air. Shot with a wide-angle lens, landscape photography, high dynamic range. Color palette of deep navy, warm gold, and weathered gray stone.",
        explanation:
          "7 שכבות: Subject (lighthouse on cliff) → Medium (landscape photography) → Composition (wide-angle) → Lighting (dusk, golden light) → Colors (navy, gold, gray) → Technical (wide-angle, HDR) → Mood (dramatic, solitary). עובד בכל פלטפורמה.",
      },
      {
        concept: "פורטרט עם התאמה לפלטפורמה",
        prompt:
          "A portrait of a ceramicist in her workshop, hands covered in wet clay, concentrating on shaping a bowl on a spinning wheel. Warm natural light from a dusty window, shelves of finished pottery behind her. Shot on medium format film, shallow depth of field, earth tones — raw sienna, cream, and slate gray.",
        explanation:
          "פרומפט שעובד בכל מקום, אבל אפשר לשדרג: ב-Midjourney הוסף '--s 500 --ar 3:4', ב-FLUX הוסף 'Hasselblad X2D, 80mm f/2.8, clay in #8B6914', ב-Imagen הוסף פרטים חושיים כמו 'the cool dampness of fresh clay'. התאמה לפלטפורמה תשדרג את התוצאה פי 3.",
      },
      {
        concept: "עיצוב גרפי (מותאם ל-GPT Image)",
        prompt:
          "A sleek event invitation card for a tech startup launch party. Dark background (#0A0A0F) with a subtle gradient. A minimalist geometric logo in electric blue (#00B4FF) centered in the upper third. Below it, in clean white sans-serif text: 'LAUNCH NIGHT'. Under that in smaller text: 'March 15, 2026 | 8PM | The Garage TLV'. At the bottom, a thin horizontal line in electric blue. The card should feel premium, futuristic, and clean.",
        explanation:
          "פרומפט שמנצל את היכולת הגרפית של GPT Image — layout, טקסט מדויק, צבעים בהקס. יעבוד בינוני בפלטפורמות אחרות אבל מושלם ב-GPT Image.",
      },
    ],

    mistakes: [
      {
        bad: "שימוש באותו פרומפט בכל הפלטפורמות — copy-paste ללא התאמה",
        good: "התאמה: הוספת --sref ל-Midjourney, hex colors ל-FLUX, פרוזה ל-Imagen, (weights) ל-SDXL, text-first ל-Gemini",
        why: "כל פלטפורמה מפרסרת פרומפטים אחרת. פרומפט גנרי נותן תוצאה 'בסדר' בכולן אבל לא מנצל שום חוזקה ייחודית. 5 דקות של התאמה חוסכות 30 דקות של ניסוי.",
      },
      {
        bad: "לא לציין מדיום / סגנון: 'A cat on a chair' — תיאור ללא כיוון אמנותי",
        good: "תמיד לציין: 'A cat on a chair, oil painting in the style of the Dutch masters, warm chiaroscuro lighting'",
        why: "ללא מדיום, כל מודל בוחר ברירת מחדל שנראית 'AI-שית'. מדיום (oil painting, photograph, watercolor) נותן למודל כיוון אמנותי ברור ותוצאה מקצועית.",
      },
      {
        bad: "לא לציין תאורה — לסמוך על ברירת מחדל",
        good: "תמיד לבחור תאורה: 'golden hour side light', 'studio soft box from above', 'dramatic rim light'",
        why: "תאורה היא 50% מהאסתטיקה של תמונה. בלי הנחיית תאורה, המודל בוחר תאורה שטוחה ובינונית. תאורה ספציפית הופכת תמונה רגילה למרשימה.",
      },
    ],

    personalTip:
      "הטיפ הכי חשוב שלי אחרי אלפי תמונות: אל תתחיל מהפרומפט — תתחיל מהשאלה 'מה אני רוצה להרגיש כשאני מסתכל על התמונה?' אם התשובה היא 'נוסטלגיה' — תוסיף warm film tones, golden light, slight grain. אם התשובה היא 'יראה' — תוסיף dramatic scale, low angle, storm clouds. הרגש מנחה את הפרומפט — לא להפך.",

    faq: [
      {
        question: "איזו פלטפורמה הכי טובה למתחילים?",
        answer:
          "GPT Image (ChatGPT). לא צריך ללמוד פרמטרים, אין סינטקס מיוחד — פשוט כותבים מה רוצים בשפה טבעית ומקבלים תוצאה. אפשר גם לערוך בשיחה: 'תשנה את הצבע', 'תזיז את הטקסט'. כשמרגישים בנוח, עוברים ל-Midjourney לאסתטיקה אמנותית.",
      },
      {
        question: "איזו פלטפורמה לבחור לפי סוג המשימה?",
        answer:
          "לוגו / פוסטר / טקסט → GPT Image. אמנות / צילום אמנותי / פנטזיה → Midjourney. מהירות / דיוק צבע / מוצר → FLUX. שליטה מלאה / LoRA / open-source → Stable Diffusion. נרטיב / 2K / תיאורים ספרותיים → Imagen. עקביות דמויות / עריכה → Gemini Image.",
      },
      {
        question: "מה ההבדל בין פרומפט לתמונה לפרומפט לוידאו?",
        answer:
          "פרומפט לתמונה מתאר רגע קפוא — קומפוזיציה, תאורה, צבעים, מדיום, אווירה. פרומפט לוידאו מוסיף מימד זמן: תנועת מצלמה, פעולות, פיזיקה, ואולי אודיו. חשוב על זה כך: תמונה = צילום, וידאו = צילום + תנועה + זמן. הפרומפט לתמונה מתאר מצב, הפרומפט לוידאו מתאר שינוי.",
      },
      {
        question: "האם מותר לערבב סגנונות מפלטפורמות שונות?",
        answer:
          "כן, וזו בעצם הגישה המקצועית. למשל: ליצור קונספט ראשוני ב-GPT Image (בזכות העריכה בשיחה), לשדרג את האסתטיקה ב-Midjourney, ולייצר וריאציות ב-FLUX. כל פלטפורמה מצטיינת בשלב אחר של התהליך.",
      },
      {
        question: "כמה מילים צריך בפרומפט אופטימלי?",
        answer:
          "תלוי בפלטפורמה. FLUX: 15-75 מילים (sweet spot 30-50). Midjourney: 20-80 מילים. GPT Image: ככל שיותר מפורט יותר טוב (50-150). Imagen: פרוזה עשירה 40-100 מילים. Stable Diffusion: SDXL 20-50 מילות מפתח, SD3.5 30-80 מילים טבעיות. כלל אצבע: 30-60 מילים ממוקדות עדיפות על 150 מילים מפוזרות.",
      },
    ],
  },
];
