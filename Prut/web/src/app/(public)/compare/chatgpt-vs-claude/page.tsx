import type { Metadata } from "next";
import Link from "next/link";
import { Scale } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/schema";
import { PageHeading } from "@/components/ui/PageHeading";
import { CrossLinkCard } from "@/components/ui/CrossLinkCard";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";
const UPDATED = "2026-09-03";

export const metadata: Metadata = {
  title: "ChatGPT מול Claude בעברית: מה עדיף לכל משימה",
  description:
    "השוואה מעשית בעברית: כתיבה שיווקית, טקסטים ארוכים, קוד, ניתוח קבצים, מחיר, וחשוב מכל, איך לכתוב לכל אחד מהם פרומפט שמוציא את המיטב. עודכן ספטמבר 2026.",
  alternates: { canonical: "/compare/chatgpt-vs-claude" },
  openGraph: {
    title: "ChatGPT מול Claude בעברית: מה עדיף לכל משימה | Peroot",
    description: "השוואה מעשית לפי משימות, עם פרומפט לדוגמה לכל מודל.",
    url: "/compare/chatgpt-vs-claude",
    type: "article",
    locale: "he_IL",
  },
};

const ROWS = [
  {
    task: "כתיבה שיווקית קצרה (פוסט, מייל, מודעה)",
    chatgpt: "מהיר, מגוון, נוטה לסופרלטיבים ולאימוג'ים אם לא אוסרים",
    claude: 'עברית טבעית יותר, פחות "מכירתי", מחזיק טון לאורך זמן',
    verdict: "שניהם. הפרומפט קובע יותר מהמודל",
  },
  {
    task: "טקסט ארוך ומובנה (מאמר, מדריך, מסמך)",
    chatgpt: "טוב עם רשימות וכותרות, לפעמים חוזר על עצמו אחרי 800 מילה",
    claude: "שומר על רצף וקוהרנטיות, כותב עברית עניינית",
    verdict: "Claude",
  },
  {
    task: "ניתוח קבצים ארוכים (חוזה, דוח, תמלול)",
    chatgpt: "חלון הקשר סביר, נוטה לסכם במקום לצטט",
    claude: "חלון הקשר גדול, מצטט מהמקור כשמבקשים",
    verdict: "Claude",
  },
  {
    task: "קוד ותיקון באגים",
    chatgpt: "חזק, כלים מובנים להרצה, קהילה ענקית של דוגמאות",
    claude: "מדויק במיוחד בקוד ארוך ובריפקטור, מסביר החלטות",
    verdict: "תיקו, תלוי בכלי שסביבו",
  },
  {
    task: "תמונות",
    chatgpt: "GPT Image מובנה, יוצר ועורך תמונות בתוך השיחה",
    claude: "לא יוצר תמונות, כן מנתח אותן",
    verdict: "ChatGPT",
  },
  {
    task: "מחקר עם מקורות עדכניים",
    chatgpt: "גלישה מובנית, מצטט קישורים",
    claude: "חיפוש זמין בחלק מהתוכניות, זהיר יותר בטענות",
    verdict: "ChatGPT לחיפוש, Claude לסינתזה",
  },
  {
    task: "עברית: דקדוק, מגדר, משלב",
    chatgpt: "טוב, נוטה לעברית מתורגמת ולמקפים ארוכים",
    claude: "טוב מאוד, פחות שגיאות מגדר, מבין הוראות משלב",
    verdict: "Claude, בהפרש קטן",
  },
  {
    task: "מחיר לתוכנית פרטית",
    chatgpt: "חינם עם מגבלות, Plus בתשלום חודשי",
    claude: "חינם עם מגבלות, Pro בתשלום חודשי דומה",
    verdict: "זהה בפועל",
  },
];

