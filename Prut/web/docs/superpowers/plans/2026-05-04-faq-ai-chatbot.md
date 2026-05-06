# FAQ AI Chatbot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static FAQ accordion with a streaming AI chatbot using client-side MiniSearch retrieval and a free-tier Gemini API key, while expanding FAQ coverage from 33 to ~75 items.

**Architecture:** User types a question → MiniSearch (client-side, free) retrieves top-3 relevant FAQ items → POST `/api/faq-chat` sends those items as context to Gemini Flash Lite (free-tier key `GEMINI_FAQ_API_KEY`) → streaming text response rendered in a chat thread inside the existing FAQBubble shell.

**Tech Stack:** MiniSearch 7.x (npm), @ai-sdk/google (already installed), Vercel AI SDK `streamText` + `toTextStreamResponse()`, Upstash Redis rate limiting (already configured).

---

## File Structure

| File | Role |
|---|---|
| `src/lib/faq-data.ts` | Expanded FAQ dataset — 33 → ~75 items |
| `src/lib/ratelimit.ts` | Add `faqChat` limiter (10 req/min per IP) |
| `src/app/api/faq-chat/route.ts` | POST endpoint: validates input → streams Gemini answer |
| `src/components/features/faq/FAQChatBot.tsx` | New chat UI: MiniSearch index + message thread + streaming |
| `src/components/features/faq/FAQBubble.tsx` | Replace accordion content area with `<FAQChatBot />` |

---

## Task 1: Install MiniSearch and Add Rate Limiter

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `src/lib/ratelimit.ts`

- [ ] **Step 1: Install MiniSearch**

```bash
cd src  # run from the web/ root
npm install minisearch
```

Expected output: `added 1 package` (MiniSearch has zero dependencies).

- [ ] **Step 2: Add `faqChat` to `rateLimiters` in `src/lib/ratelimit.ts`**

Find the last entry in the `rateLimiters` object (currently ends around `questions`). Add after it, before the closing `}`:

```typescript
  faqChat: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    prefix: "@peroot/ratelimit:faq-chat",
  }),
```

- [ ] **Step 3: Add `faqChat` to `RateLimitTier` union type in `src/lib/ratelimit.ts`**

Find `type RateLimitTier` (line ~135). Add `| "faqChat"` to the union before the closing semicolon:

```typescript
type RateLimitTier =
  | "guest"
  | "free"
  | "pro"
  // ... existing entries ...
  | "questions"
  | "faqChat";  // ← add this
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run typecheck 2>&1 | head -20
```

