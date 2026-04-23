import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, XCircle, Sparkles, Target, Layers, Brain } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, faqSchema, howToSchema } from "@/lib/schema";
import { CrossLinkCard } from "@/components/ui/CrossLinkCard";
import { PageHeading } from "@/components/ui/PageHeading";
import { PROMPT_LIBRARY_COUNT } from "@/lib/constants";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";
const og = `${SITE}/api/og?title=${encodeURIComponent("הנדסת פרומפטים — המדריך המלא בעברית")}&subtitle=${encodeURIComponent("טכניקות מתקדמות, דוגמאות מעשיות וצ'קליסט מקצועי")}&category=${encodeURIComponent("מדריך pillar")}`;

export const metadata: Metadata = {
  title: "הנדסת פרומפטים — המדריך המלא בעברית 2026 | Peroot",
  description:
    "הנדסת פרומפטים (Prompt Engineering) בעברית — 3 טכניקות, 12 דוגמאות לפני/אחרי, צ'קליסט מקצועי וטבלת השוואה למודלי AI. המדריך המעמיק ביותר בישראל.",
  alternates: { canonical: "/guide/prompt-engineering" },
  keywords: [
    "הנדסת פרומפטים",
    "prompt engineering",
    "כתיבת פרומפטים",
    "פרומפט מקצועי",
    "ChatGPT פרומפטים",
    "Claude פרומפטים",
    "AI בעברית",
    "מחולל פרומפטים",
  ],
  openGraph: {
    title: "הנדסת פרומפטים — המדריך המלא בעברית",
    description:
      "כל מה שצריך לדעת על prompt engineering: טכניקות, דוגמאות, צ'קליסט, והשוואה בין מודלים.",
    url: `${SITE}/guide/prompt-engineering`,
    siteName: "Peroot",
    locale: "he_IL",
    type: "article",
    images: [
      {
        url: og,
        width: 1200,
        height: 630,
        alt: "הנדסת פרומפטים — המדריך המלא בעברית",
      },
    ],
  },
};

const FAQ = [
  {
    question: "מה זה הנדסת פרומפטים (Prompt Engineering)?",
    answer:
      'הנדסת פרומפטים היא הדיסציפלינה של ניסוח הוראות מדויקות למודלי בינה מלאכותית כדי לקבל תוצאות איכותיות, עקביות וחוזרות. המטרה היא להפוך כוונה מעורפלת ("כתוב לי משהו על שיווק") להוראה מובנית עם הקשר, תפקיד, פורמט ומגבלות ברורות.',
  },
  {
    question: "איך לומדים הנדסת פרומפטים?",
    answer:
      "שילוב של תיאוריה ותרגול: להבין את 6 הרכיבים של פרומפט מקצועי (תפקיד, משימה, הקשר, פורמט, דוגמאות, מגבלות), לתרגל על בעיות אמיתיות, ולהשוות תוצאות בין ניסוחים. אפשר להיעזר במחולל כמו Peroot שמלמד את המבנה תוך כדי שימוש.",
  },
  {
    question: "מה ההבדל בין פרומפט לפרומפט מהונדס?",
    answer:
      "פרומפט רגיל: 'כתוב לי מייל שיווקי'. פרומפט מהונדס: 'אתה copywriter עם 10 שנות ניסיון ב-B2B SaaS. כתוב מייל שיווקי בעברית ל-CTOs בחברות 50-200 עובדים, מציג כלי ניטור. 120 מילים, מוביל ל-CTA אחד, נימה מקצועית-חברית, כולל 2 stats מ-2025.' ההבדל מורגש מיד בתוצאה.",
  },
  {
    question: "האם טכניקות הנדסת פרומפטים עובדות בעברית?",
    answer:
      "כן — ואפילו יותר חשוב. מודלים חזקים פחות בעברית מאשר באנגלית, ולכן פרומפט מובנה ומדויק מפצה על חולשות הבנה. Peroot בנוי במיוחד לעברית עם RTL מלא, שאלות הבהרה בעברית ודירוג איכות רגיש להקשר תרבותי.",
  },
  {
    question: "מה הטכניקות המתקדמות ביותר?",
    answer:
      "Chain-of-thought (חשיבה בשלבים), few-shot (דוגמאות מוטמעות), role-playing (הגדרת תפקיד), output templating (פורמט מוגדר מראש), self-consistency (אימות צולב), ו-ReAct (תכנון + פעולה). כולן מכוסות במדריך עם דוגמאות בעברית.",
  },
  {
    question: "כמה זמן לוקח לכתוב פרומפט מקצועי?",
    answer:
      "ידנית: 10-30 דקות לפרומפט מורכב. עם Peroot: 30 שניות — מזינים טיוטה והמערכת מוסיפה מבנה, הקשר חסר ושאלות הבהרה. לאחר שלומדים את הדפוסים, גם כתיבה ידנית מהירה יותר.",
  },
  {
    question: "האם אותו פרומפט עובד בכל המודלים?",
    answer:
      "עקרונות זהים, אבל יש ניואנסים. Claude מגיב טוב יותר לפורמט XML ולהוראות ארוכות. ChatGPT מעדיף Markdown ודוגמאות. Gemini טוב ב-multi-modal. Peroot מציע אופטימיזציה אוטומטית לפי המודל הנבחר.",
  },
  {
    question: "מתי פרומפט הופך יקר מדי?",
    answer:
      "פרומפט ארוך = יותר tokens = יותר כסף וזמן. כלל אצבע: אם הפרומפט ארוך מ-2000 מילים והתשובה לא השתפרה משמעותית מול גרסה של 500 מילים — יש התייעלות אפשרית. Peroot מציג אומדן tokens בזמן אמת.",
  },
];

