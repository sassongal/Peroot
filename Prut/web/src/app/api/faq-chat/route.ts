import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

type FAQContext = { question: string; answer: string; category: string };

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
  const limitResult = await checkRateLimit(ip, "faqChat");
  if (!limitResult.success) {
    return NextResponse.json({ error: "יותר מדי בקשות. נסה שוב בעוד דקה." }, { status: 429 });
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
  if (question.length > 2000) {
    return NextResponse.json({ error: "שאלה ארוכה מדי" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_FAQ_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "שגיאת תצורה" }, { status: 500 });
  }

  const contextItems: FAQContext[] = Array.isArray(context)
    ? (context as FAQContext[])
        .slice(0, 3)
        .filter((item) => typeof item?.question === "string" && typeof item?.answer === "string")
    : [];

  const contextText =
    contextItems.length > 0
      ? contextItems.map((item) => `שאלה: ${item.question}\nתשובה: ${item.answer}`).join("\n\n")
      : "אין מידע זמין.";

  const google = createGoogleGenerativeAI({ apiKey });

  const result = await streamText({
    model: google("gemini-2.5-flash-lite"),
    system: `אתה עוזר תמיכה של Peroot (פירוט) — פלטפורמה ישראלית לשיפור פרומפטים (הנחיות AI) בעברית, בכתובת peroot.space.

## מה זה Peroot?
Peroot היא מטא-שכבה — כלי שממיר רעיונות וטקסטים גולמיים לפרומפטים מקצועיים ומובנים, מותאמים לכל מודל AI. Peroot לא מחליף את ChatGPT, Claude או Gemini — הוא עוזר להשתמש בהם טוב יותר. בנוי מהיסוד לעברית (לא תרגום).

## מצבי עבודה (5 מנועים)
- **סטנדרטי** — שיפור פרומפטים רגילים לכל מודל שפה
- **מחקר** — פרומפטים עם ניתוח מעמיק, מקורות ונתונים עדכניים
- **תמונה** — פרומפטים לכלי יצירת תמונות AI (DALL-E, Midjourney, Stable Diffusion)
- **סוכן** — בניית פרומפטים מורכבים עם שלבים ותנאים לסוכני AI אוטונומיים
- **וידאו** (Beta) — פרומפטים לכלי וידאו AI (Sora, Runway, Kling)

## תכונות מרכזיות
- **מדד חוזק בזמן אמת** — ציון לפי 10 דימנשנים: בהירות מטרה, הגדרת תפקיד, הקשר, קהל יעד, פורמט פלט, מגבלות, דוגמאות, שלבים, מניעת הזיות, התאמה למודל
- **שאלות הבהרה** — עד 3 שאלות ממוקדות כשחסרים פרטים מהותיים
- **דלתות מהירות** — כפתורי שיפור מיידיים: "קצר יותר", "יותר פרקטי", "הוסף דוגמאות", "שנה טון"
- **Refine** — הוראה חופשית לחידוד ממוקד בלי לשבור את המבנה
- **משתנים** — {קהל יעד}, {מוצר}, {טון} — מסומנים בצבע, ניתן למלא בקליק
- **ייצוא PDF** — שמירת פרומפט כ-PDF עם ציון ומטא-נתונים

## ספריה אישית
- שמירת פרומפטים מוצלחים, ארגון בתיקיות ותגיות
- **תצוגת גרף** — ויזואליזציה של קשרים בין פרומפטים (אשכולות, קטגוריות)
- עיצוב: highlight בצבעים על חלקים בפרומפט
- שיתוף: קישור ייחודי לכל פרומפט (ציבורי/פרטי)
- סנכרון ענן בין מכשירים (למשתמשים מחוברים)

## היסטוריה
כל שדרוג נשמר עם הגרסה המקורית, המשודרגת ושאלות ההבהרה. ניתן לשחזר בלחיצה.

## שרשראות פרומפטים
רצף שלבים שהפלט מכל שלב עובר לשלב הבא. מתאים למשימות מורכבות. בונים ב"גרף" בניווט. ניתן לשמור ולהריץ בלחיצה.

## תוסף Chrome
- עובד ישירות בתוך ChatGPT (chatgpt.com), Claude (claude.ai), Gemini (gemini.google.com)
- מוסיף כפתור שדרוג לשדה הקלט ומחזיר פרומפט משודרג למקום
- מותקן דרך peroot.space/extension → Chrome Web Store
- מצריך חשבון Peroot (ניתן להירשם חינם עם Google)

## תבניות ציבוריות
מעל 480 תבניות מוכנות ב-30+ קטגוריות: שיווק, פיתוח תוכנה, חינוך, תוכן, מכירות, אי-קומרס, נדל"ן, בריאות, אסטרטגיה, SEO, סושיאל, פיננסים ועוד.

## תוכניות ומחיר
- **חינמי**: 2 שדרוגים ביום — מתחדש בדיוק ב-14:00 שעון ישראל. גישה לכל התכונות כולל ספריה, תוסף ותבניות.
- **Pro**: 150 שדרוגים בחודש, ₪49/חודש. תשלום דרך LemonSqueezy. ביטול בכל עת דרך /settings. החזר מלא ב-7 הימים הראשונים.
- משתמשי אורח: קבלת מספר שדרוגים ללא הרשמה (מאוחסנים בדפדפן בלבד).

## חשבון ואבטחה
- הרשמה: 30 שניות עם Google, בלי כרטיס אשראי
- נתונים: Supabase עם Row Level Security (RLS) — כל משתמש ניגש לנתונים שלו בלבד, הצפנת TLS
- מחיקת חשבון: בפנייה לגל@joya-tech.net — עד 7 ימי עסקים

## אינטגרציות ותאימות
- הפרומפטים עובדים עם כל מודל: ChatGPT (GPT-4, GPT-4o), Claude, Gemini, Mistral, Llama ואחרים
- API ציבורי בפיתוח — ניתן לפנות לגישה מוקדמת
- GitHub: github.com/sassongal/Peroot

## יצירת קשר
- עמוד יצירת קשר: peroot.space/contact
- מייל: gal@joya-tech.net

---

## הוראות תשובה
ענה **בעברית בלבד**, בסגנון ידידותי, **קצר וממוקד (2-4 משפטים)**.
**עדיפות**: אם ה-Context הספציפי שלהלן רלוונטי — השתמש בו. אחרת — הסתמך על הידע הכללי שלמעלה.
**אל תמציא** מידע שאינו מופיע כאן. אם לא יודע — הפנה ל-peroot.space/contact.

## Context ספציפי (תוצאות חיפוש):
${contextText}`,
    prompt: question.trim().slice(0, 500),
    maxOutputTokens: 400,
    temperature: 0.3,
  });

  return result.toTextStreamResponse();
}