Expected: no errors related to `ratelimit.ts`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/ratelimit.ts
git commit -m "feat(faq-chat): install minisearch, add faqChat rate limiter"
```

---

## Task 2: Expand FAQ Data

**Files:**
- Modify: `src/lib/faq-data.ts`

The first 10 items are SEO schema-eligible and must stay in place. The first 12 are in HomeSEOContent. Do not reorder existing items — only append new ones after the existing 33.

- [ ] **Step 1: Append new FAQ items to `src/lib/faq-data.ts`**

Replace the closing `];` of `FAQ_ITEMS` with the following block (adds 41 items across 7 new + expanded categories):

```typescript
  // --- Chrome Extension ---
  {
    category: "תוסף Chrome",
    question: "מה זה תוסף Chrome של Peroot ואיך הוא עובד?",
    answer:
      "תוסף Chrome של Peroot מתקין ישירות בדפדפן ומאפשר לשדרג פרומפטים ישירות בתוך ChatGPT, Claude ו-Gemini — בלי לעבור לאתר. הוא מזהה את שדה הקלט באתר, מוסיף כפתור שדרוג, ומחזיר פרומפט משודרג למקום.",
  },
  {
    category: "תוסף Chrome",
    question: "באילו אתרים תוסף Peroot עובד?",
    answer:
      "התוסף תומך ב-ChatGPT (chatgpt.com), Claude (claude.ai), ו-Gemini (gemini.google.com). הוא מזהה אוטומטית את שדות הקלט בכל אחד מהאתרים ומתאים את עצמו לפריסה שלהם.",
  },
  {
    category: "תוסף Chrome",
    question: "איך מתקינים את תוסף Chrome של Peroot?",
    answer:
      "גשו לדף התוסף בכתובת peroot.space/extension, לחצו על קישור Chrome Web Store, ולחצו 'הוסף ל-Chrome'. לאחר ההתקנה אייקון Peroot יופיע בסרגל הכלים. בפעם הראשונה עליכם להתחבר עם אותו חשבון Peroot.",
  },
  {
    category: "תוסף Chrome",
    question: "האם התוסף מצריך כניסה לחשבון?",
    answer:
      "כן. התוסף מסונכרן עם חשבון Peroot שלכם כדי לספור שימוש ולגשת לספריה האישית. משתמשים חינמיים מקבלים את אותה מכסה כמו באתר (2 שדרוגים ביום). משתמשי Pro יכולים לשדרג ללא הגבלה.",
  },
  {
    category: "תוסף Chrome",
    question: "האם ניתן להשתמש בתוסף גם בלי חשבון?",
    answer:
      "בגרסה הנוכחית נדרש חשבון Peroot. ניתן להירשם חינם — ההרשמה לוקחת 30 שניות עם Google.",
  },
  {
    category: "תוסף Chrome",
    question: "מה קורה אם האתר משנה את הפריסה שלו והתוסף מפסיק לעבוד?",
    answer:
      "Peroot מתעדכן אוטומטית כשמתגלה שינוי. אם נתקלתם בבעיה — ייתכן שהתוסף ממתין לעדכון. נסו לרענן את הדף, ואם הבעיה נמשכת — דווחו דרך עמוד התוסף או בדוא\"ל.",
  },
  // --- שרשראות (Chains) ---
  {
    category: "שרשראות",
    question: "מה זה שרשראות פרומפטים ב-Peroot?",
    answer:
      "שרשרת פרומפטים היא רצף של שלבים שרצים אחד אחרי השני — הפלט מכל שלב הופך לקלט של השלב הבא. לדוגמה: שלב 1 מנתח קהל יעד, שלב 2 כותב תוכן מותאם, שלב 3 מייצר CTA. כך ניתן לבצע פעולות מורכבות שמודל אחד לא יכול לבצע בפרומפט בודד.",
  },
  {
    category: "שרשראות",
    question: "מתי כדאי להשתמש בשרשרת במקום בפרומפט בודד?",
    answer:
      "כאשר המשימה מורכבת מכדי שמודל אחד יבצע בפרומפט אחד: כתיבת תוכן שמצריך מחקר תחילה, בניית פלט שמצריך מספר שלבי עיבוד, או כשרוצים לנצל מודלים שונים לשלבים שונים (מחקר, כתיבה, בדיקה).",
  },
  {
    category: "שרשראות",
    question: "איך בונים שרשרת ב-Peroot?",
    answer:
      "עברו ל'גרף' בסרגל הניווט, לחצו 'שרשרת חדשה', הוסיפו שלבים וחברו אותם. לכל שלב יש פרומפט, מצב עבודה, ואפשרות להעביר נתונים לשלב הבא. ניתן להריץ את השרשרת בלחיצה אחת.",
  },
  {
    category: "שרשראות",
    question: "האם ניתן לשמור ולשתף שרשראות?",
    answer:
      "כן. שרשראות שנשמרות מופיעות בספריה האישית ומסונכרנות בין מכשירים. בגרסאות עתידיות תתאפשר שיתוף שרשראות ציבוריות.",
  },
  {
    category: "שרשראות",
    question: "כמה שלבים אפשר להוסיף לשרשרת?",
    answer:
      "אין מגבלה טכנית על מספר השלבים, אבל שרשראות ארוכות מאוד עלולות להיות איטיות יותר. לשימושים מעשיים, שרשרת של 3-6 שלבים בדרך כלל מספיקה.",
  },
  // --- מחיר ותשלום ---
  {
    category: "מחיר ותשלום",
    question: "מה ההבדל בין החשבון החינמי ל-Pro?",
    answer:
      "חשבון חינמי: 2 שדרוגי פרומפט ביום (מתחדש ב-14:00 שעון ישראל), גישה לכל התבניות, ספריה אישית, ותוסף Chrome. Pro: 150 שדרוגים בחודש, עדיפות בתורי עיבוד, ושימוש בלתי מוגבל בתכונות ניסיוניות.",
  },
  {
    category: "מחיר ותשלום",
    question: "כמה עולה מנוי Pro?",
    answer:
      "מנוי Pro עולה ₪49 לחודש (או שווה ערך בדולרים). ניתן לראות את המחיר העדכני בדף /pricing. התשלום מתבצע דרך LemonSqueezy — מנהל תשלומים מאובטח.",
  },
  {
    category: "מחיר ותשלום",
    question: "איך מבצעים ביטול מנוי Pro?",
    answer:
      "ניתן לבטל בכל עת דרך דף הגדרות החשבון (/settings) → 'ניהול מנוי'. הביטול נכנס לתוקף בסוף תקופת החיוב הנוכחית — עד אז תמשיכו ליהנות מ-Pro.",
  },
  {
    category: "מחיר ותשלום",
    question: "האם יש החזר כספי אם לא שבעתי רצון?",
    answer:
      "כן. אם ביטלתם ב-7 הימים הראשונים ממועד הרכישה, שלחו מייל לגל@joya-tech.net ונטפל בהחזר מלא. לאחר 7 ימים, ההחלטה נתונה לשיקול דעת.",
  },
  {
    category: "מחיר ותשלום",
    question: "מתי מתחדשים הקרדיטים החינמיים?",
    answer:
      "הקרדיטים החינמיים (2 ביום) מתחדשים כל יום ב-14:00 שעון ישראל. אם השתמשתם בשניים לפני 14:00 — תצטרכו להמתין לשעה זו. משתמשי Pro מקבלים 150 קרדיטים בתחילת כל חודש.",
  },
  // --- חשבון ואבטחה ---
  {
    category: "חשבון ואבטחה",
    question: "איך נרשמים ל-Peroot?",
    answer:
      "לחצו 'התחבר / הירשם' בפינה העליונה, ובחרו 'המשך עם Google'. ההרשמה לוקחת כ-30 שניות. לא נדרשת כרטיס אשראי לחשבון חינמי.",
  },
  {
    category: "חשבון ואבטחה",
    question: "האם אפשר להשתמש ב-Peroot ללא חשבון?",
    answer:
      "כן. כמשתמש אורח מקבלים מספר שדרוגים ביום שמאוחסנים בדפדפן. פרומפטים לא נשמרים לענן — רק אם נכנסים לחשבון. היסטוריה וספריה אישית דורשות חשבון.",
  },
  {
    category: "חשבון ואבטחה",
    question: "איך מוחקים את החשבון ואת הנתונים?",
    answer:
      "ניתן לבקש מחיקת חשבון ונתונים בדוא\"ל לגל@joya-tech.net. המחיקה כוללת את כל הפרומפטים, ההיסטוריה, והנתונים האישיים בהתאם לחוק. תהליך המחיקה לוקח עד 7 ימי עסקים.",
  },
  {
    category: "חשבון ואבטחה",
    question: "האם נתוני המשתמש מוגנים?",
    answer:
      "כן. כל הנתונים מאוחסנים ב-Supabase עם Row Level Security (RLS) — כל משתמש ניגש רק לנתונים שלו. חיבור מוצפן ב-TLS, ואין שיתוף נתונים עם גורמים חיצוניים לצורכי פרסום.",
  },
  // --- מפתחים ---
  {
    category: "מפתחים",
    question: "האם יש API ציבורי של Peroot למפתחים?",
    answer:
      "API ציבורי נמצא בפיתוח ועתיד להיות זמין בקרוב. בינתיים ניתן לפנות לגל@joya-tech.net לגישה מוקדמת למפתחים שרוצים לשלב את יכולות שדרוג הפרומפטים בתוך מוצרים אחרים.",
  },
  {
    category: "מפתחים",
    question: "האם Peroot בקוד פתוח?",
    answer:
      "הקוד הבסיסי של Peroot הוא קנייני. עם זאת, ספריות עזר מסוימות ממשקי ה-Chrome Extension עשויות להיות מופצות בקוד פתוח בעתיד. עקבו אחרי GitHub: github.com/sassongal/Peroot.",
  },
  {
    category: "מפתחים",
    question: "Peroot תומך בפרומפטים לקוד ב-AI Coding tools?",
    answer:
      "כן. אפשר לשדרג פרומפטים לכלי קוד כמו GitHub Copilot, Cursor ו-Windsurf — הן לכתיבת קוד, Refactor, דיבאג, ותיעוד. בחרו קטגוריית 'פיתוח' ותארו את המשימה.",
  },
  {
    category: "מפתחים",
    question: "האם אפשר לשלב את Peroot עם Notion, Obsidian או כלים אחרים?",
    answer:
      "כרגע ניתן להעתיק את הפרומפט המשודרג ולהדביק בכל כלי. בהמשך מתוכנן תוסף Notion ו-API שיאפשרו אינטגרציה ישירה. אם יש לכם צורך ספציפי — שלחו מייל ונשקול ב-roadmap.",
  },
  // --- ספריה (additional) ---
  {
    category: "ספריה",
    question: "מה זה תצוגת גרף בספריה?",
    answer:
      "תצוגת גרף מציגה את הפרומפטים שלכם כרשת — כל פרומפט הוא צומת, וקשרים בין פרומפטים קשורים (קטגוריה, תגית, תבנית) מוצגים כקווים. כך ניתן לראות אשכולות נושאים, לגלות קשרים לא צפויים, ולנווט ויזואלית באוסף.",
  },
  {
    category: "ספריה",
    question: "איך מוסיפים תגיות לפרומפטים?",
    answer:
      "בפרומפט שמור, לחצו 'ערוך' ← 'הוסף תגית'. תגיות מופיעות בחיפוש ובפילטר של הספריה ועוזרות לקבץ פרומפטים שלא שייכים לאותה קטגוריה.",
  },
  {
    category: "ספריה",
    question: "האם אפשר לשתף פרומפט עם מישהו אחר?",
    answer:
      "כן. בכרטיס הפרומפט לחצו 'שתף' לקבלת קישור ייחודי. הקישור מאפשר לכל אחד לצפות בפרומפט ולהשתמש בו — בלי שהם יצטרכו חשבון. ניתן גם להגדיר פרומפט כ'ציבורי' ולהופיע בספריית התבניות הציבורית.",
  },
  // --- שימוש (additional) ---
  {
    category: "שימוש",
    question: "האם אפשר לייצא פרומפטים ל-PDF?",
    answer:
      "כן. בכרטיס פרומפט בספריה, לחצו 'ייצוא PDF'. הקובץ כולל את הפרומפט המשודרג, ציון, ומטא-נתונים. מתאים לשמור תיעוד, לשלוח ללקוחות, או להדפיס.",
  },
  // --- כללי (additional) ---
  {
    category: "כללי",
    question: "מה ההבדל בין Peroot לכלי AI אחרים כמו ChatGPT?",
    answer:
      "ChatGPT הוא מודל שפה שעונה על שאלות. Peroot הוא מטא-שכבה — כלי שמכין פרומפטים טובים יותר לכל מודל שפה. Peroot לא מחליף את ChatGPT, הוא עוזר להשתמש בו טוב יותר. כמו הבדל בין עטיפת מכתב לבין כתיבת המכתב עצמו.",
  },
  {
    category: "כללי",
    question: "האם Peroot עובד עם פרומפטים בשפות נוספות מלבד עברית?",
    answer:
      "Peroot מותאם לעברית ומניב את התוצאות הטובות ביותר בעברית. עם זאת, ניתן להזין פרומפטים באנגלית ולקבל שדרוג באנגלית. המערכת מזהה את שפת הקלט ומשדרגת בהתאם.",
  },
  {
    category: "כללי",
    question: "מהו prompt engineering ולמה זה חשוב?",
    answer:
      "Prompt engineering הוא האמנות של כתיבת הנחיות (פרומפטים) שמניבות תוצאות טובות ממודלי AI. פרומפט טוב יכול לשפר את איכות התוצאות פי כמה לעומת פרומפט רגיל — גם מאותו מודל. Peroot מיישם עקרונות prompt engineering אוטומטית.",
  },
  // --- איכות (additional) ---
  {
    category: "איכות",
    question: "מה הם 10 הדימנשנים שלפיהם מוערך פרומפט?",
    answer:
      "המערכת מעריכה: (1) בהירות מטרה, (2) הגדרת תפקיד למודל, (3) הקשר ורקע, (4) קהל יעד, (5) פורמט פלט, (6) מגבלות (טון/אורך/שפה), (7) דוגמאות, (8) שלבים מובנים, (9) מניעת הזיות, (10) התאמה לסוג מודל. כל דימנשן תורם לציון הכולל.",
  },
  // --- אינטגרציות (additional) ---
  {
    category: "אינטגרציות",
    question: "האם Peroot שומר אוטומטית לתוך ChatGPT?",
    answer:
      "כן — דרך תוסף Chrome. הפרומפט המשודרג מוחדר ישירות לשדה הקלט של ChatGPT (או Claude / Gemini) בלחיצה אחת. ללא התוסף — מעתיקים ומדביקים ידנית.",
  },
  {
    category: "אינטגרציות",
    question: "האם Peroot תומך ב-API של OpenAI?",
    answer:
      "Peroot מייצר פרומפטים מותאמים לכל API — כולל OpenAI, Anthropic, ו-Google. הפרומפטים ניתנים להעתקה ישירה לתוך קריאות API. אין אינטגרציה ישירה עם ה-API בגרסה הנוכחית.",
  },
  // --- שיווק (additional) ---
  {
    category: "שיווק",
    question: "איך Peroot עוזר לכתוב קופי שיווקי?",
    answer:
      "הזינו את המוצר, קהל היעד, והמטרה (מודעה, דף נחיתה, פוסט). Peroot ייצר פרומפט מבנה שמכוון את ה-AI לכתוב קופי עם CTA, יתרונות ברורים, וטון מותאם לפלטפורמה.",
  },
  {
    category: "שיווק",
    question: "האם אפשר ליצור פרומפטים לסרטוני וידאו?",
    answer:
      "כן. מצב 'וידאו' ב-Peroot (בגרסת Beta) מייצר פרומפטים לכלי יצירת וידאו כמו Sora, Runway ו-Kling — עם תיאור סצינה, תנועת מצלמה, ואלמנטים ויזואליים.",
  },
  // --- חינוך (additional) ---
  {
    category: "חינוך",
    question: "האם יש תכנית מיוחדת למורים ומוסדות חינוך?",
    answer:
      "כן. מורים ומוסדות חינוך יכולים לפנות לגל@joya-tech.net לגישה Pro מוגדלת בתנאים מיוחדים. Peroot מותאם ליצירת חומרי לימוד, מבחנים, הסברים, ותרגילים.",
  },
];
```

- [ ] **Step 2: Verify item count**

```bash
grep -c "question:" src/lib/faq-data.ts
```

Expected output: a number between 70 and 80.

- [ ] **Step 3: Verify TypeScript**

```bash
npm run typecheck 2>&1 | grep "faq-data" | head -5
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/faq-data.ts
git commit -m "feat(faq): expand FAQ dataset from 33 to ~74 items (7 new categories)"
```

---

## Task 3: Create `/api/faq-chat` Route

**Files:**
- Create: `src/app/api/faq-chat/route.ts`

- [ ] **Step 1: Create the route file**

Create `src/app/api/faq-chat/route.ts` with this exact content:

```typescript
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