const STEPS = [
  {
    name: "הגדירו תפקיד",
    text: "פתחו בהגדרת מיהו ה-AI: 'אתה עורך דין דיני עבודה עם 15 שנות ניסיון בישראל'. זה מעגן את הטון, המונחים והזווית של התשובה.",
  },
  {
    name: "נסחו את המשימה בבירור",
    text: "פועל בהתחלה, אובייקט ספציפי, תוצאה מדודה. לא 'תעזור עם שיווק', אלא 'נסח 3 כותרות למודעת Facebook למוצר X לקהל Y'.",
  },
  {
    name: "הוסיפו הקשר רלוונטי",
    text: "קהל יעד, תחום, מגבלות, כלי. ככל שהמודל יודע יותר על הסיטואציה, התשובה תהיה מותאמת יותר.",
  },
  {
    name: "הגדירו פורמט פלט",
    text: "טבלה? JSON? רשימה ממוספרת? מספר מילים? זה מונע פלט פתוח שצריך לסרוק ידנית.",
  },
  {
    name: "תנו 1-3 דוגמאות (few-shot)",
    text: "דוגמה של קלט→פלט רצוי הכי אפקטיבית מכל הסברי נוסח. המודל לומד מהדוגמה את הסגנון הרצוי.",
  },
  {
    name: "הוסיפו מגבלות",
    text: "'אל תכלול X', 'הימנע מ-Y', 'לא להמציא נתונים שאינך יודע'. זה חוסם את הטעויות הנפוצות.",
  },
  {
    name: "איטרציה ודיוק",
    text: "אף פרומפט לא מושלם בגרסה ראשונה. בדקו את הפלט, זהו מה חסר/עודף, ושפרו את הפרומפט עצמו (לא רק את התגובה).",
  },
];

const SITE_URL = SITE;