const PROMPT_TIPS = [
  {
    model: "ChatGPT",
    tips: [
      'הוראות בתחילת הפרומפט, קצר ומספרי: "3 גרסאות, עד 80 מילים כל אחת".',
      "רשימות ממוספרות עובדות טוב; כותרות עם ## מארגנות את הפלט.",
      'אסרו במפורש: "בלי אימוג\'ים, בלי הקדמה, בלי מקפים ארוכים". אחרת תקבלו.',
      "לתוצאה יציבה, תנו דוגמה אחת של הפורמט שאתם רוצים.",
    ],
    example:
      "אתה קופירייטר לעסקים קטנים בישראל. כתוב 3 גרסאות של פוסט פייסבוק להשקת שירות ניקיון משרדים, עד 60 מילים כל אחת, טון חם וישיר, בלי אימוג'ים ובלי הבטחות מוגזמות. פורמט: כותרת, גוף, קריאה לפעולה.",
  },
  {
    model: "Claude",
    tips: [
      "הפרידו חלקים בתגיות: <context>, <task>, <format>. Claude קורא אותן היטב.",
      "תנו לו את המקור המלא ובקשו לצטט ממנו; הוא נמנע מלהמציא כשמבקשים.",
      'הגדירו תפקיד ומשלב: "עורך לשוני, עברית עניינית, גוף שני רבים".',
      "בקשו ממנו לשאול שאלת הבהרה אחת לפני שהוא כותב, במשימות מורכבות.",
    ],
    example:
      "<context>מצורף חוזה שכירות של 12 עמודים.</context>\n<task>סכם את חובות השוכר בעברית עניינית, 8 נקודות לכל היותר, וצטט את סעיף המקור ליד כל נקודה. אם סעיף לא ברור, כתוב זאת במקום לנחש.</task>\n<format>רשימה ממוספרת, בלי הקדמה.</format>",
  },
];

const FAQ = [
  {
    question: "מה עדיף לעברית, ChatGPT או Claude?",
    answer:
      "לטקסטים ארוכים ולעריכה לשונית, Claude כותב עברית טבעית יותר ועושה פחות שגיאות מגדר. לכתיבה קצרה ולתמונות ChatGPT מספיק, ולעיתים עדיף. בשני המקרים, פרומפט שמציין תפקיד, קהל, משלב ופורמט משנה את התוצאה יותר מהמעבר בין המודלים.",
  },
  {
    question: "אפשר לכתוב פרומפט אחד שעובד לשניהם?",
    answer:
      "כן, אם הוא מובנה: תפקיד, משימה, קהל, פורמט, הגבלות ודוגמה. פירוט בונה את הפרומפט הזה ומתאים אותו למודל היעד שבחרתם, כך שאותה בקשה יוצאת עם רשימות ל-ChatGPT ועם תגיות ל-Claude.",
  },
  {
    question: "מה עם Gemini?",
    answer:
      "Gemini חזק במיוחד בקבצים גדולים ובאינטגרציה עם Google Docs ו-Drive, ובעברית הוא ברמה של ChatGPT. אם אתם עובדים בסביבת Google, זה המועמד הטבעי.",
  },
  {
    question: "צריך לשלם כדי לקבל תוצאות טובות?",
    answer:
      "לא. רוב ההבדל בין תוצאה בינונית לטובה הוא הפרומפט, לא התוכנית. התוכניות בתשלום נותנות יותר שימוש, מודלים מהירים יותר וקבצים גדולים יותר.",
  },
];