type FAQContext = { question: string; answer: string; category: string };

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
  const limitResult = await checkRateLimit(ip, "faqChat");
  if (!limitResult.success) {
    return NextResponse.json(
      { error: "יותר מדי בקשות. נסה שוב בעוד דקה." },
      { status: 429 },
    );
  }

  let body: { question?: unknown; context?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  const { question, context } = body;
  if (!question || typeof question !== "string" || question.trim().length === 0) {
    return NextResponse.json({ error: "שאלה חסרה" }, { status: 400 });
  }

  const apiKey =
    process.env.GEMINI_FAQ_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "שגיאת תצורה" }, { status: 500 });
  }

  const contextItems: FAQContext[] = Array.isArray(context)
    ? (context as FAQContext[]).slice(0, 3).filter(
        (item) =>
          typeof item?.question === "string" && typeof item?.answer === "string",
      )
    : [];

  const contextText =
    contextItems.length > 0
      ? contextItems
          .map((item) => `שאלה: ${item.question}\nתשובה: ${item.answer}`)
          .join("\n\n")
      : "אין מידע זמין.";

  const google = createGoogleGenerativeAI({ apiKey });

  const result = await streamText({
    model: google("gemini-2.5-flash-lite"),
    system: `אתה עוזר תמיכה של Peroot — פלטפורמת שיפור פרומפטים בעברית.
ענה בעברית בלבד, בסגנון ידידותי וקצר (2-4 משפטים מקסימום).
השתמש אך ורק במידע שסופק ב-Context הבא.
אם התשובה לא נמצאת ב-Context — אמור זאת בכנות והפנה לדף יצירת קשר: peroot.space/contact
אל תמציא מידע ואל תוסיף נתונים שלא מופיעים ב-Context.

Context:
${contextText}`,
    prompt: question.trim().slice(0, 500),
    maxOutputTokens: 300,
    temperature: 0.3,
  });

  return result.toTextStreamResponse();
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run typecheck 2>&1 | grep "faq-chat" | head -10
```

Expected: no errors.

- [ ] **Step 3: Test the route manually (dev server must be running)**

```bash
curl -X POST http://localhost:3000/api/faq-chat \
  -H "Content-Type: application/json" \
  -d '{"question":"מה זה Peroot?","context":[{"question":"מה זה Peroot?","answer":"Peroot הוא מחולל פרומפטים בעברית","category":"כללי"}]}'