export default function PromptEngineeringGuidePage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "בית", url: "/" },
          { name: "מדריך", url: "/guide" },
          { name: "הנדסת פרומפטים", url: "/guide/prompt-engineering" },
        ])}
      />
      <JsonLd data={faqSchema(FAQ)} />
      <JsonLd
        data={howToSchema({
          name: "איך לכתוב פרומפט מקצועי — 7 שלבים",
          description: "מתודולוגיה מוכחת להנדסת פרומפטים באיכות production.",
          steps: STEPS,
          totalTime: "PT10M",
        })}
      />

      <article
        dir="rtl"
        className="max-w-4xl mx-auto px-4 py-10 md:py-16 text-right leading-relaxed"
      >
        <PageHeading
          title="הנדסת פרומפטים"
          highlight="המדריך המלא בעברית"
          subtitle="כל מה שצריך לדעת על Prompt Engineering: טכניקות, דוגמאות, צ'קליסט והבדלים בין מודלים"
          align="start"
        />

        <p className="text-lg text-muted-foreground mb-6">
          הנדסת פרומפטים (Prompt Engineering) היא המיומנות החשובה ביותר בעידן ה-AI. בין אם אתם
          כותבים תוכן, מפתחים מוצרים, או סתם רוצים תשובות טובות יותר מ-ChatGPT — השליטה בכתיבת
          פרומפטים משפיעה ישירות על איכות התוצאה. המדריך הזה מכסה את כל מה שצריך לדעת, בעברית, עם
          דוגמאות מעשיות.
        </p>

        <div className="flex flex-wrap gap-3 mb-10">
          <Link
            href="/#enhance"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-amber-500 to-yellow-500 text-black font-bold hover:scale-[1.02] transition-transform"
          >
            <Sparkles size={16} /> נסו את המחולל חינם
          </Link>
          <Link
            href="/prompts"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border hover:bg-secondary transition-colors"
          >
            ספריית {PROMPT_LIBRARY_COUNT}+ תבניות
          </Link>
        </div>

        <nav className="mb-12 p-4 rounded-xl border border-border bg-card/50">
          <h2 className="text-sm font-bold mb-3 text-muted-foreground">תוכן עניינים</h2>
          <ol className="space-y-1.5 text-sm list-decimal list-inside">
            <li>
              <a href="#what-is" className="hover:underline">
                מה זה הנדסת פרומפטים?
              </a>
            </li>
            <li>
              <a href="#why" className="hover:underline">
                למה זה חשוב?
              </a>
            </li>
            <li>
              <a href="#anatomy" className="hover:underline">
                6 הרכיבים של פרומפט מקצועי
              </a>
            </li>
            <li>
              <a href="#techniques" className="hover:underline">
                7 טכניקות מתקדמות
              </a>
            </li>
            <li>
              <a href="#examples" className="hover:underline">
                12 דוגמאות לפני/אחרי
              </a>
            </li>
            <li>
              <a href="#by-model" className="hover:underline">
                הבדלים בין המודלים
              </a>
            </li>
            <li>
              <a href="#mistakes" className="hover:underline">
                8 טעויות נפוצות
              </a>
            </li>
            <li>
              <a href="#checklist" className="hover:underline">
                צ'קליסט של 15 פריטים
              </a>
            </li>
            <li>
              <a href="#faq" className="hover:underline">
                שאלות נפוצות
              </a>
            </li>
          </ol>
        </nav>

        <section id="what-is" className="mb-12">
          <h2 className="text-2xl md:text-3xl font-serif font-bold mb-4">מה זה הנדסת פרומפטים?</h2>
          <p className="mb-4">
            <strong>הנדסת פרומפטים</strong> היא הדיסציפלינה של ניסוח הוראות מדויקות למודלי שפה
            גדולים (LLMs) — כמו ChatGPT, Claude, Gemini ו-Llama — במטרה לייצר תוצאות איכותיות,
            עקביות ומדידות. בניגוד לאינטואיציה הראשונית, לא מדובר ב"לדבר יפה" עם ה-AI: זה תהליך
            מובנה שמשלב הבנה של איך מודלים חושבים, ידע בתחום המקצועי, וחשיבה מערכתית על פלט צפוי.
          </p>
          <p className="mb-4">
            המונח נטבע ב-2020 סביב GPT-3, אבל הפך לתחום מקצועי מלא רק עם ChatGPT ב-2022. היום יש
            משרות ייעודיות של Prompt Engineer בחברות כמו Anthropic, OpenAI ו-Google, עם משכורות
            ממוצעות של 150-300 אלף דולר בשנה. אבל המיומנות רלוונטית לכל מי שעובד עם AI — לא רק
            למפתחים.
          </p>
          <p>
            הנדסת פרומפטים עוסקת בשלושה רבדים: <strong>ניסוח</strong> (הוראה ברורה),{" "}
            <strong>הקשר</strong> (מידע רלוונטי) ו-<strong>פורמט</strong> (מבנה הפלט). שליטה בשלושתם
            מביאה לתוצאות שונות לחלוטין מפרומפט "גולמי".
          </p>
        </section>

        <section id="why" className="mb-12">
          <h2 className="text-2xl md:text-3xl font-serif font-bold mb-4">למה זה חשוב?</h2>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div className="p-5 rounded-xl border border-border bg-card">
              <Target className="text-amber-500 mb-2" size={22} />
              <h3 className="font-bold mb-2">דיוק</h3>
              <p className="text-sm text-muted-foreground">
                פרומפט מקצועי חוסך 3-5 איטרציות ומייצר תשובה שימושית בניסיון הראשון.
              </p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <Layers className="text-amber-500 mb-2" size={22} />
              <h3 className="font-bold mb-2">עקביות</h3>
              <p className="text-sm text-muted-foreground">
                פורמט מוגדר מבטיח שאותו פרומפט יפיק פלט דומה גם שבוע הבא, גם בצוות אחר.
              </p>
            </div>
            <div className="p-5 rounded-xl border border-border bg-card">
              <Brain className="text-amber-500 mb-2" size={22} />
              <h3 className="font-bold mb-2">מדידות</h3>
              <p className="text-sm text-muted-foreground">
                פרומפט מובנה ניתן לבדיקה: A/B, dataset של דוגמאות, regression tests.
              </p>
            </div>
          </div>
          <p>
            בגוף ארגוני, פרומפט גרוע עולה כסף אמיתי: יותר tokens, יותר שעות עבודה, יותר תיקונים.
            במחקר של Anthropic מ-2024, שיפור פרומפט העלה דיוק ב-37% בממוצע על משימות classification
            — ללא שינוי במודל.
          </p>
        </section>

        <section id="anatomy" className="mb-12">
          <h2 className="text-2xl md:text-3xl font-serif font-bold mb-4">
            6 הרכיבים של פרומפט מקצועי
          </h2>
          <p className="mb-4">
            כל פרומפט טוב בנוי מ-6 רכיבים מרכזיים. לא כולם חייבים להופיע תמיד, אבל היעדר של יותר
            מ-שניים כמעט תמיד מוביל לתוצאה פחותה.
          </p>
          <ol className="space-y-4">
            <li className="p-4 rounded-xl border border-border bg-card">
              <h3 className="font-bold mb-1">1. תפקיד (Role)</h3>
              <p className="text-sm">
                מיהו ה-AI? "אתה copywriter", "את מורה לפיזיקה", "אתה data analyst". זה מעצב את
                הסגנון והזווית.
              </p>
            </li>
            <li className="p-4 rounded-xl border border-border bg-card">
              <h3 className="font-bold mb-1">2. משימה (Task)</h3>
              <p className="text-sm">
                הפעולה המדויקת שאתם רוצים: "נסח", "סכם", "השווה", "תרגם". פועל בהתחלה, תוצאה ספציפית
                בסוף.
              </p>
            </li>
            <li className="p-4 rounded-xl border border-border bg-card">
              <h3 className="font-bold mb-1">3. הקשר (Context)</h3>
              <p className="text-sm">
                כל מה שחייב לדעת כדי לבצע את המשימה טוב: קהל, תחום, מגבלות, היסטוריה, נתונים.
              </p>
            </li>
            <li className="p-4 rounded-xl border border-border bg-card">
              <h3 className="font-bold mb-1">4. פורמט (Format)</h3>
              <p className="text-sm">
                איך הפלט צריך להיראות? JSON, טבלה, רשימה, פסקה אחת של 150 מילים? ציינו במפורש.
              </p>
            </li>
            <li className="p-4 rounded-xl border border-border bg-card">
              <h3 className="font-bold mb-1">5. דוגמאות (Few-shot)</h3>
              <p className="text-sm">
                1-3 זוגות של קלט→פלט רצוי. זו הטכניקה החזקה ביותר להעברת סגנון.
              </p>
            </li>
            <li className="p-4 rounded-xl border border-border bg-card">
              <h3 className="font-bold mb-1">6. מגבלות (Constraints)</h3>
              <p className="text-sm">
                "אל תמציא מספרים", "הימנע ממונחים טכניים", "אל תחרוג מ-300 מילים".
              </p>
            </li>
          </ol>
        </section>

        <section id="techniques" className="mb-12">
          <h2 className="text-2xl md:text-3xl font-serif font-bold mb-4">7 טכניקות מתקדמות</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold mb-2">1. Chain-of-Thought (חשיבה בשלבים)</h3>
              <p className="mb-2">
                הוספת "חשוב צעד אחרי צעד" או "פרט את הלוגיקה שלך לפני התשובה" משפרת משימות היגיון פי
                3. המודל "מחשיב בקול רם" ומגלה טעויות במהלך הדרך.
              </p>
              <pre className="p-3 rounded-lg bg-secondary/50 text-sm overflow-x-auto">
                <code>
                  חשב את ההנחה לעסקה: מחיר 12,400₪, הנחה של 8% לחבר מועדון, ועוד 3% לקונה מעל
                  10,000₪. פרט כל שלב לפני התשובה הסופית.
                </code>
              </pre>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-2">2. Few-Shot Learning</h3>
              <p className="mb-2">
                2-3 דוגמאות מוטמעות בפרומפט מלמדות את המודל את הסגנון המדויק שאתם רוצים. טוב יותר
                מכל תיאור מילולי.
              </p>
              <pre className="p-3 rounded-lg bg-secondary/50 text-sm overflow-x-auto whitespace-pre-wrap">
                <code>{`סווג ביקורות:
"המוצר מעולה, הגיע בזמן" → חיובי
"לא פגע באיכות, אבל יקר" → נייטרלי
"נפתח שבור, שירות לקוחות לא ענה" → שלילי
"מעל הציפיות!" →`}</code>
              </pre>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-2">3. Role Prompting</h3>
              <p>
                הגדרת תפקיד מקצועי ("אתה רופא ילדים עם 20 שנות ניסיון") מגייסת את הידע התחומי
                הרלוונטי ומסננת טרמינולוגיה לא מתאימה.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-2">4. Output Templating</h3>
              <p>
                מסגרת מוגדרת של שדות — JSON, YAML או פורמט משלכם — מאפשרת parsing אוטומטי ויצירת
                workflows. הכרחי לכל שימוש production.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-2">5. Self-Consistency</h3>
              <p>
                יצירת N תשובות עצמאיות ובחירת הנפוצה ביותר. עולה פי N בעלות אבל מעלה דיוק במשימות
                מתמטיות ולוגיות משמעותית.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-2">6. ReAct (Reasoning + Action)</h3>
              <p>
                הנחיית המודל לפצל לפעולות: Thought → Action → Observation → Thought. בסיס לכל agent
                modern. דורש tool calling.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-2">7. Prompt Chaining</h3>
              <p>
                פיצול משימה מורכבת ל-3-5 פרומפטים מדורגים במקום אחד גדול. כל שלב מתמקצע במשהו אחד.
                Peroot תומך בזה ב-{" "}
                <Link href="/chains" className="text-amber-600 dark:text-amber-400 hover:underline">
                  תכונת Chains
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        <section id="examples" className="mb-12">
          <h2 className="text-2xl md:text-3xl font-serif font-bold mb-4">דוגמאות לפני/אחרי</h2>
          <div className="space-y-6">
            {[
              {
                topic: "שיווק",
                before: "תכתוב לי פוסט שיווקי למוצר חדש",
                after:
                  "אתה copywriter ב-B2B SaaS. כתוב פוסט LinkedIn בן 120 מילים על הכלי שלנו לניתוח לוגים (מוצר: Peroot Log AI). קהל: CTOs בחברות 50-500 עובדים. טון: מקצועי-חברי, hook חזק בשורה הראשונה, 3 bullet points של benefits, CTA לניסיון חינם. הוסף hashtag אחד.",
              },
              {
                topic: "קוד",
                before: "תבדוק את הקוד הזה",
                after:
                  "אתה Senior React reviewer. נתח את ה-component הזה על: 1) bugs פוטנציאליים, 2) re-render לא נחוץ, 3) accessibility, 4) type safety. החזר JSON עם severity (high/med/low), location (line), issue, fix. אל תעיר על סגנון — רק על נכונות.",
              },
              {
                topic: "יצירה",
                before: "תכתוב סיפור על דרקון",
                after:
                  "כתוב סיפור קצר בעברית (250-300 מילים) בסגנון נעם גל. דמות ראשית: ילדה בת 10 שמגלה דרקון בעליית הגג. נימה: נוסטלגית-קסומה, ללא סוף טוב מובהק. פסקה ראשונה חייבת לכלול תיאור חושי (ריח/צליל). אל תשתמש במילים: 'פתאום', 'במפתיע'.",
              },
            ].map((ex) => (
              <div key={ex.topic} className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5">
                  <div className="flex items-center gap-2 mb-2 text-red-500 font-bold text-sm">
                    <XCircle size={16} /> לפני — {ex.topic}
                  </div>
                  <p className="text-sm">{ex.before}</p>
                </div>
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                  <div className="flex items-center gap-2 mb-2 text-emerald-500 font-bold text-sm">
                    <CheckCircle size={16} /> אחרי — {ex.topic}
                  </div>
                  <p className="text-sm">{ex.after}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            רוצים עוד 9 דוגמאות? ב-
            <Link href="/prompts" className="text-amber-600 dark:text-amber-400 hover:underline">
              ספריית הפרומפטים של Peroot
            </Link>{" "}
            יש {PROMPT_LIBRARY_COUNT}+ תבניות מוכנות ב-30+ קטגוריות, כולן בנויות לפי העקרונות של
            מדריך זה.
          </p>
        </section>

        <section id="by-model" className="mb-12">
          <h2 className="text-2xl md:text-3xl font-serif font-bold mb-4">הבדלים בין המודלים</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-border rounded-xl overflow-hidden">
              <thead className="bg-secondary">
                <tr>
                  <th className="p-3 text-right">מודל</th>
                  <th className="p-3 text-right">חוזק מרכזי</th>
                  <th className="p-3 text-right">פורמט מועדף</th>
                  <th className="p-3 text-right">דגש בפרומפט</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="p-3 font-bold">ChatGPT (GPT-4.5/5)</td>
                  <td className="p-3">יצירתיות, dialogue</td>
                  <td className="p-3">Markdown</td>
                  <td className="p-3">דוגמאות חזקות</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="p-3 font-bold">Claude (Opus/Sonnet)</td>
                  <td className="p-3">ניתוח ארוך, קוד</td>
                  <td className="p-3">XML tags</td>
                  <td className="p-3">הוראות ברורות</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="p-3 font-bold">Gemini (2.5)</td>
                  <td className="p-3">Multimodal, מהירות</td>
                  <td className="p-3">JSON</td>
                  <td className="p-3">schemas מוגדרים</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="p-3 font-bold">Llama / Mistral</td>
                  <td className="p-3">Open source, מחיר</td>
                  <td className="p-3">Chat template</td>
                  <td className="p-3">סיסטם prompt חד</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4">
            השוואה מעמיקה בין המודלים?{" "}
            <Link
              href="/blog/chatgpt-vs-claude-vs-gemini-comparison"
              className="text-amber-600 dark:text-amber-400 hover:underline"
            >
              קראו את ההשוואה המלאה
            </Link>
            .
          </p>
        </section>

        <section id="mistakes" className="mb-12">
          <h2 className="text-2xl md:text-3xl font-serif font-bold mb-4">8 טעויות נפוצות</h2>
          <ul className="space-y-3">
            {[
              "הנחיה עמומה ('תעזור עם שיווק') — תמיד תוצאה גנרית.",
              "יותר מדי משימות בפרומפט אחד — קשה למודל לפצל ולעיתים מתעלם מחצי.",
              "ללא הקשר עסקי — המודל לא יודע אם קהל שלכם 'מנכלי הייטק' או 'הורים צעירים'.",
              "פורמט פלט פתוח — מקבלים פסקה כשרציתם JSON.",
              "ללא דוגמאות — הסגנון שהמודל מייצר רחוק ממה שדמיינתם.",
              "הוראות סותרות ('קצר אבל מפורט', 'מקצועי אבל כיף').",
              "ציפייה לידע שהמודל לא מחזיק (נתונים אחרי תאריך cutoff, מידע פנים-ארגוני).",
              "לא לבדוק שוב — פרומפט שעבד פעם אחת לא בהכרח יעבוד ב-edge cases.",
            ].map((m, i) => (
              <li key={i} className="flex gap-3">
                <XCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </section>

        <section id="checklist" className="mb-12">
          <h2 className="text-2xl md:text-3xl font-serif font-bold mb-4">
            צ'קליסט של 15 פריטים — לפני שליחת פרומפט
          </h2>
          <div className="p-5 rounded-xl border border-border bg-card">
            <ol className="space-y-2.5 list-decimal list-inside">
              {[
                "תפקיד מוגדר (מיהו ה-AI?)",
                "משימה מנוסחת כפועל-אובייקט-תוצאה",
                "הקשר של הקהל / תחום / מטרה עסקית",
                "פורמט הפלט מוגדר במפורש",
                "לפחות דוגמה אחת אם המשימה סגנונית",
                "אורך תשובה מוגבל (מילים/טוקנים)",
                "שפה ו-locale מצוינים (עברית IL)",
                "רשימת 'אל תעשה' (constraints)",
                "כל ראשי תיבות / מונחים פנימיים מוסברים",
                "תאריך / גרסה אם רלוונטי ל-freshness",
                "מקור ידע אם משתמשים ב-RAG",
                "מיקום ציטוטים / מקורות אם נדרש",
                "חלופה אם המודל לא יודע (ולא להמציא)",
                "בדקתם על 2+ קלטים שונים",
                "שמרתם גרסה והבחנתם בהבדל לעומת הקודמת",
              ].map((item, i) => (
                <li key={i} className="marker:text-amber-500 marker:font-bold">
                  {item}
                </li>
              ))}
            </ol>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            אפשר לתת ל-Peroot לעשות את כל 15 הפריטים האלה אוטומטית —{" "}
            <Link href="/#enhance" className="text-amber-600 dark:text-amber-400 hover:underline">
              נסו עכשיו
            </Link>
            .
          </p>
        </section>

        <section id="faq" className="mb-12">
          <h2 className="text-2xl md:text-3xl font-serif font-bold mb-4">שאלות נפוצות</h2>
          <div className="space-y-3">
            {FAQ.map((item) => (
              <details key={item.question} className="border border-border rounded-lg p-4 group">
                <summary className="font-medium cursor-pointer">{item.question}</summary>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl md:text-3xl font-serif font-bold mb-4">המשיכו ללמוד</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <CrossLinkCard
              href="/guide"
              title="מדריך כתיבת פרומפטים"
              description="מדריך מבוא מעשי עם טכניקות יסוד ודוגמאות בעברית."
            />
            <CrossLinkCard
              href="/prompts"
              title={`${PROMPT_LIBRARY_COUNT}+ תבניות מוכנות`}
              description="ספרייה ענקית לפי קטגוריה, כולל משתנים חכמים."
            />
            <CrossLinkCard
              href="/blog/prompt-engineering-dictionary-glossary"
              title="מילון מושגים"
              description="כל המונחים של prompt engineering בעברית."
            />
            <CrossLinkCard
              href="/blog/chain-of-thought-prompting-guide"
              title="Chain-of-Thought — מדריך מלא"
              description="צלילה עמוקה לטכניקה שמעלה דיוק פי 3 במשימות היגיון."
            />
          </div>
        </section>

        <div className="p-6 rounded-2xl bg-linear-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/30 text-center">
          <h2 className="text-2xl font-serif font-bold mb-2">רוצים ליישם את זה על פרומפט אמיתי?</h2>
          <p className="text-muted-foreground mb-4">
            Peroot עושה את כל 6 הרכיבים + 15 פריטי הצ'קליסט אוטומטית. מזינים טיוטה, מקבלים פרומפט
            מקצועי עם דירוג איכות בזמן אמת.
          </p>
          <Link
            href="/#enhance"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-linear-to-r from-amber-500 to-yellow-500 text-black font-bold hover:scale-[1.03] transition-transform"
          >
            <Sparkles size={18} /> שדרגו פרומפט עכשיו — חינם
          </Link>
        </div>
      </article>
    </>
  );
}
