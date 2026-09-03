import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, faqSchema } from "@/lib/schema";
import { PageHeading } from "@/components/ui/PageHeading";
import { CrossLinkCard } from "@/components/ui/CrossLinkCard";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";

export const metadata: Metadata = {
  title: "מילון מונחי AI ופרומפטים בעברית",
  description:
    "פרומפט, טוקן, הקשר, הזיה, RAG, סוכן, טמפרטורה: 40 מונחים שכל מי שעובד עם ChatGPT, Claude ו-Gemini פוגש, מוסברים בעברית פשוטה עם דוגמה לכל אחד.",
  alternates: { canonical: "/glossary" },
  openGraph: {
    title: "מילון מונחי AI ופרומפטים בעברית | Peroot",
    description: "40 מונחים מעולם המודלים הגדולים, מוסברים בעברית עם דוגמאות.",
    url: "/glossary",
    type: "article",
    locale: "he_IL",
  },
};

interface Term {
  term: string;
  en: string;
  definition: string;
  example?: string;
  link?: { href: string; label: string };
}

interface Section {
  id: string;
  title: string;
  terms: Term[];
}

const SECTIONS: Section[] = [
  {
    id: "basics",
    title: "המושגים הבסיסיים",
    terms: [
      {
        term: "פרומפט",
        en: "Prompt",
        definition:
          "ההנחיה שנותנים למודל שפה. לא שאלה בלבד: תפקיד, משימה, קהל, פורמט והגבלות. ככל שהפרומפט מדויק יותר, כך התשובה קרובה יותר למה שבאמת רציתם.",
        example:
          '"כתוב פוסט" הוא בקשה. "אתה אסטרטג תוכן B2B, כתוב פוסט לינקדאין של 120 מילים למנהלי רכש, בטון ענייני, בלי אימוג\'ים" הוא פרומפט.',
        link: { href: "/guide", label: "המדריך לכתיבת פרומפטים" },
      },
      {
        term: "הנדסת פרומפטים",
        en: "Prompt engineering",
        definition:
          "הפרקטיקה של ניסוח, בדיקה ושיפור פרומפטים כדי לקבל תוצאות עקביות ממודלי שפה. בפועל: להפוך ניחוש למתכון שאפשר לחזור עליו.",
      },
      {
        term: "מודל שפה גדול",
        en: "LLM, Large Language Model",
        definition:
          "רשת נוירונים שאומנה על כמויות עצומות של טקסט ומשלימה טקסט על בסיס הסתברות. ChatGPT, Claude ו-Gemini הם ממשקים למודלים כאלה.",
      },
      {
        term: "טוקן",
        en: "Token",
        definition:
          'יחידת הטקסט שהמודל קורא וכותב. מילה באנגלית היא בערך טוקן אחד; בעברית מילה מתפצלת לעיתים לשניים או שלושה, ולכן טקסט עברי "עולה" יותר.',
        example: 'המשפט "שלום, מה שלומך?" הוא בערך 8 טוקנים.',
      },
      {
        term: "חלון הקשר",
        en: "Context window",
        definition:
          "כמות הטקסט שהמודל יכול להחזיק בראש בבת אחת: הפרומפט, הקבצים שצירפתם וההיסטוריה של השיחה. מה שיוצא מהחלון נשכח.",
      },
      {
        term: "הנחיית מערכת",
        en: "System prompt",
        definition:
          'הוראה קבועה שמגדירה מי המודל ואיך הוא מתנהג לאורך כל השיחה, לפני שהמשתמש כותב מילה. בפירוט, מצב "סוכן" בונה בדיוק את זה.',
        link: { href: "/features", label: "מצבי העבודה של פירוט" },
      },
      {
        term: "השלמה",
        en: "Completion, response",
        definition: "התשובה שהמודל מחזיר לפרומפט. המילה מזכירה שהמודל, בבסיסו, משלים טקסט.",
      },
    ],
  },
  {
    id: "quality",
    title: "איכות ובעיות",
    terms: [
      {
        term: "הזיה",
        en: "Hallucination",
        definition:
          'תשובה שנשמעת בטוחה ואינה נכונה: מקור שלא קיים, מספר מומצא, פסק דין שלא ניתן. פרומפט טוב מבקש מהמודל לומר "לא יודע" ולציין מקורות.',
        example: 'בקשו: "אם אינך בטוח, כתוב שאינך בטוח. אל תמציא מקורות."',
      },
      {
        term: "הטיה",
        en: "Bias",
        definition:
          "נטייה של המודל לכיוון מסוים בגלל נתוני האימון. בעברית זה מורגש במיוחד בתרגום מגדרי ובהנחות על תפקידים.",
      },
      {
        term: "הזרקת פרומפט",
        en: "Prompt injection",
        definition:
          "טקסט זדוני שמוסתר בתוך קובץ או דף ומנסה לשנות את ההוראות למודל. חשוב למי שמצרף קבצים או בונה סוכנים.",
      },
      {
        term: "טמפרטורה",
        en: "Temperature",
        definition:
          'פרמטר שקובע כמה המודל "מסתכן": נמוך נותן תשובות צפויות ועקביות, גבוה נותן מגוון ויצירתיות. בממשקי הצ\'אט לרוב אין גישה אליו, ב-API יש.',
      },
      {
        term: "ציון איכות לפרומפט",
        en: "Prompt score",
        definition:
          "מדד שמעריך פרומפט לפני שליחתו: האם יש תפקיד, משימה, קהל, פורמט, הגבלות ודוגמה. פירוט מציג ציון חי בזמן הכתיבה ומדרג את התוצאה בעשרה ממדים.",
        link: { href: "/", label: "לבדוק פרומפט עכשיו" },
      },
    ],
  },
  {
    id: "techniques",
    title: "טכניקות",
    terms: [
      {
        term: "פרומפט עם דוגמאות",
        en: "Few-shot prompting",
        definition:
          "נותנים למודל שתיים או שלוש דוגמאות של קלט ופלט רצוי לפני המשימה האמיתית. הדרך הבטוחה ביותר לקבל פורמט וטון עקביים.",
      },
      {
        term: "פרומפט ללא דוגמאות",
        en: "Zero-shot prompting",
        definition:
          "משימה בלי דוגמאות, רק הוראה. עובד למשימות פשוטות; לפורמט מדויק עדיף להוסיף דוגמה.",
      },
      {
        term: "שרשרת חשיבה",
        en: "Chain of thought",
        definition:
          'לבקש מהמודל לפרט את שלבי החשיבה לפני התשובה. משפר דיוק במשימות חישוב, ניתוח והשוואה. מצב "מחקר מעמיק" בפירוט משתמש בזה.',
      },
      {
        term: "הגדרת תפקיד",
        en: "Role prompting",
        definition:
          'לפתוח ב"אתה X": עורך דין מסחרי, מורה לכיתה ד, מנהל מוצר. מכוון את אוצר המילים, העומק וההנחות של התשובה.',
      },
      {
        term: "שאלות הבהרה",
        en: "Clarifying questions",
        definition:
          "לבקש מהמודל לשאול לפני שהוא עונה. פירוט הופך את זה לאוטומטי: אחרי כל שדרוג עד שלוש שאלות דיוק, והתשובה מעדכנת את הפרומפט.",
      },
      {
        term: "שיפור איטרטיבי",
        en: "Iterative refinement",
        definition:
          "לא לנסח פעם אחת ולהתפלל. מריצים, קוראים, מדייקים, מריצים שוב. הפרומפט השלישי כמעט תמיד טוב מהראשון.",
      },
      {
        term: "פרומפט שלילי",
        en: "Negative prompt",
        definition:
          'מה לא לעשות. במחוללי תמונות זה שדה נפרד (בלי טקסט, בלי ידיים מעוותות); במודלי שפה זו שורה של "אל": בלי אימוג\'ים, בלי הקדמות, בלי מקפים ארוכים.',
      },
      {
        term: "משתנים בפרומפט",
        en: "Prompt variables, templates",
        definition:
          "מקומות ריקים בפרומפט, כמו {קהל_יעד} או {מוצר}, שממלאים בכל שימוש. כך פרומפט אחד משרת עשרות מקרים. ספריית התבניות של פירוט בנויה על זה.",
        link: { href: "/templates", label: "תבניות עם משתנים" },
      },
      {
        term: "שרשרת פרומפטים",
        en: "Prompt chain",
        definition:
          "כמה פרומפטים ברצף, כשהפלט של אחד הוא הקלט של הבא: מחקר, ואז מבנה, ואז טיוטה, ואז עריכה. מפרק משימה גדולה לשלבים שהמודל טוב בהם.",
      },
    ],
  },
  {
    id: "models",
    title: "מודלים ופלטפורמות",
    terms: [
      {
        term: "ChatGPT",
        en: "OpenAI",
        definition:
          "ממשק הצ'אט של OpenAI למודלי GPT. אוהב מבנה ברור, רשימות ממוספרות והוראות קצרות בתחילת הפרומפט.",
        link: { href: "/compare/chatgpt-vs-claude", label: "ChatGPT מול Claude בעברית" },
      },
      {
        term: "Claude",
        en: "Anthropic",
        definition:
          "המודלים של Anthropic. חזק בטקסטים ארוכים ובעברית, מגיב טוב להוראות מובנות בתגיות ולדוגמאות. פירוט מתאים לו את הפרומפט כשבוחרים אותו כמודל יעד.",
      },
      {
        term: "Gemini",
        en: "Google",
        definition:
          "המודלים של גוגל, עם חלון הקשר גדול במיוחד ואינטגרציה לכלי Google. פירוט עצמו רץ על Gemini לרוב השדרוגים.",
      },
      {
        term: "מודל יעד",
        en: "Target model",
        definition:
          "המודל שהפרומפט מיועד לו. לכל מודל העדפות: ChatGPT ורשימות, Claude ותגיות XML, Gemini ופסקאות. פירוט בונה את הפרומפט לפי היעד שבחרתם.",
      },
      {
        term: "מחולל תמונות",
        en: "Image model",
        definition:
          'Midjourney, GPT Image, FLUX, Stable Diffusion, Imagen. מקבלים פרומפט באנגלית עם נושא, סגנון, תאורה, עדשה ויחס גובה-רוחב. מצב "תמונה" בפירוט כותב אותו.',
        link: { href: "/guides", label: "מדריכי תמונה ווידאו" },
      },
      {
        term: "מחולל וידאו",
        en: "Video model",
        definition:
          'Runway, Kling, Sora, Veo. פרומפט קולנועי: צילום, תנועת מצלמה, משך, אווירה. מצב "וידאו" בפירוט.',
      },
      {
        term: "מודל פתוח",
        en: "Open-weights model",
        definition:
          "מודל שאפשר להוריד ולהריץ בעצמכם, כמו Llama או Mistral. פירוט משתמש בכמה מהם כגיבוי כשהמודל הראשי עמוס.",
      },
    ],
  },
  {
    id: "systems",
    title: "מערכות וסוכנים",
    terms: [
      {
        term: "סוכן",
        en: "AI agent",
        definition:
          "מודל שמקבל מטרה, כלים והרשאה לפעול בכמה צעדים: לחפש, לקרוא, לכתוב קובץ, לקרוא ל-API. ההנחיה לסוכן היא הפרומפט הכי חשוב שתכתבו.",
      },
      {
        term: "RAG",
        en: "Retrieval-augmented generation",
        definition:
          "לשלוף מידע רלוונטי ממאגר (המסמכים שלכם) ולהכניס אותו לפרומפט לפני שהמודל עונה. כך המודל עונה על סמך המידע שלכם ולא רק מהזיכרון.",
      },
      {
        term: "זיכרון",
        en: "Memory",
        definition:
          "עובדות שהמערכת שומרת עליכם בין שיחות: תפקיד, קהל, סגנון. פירוט לומד עובדות כאלה מהפרומפטים שלכם, אפשר לערוך ולמחוק אותן בהגדרות.",
        link: { href: "/settings?tab=memory", label: "זיכרון AI בפירוט" },
      },
      {
        term: "MCP",
        en: "Model Context Protocol",
        definition:
          "תקן פתוח שמאפשר לסוכן (Claude Desktop, Cursor) לקרוא לכלים חיצוניים. Peroot Connect חושף את פירוט כשרת MCP, כך שהסוכן שלכם משדרג פרומפטים בעצמו.",
        link: { href: "/connect", label: "Peroot Connect" },
      },
      {
        term: "כלי",
        en: "Tool, function calling",
        definition:
          "פעולה שהמודל יכול להפעיל דרך הגדרה מובנית: חיפוש, חישוב, שליפה ממסד נתונים. הבסיס לכל סוכן.",
      },
      {
        term: "מולטימודלי",
        en: "Multimodal",
        definition:
          "מודל שמקבל ומייצר יותר מטקסט: תמונות, קול, וידאו. לכן אפשר לצרף צילום מסך לפרומפט ולקבל תיאור או תיקון.",
      },
      {
        term: "כוונון עדין",
        en: "Fine-tuning",
        definition:
          "אימון נוסף של מודל על נתונים שלכם. יקר ומסובך; ברוב המקרים פרומפט טוב עם דוגמאות ו-RAG מספיקים.",
      },
    ],
  },
  {
    id: "hebrew",
    title: "מה מיוחד בעברית",
    terms: [
      {
        term: "כיווניות",
        en: "RTL, bidirectional text",
        definition:
          "עברית נכתבת מימין לשמאל, ומספרים, קוד ושמות מותגים משמאל לימין באותו משפט. ממשק שלא מטפל בזה נראה שבור; פרומפט טוב מציין את השפה ואת הכיוון של הפלט.",
      },
      {
        term: "משלב",
        en: "Register",
        definition:
          "רמת הלשון: דיבורית, עניינית, משפטית, אקדמית. מודלים נוטים לעברית מתורגמת וגבוהה מדי. בקשו משלב מפורש, וציינו למי כותבים.",
      },
      {
        term: "ניקוד ותעתיק",
        en: "Niqqud, transliteration",
        definition:
          "ניקוד מבלבל מודלים ומקפיץ טוקנים; שמות לועזיים עדיף לכתוב באות לטינית. פירוט מנרמל ניקוד בחיפוש ומשאיר שמות מוצרים באנגלית.",
      },
      {
        term: "מקף ארוך",
        en: "Em dash",
        definition:
          "סימן ההיכר של טקסט שנכתב במכונה. מודלים מפזרים אותו בכל משפט; טקסט שאדם כתב משתמש בפסיק, בנקודתיים או בנקודה. פירוט מסיר אותו מכל תוצאה.",
      },
    ],
  },
];