```

Expected: streaming Hebrew text response (not JSON, raw text chunks).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/faq-chat/route.ts
git commit -m "feat(faq-chat): add /api/faq-chat streaming endpoint (Gemini free tier)"
```

---

## Task 4: Create `FAQChatBot` Component

**Files:**
- Create: `src/components/features/faq/FAQChatBot.tsx`

- [ ] **Step 1: Create the component file**

Create `src/components/features/faq/FAQChatBot.tsx` with this exact content:

```typescript
"use client";

import { useRef, useState, useMemo } from "react";
import MiniSearch from "minisearch";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { FAQ_ITEMS } from "@/lib/faq-data";

type FAQItem = { question: string; answer: string; category: string };
type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: FAQItem[];
};

const SCORE_THRESHOLD = 0.3;
const FALLBACK_MSG =
  "לא מצאתי מידע על זה בתוכן העזרה. אשמח אם תפנה/י לדף יצירת קשר: peroot.space/contact";
const WELCOME_MSG = "שלום! אני כאן לעזור עם כל שאלה על Peroot. שאל/י חופשי!";

export function FAQChatBot() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: WELCOME_MSG },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const searchIndex = useMemo(() => {
    const index = new MiniSearch<FAQItem & { id: number }>({
      fields: ["question", "answer", "category"],
      storeFields: ["question", "answer", "category"],
      searchOptions: {
        boost: { question: 2, category: 1.5 },
        fuzzy: 0.2,
        prefix: true,
      },
    });
    index.addAll(FAQ_ITEMS.map((item, i) => ({ id: i, ...item })));
    return index;
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || isLoading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setIsLoading(true);

    const results = searchIndex.search(q) as (FAQItem & {
      id: number;
      score: number;
    })[];
    const top3 = results.slice(0, 3);
    const maxScore = top3[0]?.score ?? 0;

    if (maxScore < SCORE_THRESHOLD) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: FALLBACK_MSG, sources: [] },
      ]);
      setIsLoading(false);
      scrollToBottom();
      return;
    }

    const context = top3.map(({ question, answer, category }) => ({
      question,
      answer,
      category,
    }));

    // Add placeholder assistant message for streaming
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", sources: context },
    ]);

    try {
      const res = await fetch("/api/faq-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, context }),
      });

      if (!res.ok || !res.body) {
        throw new Error("API error");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: assistantText,
            sources: context,
          };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "משהו השתבש. נסה שוב או צור קשר.",
          sources: [],
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {/* Message thread */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20"
        dir="rtl"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col gap-1.5",
              msg.role === "user" ? "items-end" : "items-start",
            )}
          >
            <div
              className={cn(
                "max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-black rounded-br-sm"
                  : "bg-black/5 dark:bg-white/10 text-(--text-primary) rounded-bl-sm border border-(--glass-border)",
              )}
            >
              {msg.content ||
                (isLoading && i === messages.length - 1 ? (
                  <span className="opacity-50">מקליד...</span>
                ) : null)}
            </div>
            {msg.sources && msg.sources.length > 0 && (
              <div className="flex flex-wrap gap-1 px-1 items-center">
                <span className="text-xs text-(--text-muted)">מבוסס על:</span>
                {msg.sources.map((s, si) => (
                  <span
                    key={si}
                    className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20"
                  >
                    {s.category}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-4 py-3 border-t border-(--glass-border) bg-(--glass-bg)"
        dir="rtl"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="שאל/י כאן..."
          disabled={isLoading}
          className="flex-1 bg-transparent text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none"
          dir="rtl"
          aria-label="שאלה לעוזר"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="p-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-black disabled:opacity-40 transition-all hover:scale-105 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
          aria-label="שלח"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npm run typecheck 2>&1 | grep "FAQChatBot" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/features/faq/FAQChatBot.tsx
git commit -m "feat(faq-chat): add FAQChatBot component (MiniSearch + streaming)"
```