export default function ChatgptVsClaudePage() {
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "ChatGPT מול Claude בעברית: מה עדיף לכל משימה",
    inLanguage: "he",
    datePublished: UPDATED,
    dateModified: UPDATED,
    author: { "@type": "Person", name: "Gal Sasson", url: `${SITE_URL}/about` },
    publisher: { "@type": "Organization", name: "Peroot", url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}/compare/chatgpt-vs-claude`,
  };
  return (
    <>
      <JsonLd data={article} />
      <JsonLd data={faqSchema(FAQ)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "דף הבית", url: "/" },
          { name: "השוואות", url: "/compare/chatgpt-vs-claude" },
          { name: "ChatGPT מול Claude", url: "/compare/chatgpt-vs-claude" },
        ])}
      />
      <article className="min-h-screen bg-background text-foreground" dir="rtl">
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-14 space-y-12">
          <nav
            aria-label="breadcrumb"
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <Link href="/" className="hover:text-foreground transition-colors">
              דף הבית
            </Link>
            <span>/</span>
            <span className="text-secondary-foreground">ChatGPT מול Claude</span>
          </nav>

          <header className="space-y-4">
            <PageHeading
              title="ChatGPT מול Claude"
              highlight="בעברית"
              subtitle="לא מי יותר חכם, אלא מה עדיף למשימה שלכם, ואיך לכתוב לכל אחד מהם פרומפט שמוציא את המיטב. נבדק על עבודה יומיומית בעברית: שיווק, מסמכים, קוד, תמונות."
              badge="השוואה"
              badgeIcon={<Scale className="w-4 h-4" />}
              size="large"
              align="start"
            />
            <p className="text-xs text-muted-foreground">
              נכתב על ידי גל ששון, מייסד Peroot. עודכן ב-3 בספטמבר 2026. המודלים משתנים כל כמה
              שבועות; ההמלצות כאן מבוססות על ניסוי בעברית, לא על דפי שיווק.
            </p>
          </header>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">השורה התחתונה</h2>
            <p className="text-(--text-secondary) leading-relaxed">
              אם אתם כותבים בעברית טקסטים ארוכים, עורכים מסמכים או מנתחים קבצים, Claude נותן היום
              עברית טבעית יותר ומצטט מהמקור כשמבקשים. אם אתם צריכים תמונות, גלישה או פוסטים קצרים
              בקצב, ChatGPT מספיק ולעיתים עדיף. ובכל מקרה, פרומפט עם תפקיד, קהל, פורמט והגבלות משנה
              את התוצאה הרבה יותר מהמעבר בין השניים. זה בדיוק מה שפירוט בונה בשבילכם, ומתאים למודל
              שבחרתם.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">לפי משימה</h2>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-xs text-muted-foreground">
                  <tr>
                    <th className="text-start p-3 font-medium">משימה</th>
                    <th className="text-start p-3 font-medium">ChatGPT</th>
                    <th className="text-start p-3 font-medium">Claude</th>
                    <th className="text-start p-3 font-medium">מה עדיף</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ROWS.map((r) => (
                    <tr key={r.task} className="align-top">
                      <td className="p-3 font-semibold text-foreground">{r.task}</td>
                      <td className="p-3 text-(--text-secondary)">{r.chatgpt}</td>
                      <td className="p-3 text-(--text-secondary)">{r.claude}</td>
                      <td className="p-3 font-medium text-amber-700 dark:text-amber-300">
                        {r.verdict}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">איך כותבים לכל אחד מהם</h2>
            {PROMPT_TIPS.map((p) => (
              <div
                key={p.model}
                className="rounded-2xl border border-border bg-(--glass-bg) p-5 space-y-3"
              >
                <h3 className="text-lg font-bold text-foreground">{p.model}</h3>
                <ul className="list-disc ps-5 space-y-1.5 text-(--text-secondary)">
                  {p.tips.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">פרומפט לדוגמה:</p>
                <pre className="whitespace-pre-wrap text-sm leading-relaxed rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-foreground font-sans">
                  {p.example}
                </pre>
              </div>
            ))}
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">מה שאף השוואה לא אומרת</h2>
            <p className="text-(--text-secondary) leading-relaxed">
              שני המודלים מתעדכנים כל כמה שבועות, ומה שהיה נכון בקיץ לא בהכרח נכון בחורף. מה שלא
              משתנה: מודל לא יודע מה אתם רוצים אם לא כתבתם. עשרה ניסויים שלנו על אותן משימות הראו
              שפרומפט מובנה שיפר את התוצאה בשני המודלים יותר מהמעבר מהמודל החלש לחזק. לכן ההשקעה
              הנכונה היא בפרומפט. כותבים משפט אחד בפירוט, בוחרים את המודל, ומקבלים את הגרסה שמתאימה
              לו.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">שאלות נפוצות</h2>
            <div className="divide-y divide-border border-y border-border">
              {FAQ.map((f) => (
                <details key={f.question} className="group py-4">
                  <summary className="cursor-pointer font-semibold text-foreground list-none flex items-center justify-between gap-4">
                    {f.question}
                    <span className="text-muted-foreground group-open:rotate-45 transition-transform motion-reduce:transition-none">
                      +
                    </span>
                  </summary>
                  <p className="text-(--text-secondary) mt-3 leading-relaxed">{f.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            <CrossLinkCard
              href="/?utm_source=compare"
              title="לבנות פרומפט ל-Claude"
              description="פירוט כותב אותו עם תגיות ומשלב מדויק."
            />
            <CrossLinkCard
              href="/?utm_source=compare"
              title="לבנות פרומפט ל-ChatGPT"
              description="רשימות, כותרות והגבלות, מוכן להדבקה."
            />
            <CrossLinkCard
              href="/glossary"
              title="מילון מונחי AI בעברית"
              description="טוקן, הקשר, הזיה, RAG: 40 מונחים בעברית פשוטה."
            />
          </section>
        </div>
      </article>
    </>
  );
}