const FAQ = [
  {
    question: "מה ההבדל בין פרומפט להנחיית מערכת?",
    answer:
      "הנחיית מערכת קבועה לכל השיחה ומגדירה את ההתנהגות; פרומפט הוא הבקשה בכל תור. באפליקציות צ'אט אתם כותבים רק פרומפטים, בבניית סוכן כותבים את שניהם.",
  },
  {
    question: "כמה טוקנים יש בטקסט עברי?",
    answer:
      "בערך טוקן אחד לכל שלוש או ארבע אותיות. משפט של עשר מילים בעברית הוא 20 עד 30 טוקנים, כפול מאנגלית. לכן פרומפט קצר ומדויק חוסך גם כסף.",
  },
  {
    question: "איך מונעים הזיות?",
    answer:
      "מצרפים את המקור לפרומפט (קובץ, קישור), מבקשים ציטוט מהמקור בלבד, ומבקשים מהמודל לומר במפורש כשאינו יודע. מצב מחקר מעמיק בפירוט מוסיף את ההוראות האלה לבד.",
  },
];

function slugify(term: string) {
  return term.replace(/\s+/g, "-").replace(/[^\p{L}\p{N}-]/gu, "");
}

export default function GlossaryPage() {
  const definedTermSet = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "מילון מונחי AI ופרומפטים בעברית",
    url: `${SITE_URL}/glossary`,
    inLanguage: "he",
    hasDefinedTerm: SECTIONS.flatMap((s) =>
      s.terms.map((t) => ({
        "@type": "DefinedTerm",
        name: t.term,
        alternateName: t.en,
        description: t.definition,
        url: `${SITE_URL}/glossary#${slugify(t.term)}`,
      })),
    ),
  };
  const total = SECTIONS.reduce((n, s) => n + s.terms.length, 0);

  return (
    <>
      <JsonLd data={definedTermSet} />
      <JsonLd data={faqSchema(FAQ)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "דף הבית", url: "/" },
          { name: "מילון מונחים", url: "/glossary" },
        ])}
      />
      <div className="min-h-screen bg-background text-foreground" dir="rtl">
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-14 space-y-12">
          <nav
            aria-label="breadcrumb"
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <Link href="/" className="hover:text-foreground transition-colors">
              דף הבית
            </Link>
            <span>/</span>
            <span className="text-secondary-foreground">מילון מונחים</span>
          </nav>

          <header>
            <PageHeading
              title="מילון מונחי AI ופרומפטים"
              highlight="בעברית"
              subtitle={`${total} מונחים שפוגשים בעבודה עם ChatGPT, Claude ו-Gemini, מוסברים בעברית פשוטה, עם דוגמה כשזה עוזר. בלי ז'רגון על ז'רגון.`}
              badge="מדריך"
              badgeIcon={<BookOpen className="w-4 h-4" />}
              size="large"
              align="start"
            />
            <nav aria-label="חלקי המילון" className="mt-6 flex flex-wrap gap-2 text-sm">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-amber-500/40 transition-colors"
                >
                  {s.title}
                </a>
              ))}
            </nav>
          </header>

          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="space-y-4 scroll-mt-24">
              <h2 className="text-2xl font-bold text-foreground">{section.title}</h2>
              <dl className="divide-y divide-border border-y border-border">
                {section.terms.map((t) => (
                  <div key={t.term} id={slugify(t.term)} className="py-5 scroll-mt-24">
                    <dt className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-lg font-bold text-foreground">{t.term}</span>
                      <span className="text-sm text-muted-foreground font-mono" dir="ltr">
                        {t.en}
                      </span>
                    </dt>
                    <dd className="mt-2 space-y-2 text-(--text-secondary) leading-relaxed">
                      <p>{t.definition}</p>
                      {t.example ? (
                        <p className="text-sm text-muted-foreground border-s-2 border-amber-500/40 ps-3">
                          {t.example}
                        </p>
                      ) : null}
                      {t.link ? (
                        <Link
                          href={t.link.href}
                          className="inline-block text-sm text-amber-700 dark:text-amber-300 hover:underline"
                        >
                          {t.link.label}
                        </Link>
                      ) : null}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">שאלות שחוזרות</h2>
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
              href="/guide"
              title="המדריך לכתיבת פרומפטים"
              description="מהמשפט הראשון ועד לפרומפט שעובד, עם דוגמאות בעברית."
            />
            <CrossLinkCard
              href="/templates"
              title="תבניות עם משתנים"
              description="מאות פרומפטים מוכנים שממלאים בכמה שדות."
            />
            <CrossLinkCard
              href="/"
              title="לשדרג פרומפט עכשיו"
              description="כותבים משפט, מקבלים פרומפט מלא עם ציון, בחינם."
            />
          </section>
        </div>
      </div>
    </>
  );
}