---

## Task 5: Update FAQBubble to Use FAQChatBot

**Files:**
- Modify: `src/components/features/faq/FAQBubble.tsx`

The FAQBubble has three parts: (1) the panel shell with header + footer, (2) the content area (currently search + accordion), (3) the floating trigger button. We only replace the content area.

- [ ] **Step 1: Add FAQChatBot import to FAQBubble.tsx**

At the top of `src/components/features/faq/FAQBubble.tsx`, add:

```typescript
import { FAQChatBot } from "@/components/features/faq/FAQChatBot";
```

Remove the unused imports `Search`, `ChevronDown` since the accordion is gone. Keep `MessageCircle`, `X`, `Send` (Send is used in the footer feedback button).

The updated imports block:

```typescript
import { useId, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { FAQChatBot } from "@/components/features/faq/FAQChatBot";
```

- [ ] **Step 2: Remove accordion-related state and logic**

Remove these lines from FAQBubble (they are only used by the accordion, not needed with FAQChatBot):

```typescript
// REMOVE these:
import { useMemo, useState } from "react";   // replace with just useState
const [query, setQuery] = useState("");
const [activeCategory, setActiveCategory] = useState("הכל");
const [openIndex, setOpenIndex] = useState<number | null>(0);
const panelId = useId();
const headingId = useId();

const categories = useMemo(() => {
  const items = Array.from(new Set(FAQ_ITEMS.map((item) => item.category)));
  return ["הכל", ...items];
}, []);

const filtered = useMemo(() => {
  ...
}, [activeCategory, query]);
```

Also remove the `import { FAQ_ITEMS } from "@/lib/faq-data"` line (no longer needed in FAQBubble — FAQChatBot imports it instead).

The remaining state in FAQBubble:
```typescript
const [isOpen, setIsOpen] = useState(defaultOpen);
const panelId = useId();
const headingId = useId();
```

- [ ] **Step 3: Replace the content area with FAQChatBot**

Find this block in FAQBubble (the `{/* Content Area */}` div):

```tsx
{/* Content Area */}
<div className="flex-1 overflow-hidden flex flex-col">
  {/* Search & Categories */}
  <div className="p-6 pb-2 space-y-5">
    ...
  </div>

  {/* Questions List */}
  <div className="px-6 pb-4 space-y-3 overflow-y-auto min-h-0 flex-1 ...">
    ...
  </div>
</div>
```

Replace the entire `{/* Content Area */}` block with:

```tsx
{/* Content Area */}
<FAQChatBot />
```

- [ ] **Step 4: Update the header h3 text**

Change the panel header `h3` text from "שאלות נפוצות" to "עוזר חכם":

```tsx
<h3
  id={headingId}
  className="text-lg md:text-xl text-(--text-primary) font-serif font-medium tracking-wide"
>
  עוזר חכם
</h3>
```

- [ ] **Step 5: Verify the full updated FAQBubble.tsx looks correct**

The file should now have:
- No `FAQ_ITEMS` import
- No `useMemo` import
- No `query`, `activeCategory`, `openIndex` state
- No accordion JSX
- `<FAQChatBot />` in the content area
- Header, footer (feedback button), and trigger button unchanged

Run typecheck:

```bash
npm run typecheck 2>&1 | grep "FAQBubble\|faq" | head -10
```

Expected: no errors.

- [ ] **Step 6: Test in browser**

Start dev server if not running:
```bash
npm run dev
```

Open http://localhost:3000, click the chat bubble in the bottom right. Verify:
1. Panel opens with "מרכז עזרה / עוזר חכם" header
2. Welcome message "שלום! אני כאן לעזור..." appears
3. Type a question like "מה זה Peroot?" — answer streams in Hebrew
4. Source chips appear below the answer
5. Type an unrelated question like "מה מזג האוויר?" — fallback message appears
6. Feedback button in footer still works
7. Trigger button, panel position, z-index, animation unchanged

- [ ] **Step 7: Commit**

```bash
git add src/components/features/faq/FAQBubble.tsx
git commit -m "feat(faq-chat): replace FAQ accordion with AI chatbot in FAQBubble"
```

---

## Task 6: Add GEMINI_FAQ_API_KEY to Vercel

**Note:** This task is manual — it requires access to the Vercel dashboard.

- [ ] **Step 1: Verify key is in .env.local**

```bash
grep "GEMINI_FAQ_API_KEY" .env.local
```

Expected: a line with your free-tier Gemini API key.

- [ ] **Step 2: Add to Vercel**

Go to Vercel dashboard → Project `web` → Settings → Environment Variables. Add:
- Key: `GEMINI_FAQ_API_KEY`
- Value: the key from .env.local
- Environments: Production, Preview, Development (all three)

- [ ] **Step 3: Redeploy**

```bash
git push origin main
```

Vercel will auto-deploy. After deploy, test the chatbot on production.

- [ ] **Step 4: Smoke test on production**

Open https://www.peroot.space, click the chat bubble, ask "מה זה Peroot?" — verify a Hebrew answer streams correctly.

---

## Self-Review

**Spec coverage:**
- ✅ MiniSearch client-side retrieval
- ✅ Score threshold 0.3 gates LLM call
- ✅ `/api/faq-chat` POST with streaming
- ✅ `GEMINI_FAQ_API_KEY` → fallback to `GOOGLE_GENERATIVE_AI_API_KEY`
- ✅ Rate limit 10/min per IP
- ✅ FAQBubble shell (trigger, position, z-index) unchanged
- ✅ First 10 FAQ items in same order (SEO preserved — new items appended)
- ✅ FAQ expanded from 33 to ~74 items
- ✅ MiniSearch imported only in client component (FAQChatBot)
- ✅ `GEMINI_FAQ_API_KEY` only in server route, never client

**Type consistency:** `FAQItem` type is inline in FAQChatBot (same shape as `faq-data.ts`'s type). `Message` type is local to FAQChatBot. No shared types needed — both are small.

**No placeholders:** all steps have complete code.
