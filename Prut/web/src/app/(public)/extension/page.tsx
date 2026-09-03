import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import Link from "next/link";
import { PageHeading } from "@/components/ui/PageHeading";
import { Chrome, MousePointerClick, Sparkles, Globe, BookOpen, Download } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";
import { PROMPT_TEMPLATE_COUNT } from "@/lib/constants";
import { CrossLinkCard } from "@/components/ui/CrossLinkCard";
import { CHROME_STORE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "תוסף Chrome לשדרוג פרומפטים מכל אתר",
  description:
    "סמנו טקסט בכל אתר, לחצו לחיצה ימנית וקבלו פרומפט מקצועי: Gmail, Google Docs, לינקדאין ועוד. תוסף Chrome עברי-first, מסונכרן לחשבון פירוט: אותה ספרייה, אותם קרדיטים, אותה שפת פלט.",
  alternates: { canonical: "/extension" },
  openGraph: {
    title: "תוסף Chrome של Peroot | שדרגו פרומפטים מכל אתר",
    description: "שדרוג פרומפטים בלחיצה בתוך ChatGPT, Claude ו-Gemini, ובלחיצה ימנית בכל אתר.",
    locale: "he_IL",
    type: "website",
  },
};

// ─── Data ────────────────────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    step: "1",
    icon: Download,
    title: "מתקינים את התוסף",
    desc: "הורדה חינמית מחנות Chrome. ההתקנה לוקחת שניות - ואז הסמל של Peroot מופיע בסרגל הכלים שלכם.",
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
  },
  {
    step: "2",
    icon: MousePointerClick,
    title: "כותבים בצ'אט, או מסמנים טקסט בכל אתר",
    desc: "ב-ChatGPT, Claude ו-Gemini לוחצים על כפתור Peroot ליד תיבת הכתיבה. בכל אתר אחר: מסמנים טקסט ולחיצה ימנית.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  {
    step: "3",
    icon: Sparkles,
    title: "מקבלים פרומפט מקצועי",
    desc: "Peroot מבין את הכוונה ומחזיר פרומפט מובנה, בשפה שבחרתם, ישר לתוך התיבה. שאלה או שתיים לדיוק, ואפשר לשלוח.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
];

const KEY_FEATURES = [
  {
    icon: Sparkles,
    title: "כפתור זהב בתוך ChatGPT, Claude ו-Gemini",
    description:
      "ליד תיבת הכתיבה מופיע כפתור Peroot. לחיצה אחת הופכת את מה שכתבתם לפרומפט מסודר: תפקיד, משימה, קהל, פורמט והגבלות. התוצאה זורמת מול העיניים ונכנסת לתיבה כשהיא מוכנה, עם שאלות דיוק בלחיצה.",
    color: "text-amber-700 dark:text-amber-300",
    gradient: "from-amber-500/10 to-amber-500/5",
    border: "border-amber-500/20",
  },
  {
    icon: Globe,
    title: "ארבע שפות, מותאם למודל",
    description:
      "עברית, אנגלית, ערבית ורוסית, או זיהוי אוטומטי לפי מה שכתבתם. הפרומפט נבנה לפי המודל שמולו אתם יושבים, והמצבים המתקדמים (מחקר, תמונה, וידאו, סוכן) זמינים למנויי Pro גם בתוסף.",
    color: "text-sky-700 dark:text-sky-300",
    gradient: "from-sky-500/10 to-sky-500/5",
    border: "border-sky-500/20",
  },
  {
    icon: MousePointerClick,
    title: "לחיצה ימנית בכל אתר",
    description:
      "Gmail, Docs, לינקדאין, פייסבוק, Notion: סמנו טקסט, לחיצה ימנית, Peroot. שדרוג, תיקון, קיצור, הרחבה, תרגום או סיכום, בלי לעזוב את הדף.",
    color: "text-emerald-700 dark:text-emerald-300",
    gradient: "from-emerald-500/10 to-emerald-500/5",
    border: "border-emerald-500/20",
  },
  {
    icon: Chrome,
    title: "מסונכרן לחשבון, בעברית ומימין לשמאל",
    description:
      "אותם קרדיטים, אותה שפת פלט ואותה ספרייה כמו באתר. הפרומפטים ששמרתם זמינים בתוך הצ'אט עם חיפוש, וההיסטוריה משותפת. ממשק בעברית, במצב כהה ובהיר.",
    color: "text-amber-700 dark:text-amber-300",
    gradient: "from-amber-500/10 to-amber-500/5",
    border: "border-amber-500/20",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExtensionPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "דף הבית", url: "/" },
          { name: "תוסף Chrome", url: "/extension" },
        ])}
      />
      <div
        className="min-h-screen bg-background text-foreground selection:bg-amber-500/30"
        dir="rtl"
      >
        <main className="max-w-5xl mx-auto px-4 md:px-8 pb-24">
          {/* Hero */}
          <section className="py-16 md:py-24 text-center space-y-6">
            <PageHeading
              title="תוסף Chrome של"
              highlight="Peroot"
              subtitle="שדרגו פרומפטים ישירות מכל אתר - בלי לעבור לאפליקציה. לחיצה ימנית על כל טקסט, וקבלו פרומפט מקצועי תוך שניות."
              badge={CHROME_STORE_URL ? "זמין בחנות Chrome" : "בקרוב"}
              badgeIcon={<Sparkles className="w-4 h-4" />}
              size="large"
              align="center"
            />

            {/* Hero visual */}
            <div className="relative max-w-xl mx-auto mt-6">
              <div className="rounded-2xl border border-border bg-secondary p-6 md:p-8 flex flex-col gap-4">
                {/* Mock browser bar */}
                <div className="flex items-center gap-2 pb-4 border-b border-border">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-(--glass-bg)" />
                    <div className="w-3 h-3 rounded-full bg-(--glass-bg)" />
                    <div className="w-3 h-3 rounded-full bg-(--glass-bg)" />
                  </div>
                  <div className="flex-1 h-6 rounded-md bg-secondary mx-2 flex items-center px-3">
                    <span className="text-xs text-(--text-muted)">mail.google.com</span>
                  </div>
                  <div className="w-7 h-7 rounded-md bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                    <Chrome className="w-4 h-4 text-amber-400" />
                  </div>
                </div>

                {/* Mock selected text + context menu */}
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-right leading-relaxed">
                    <span className="bg-amber-500/20 text-amber-200 px-1 rounded">
                      אני צריך לכתוב מייל ללקוח על עיכוב בפרויקט
                    </span>{" "}
                    ולהסביר את הסיבה...
                  </p>
                  {/* Context menu mock */}
                  <div className="inline-flex flex-col rounded-xl border border-border bg-card overflow-hidden text-sm shadow-xl self-start">
                    <div className="px-4 py-2.5 text-muted-foreground border-b border-border">
                      שדרג עם Peroot
                    </div>
                    <div className="px-4 py-2.5 flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium cursor-default">
                      <Sparkles className="w-3.5 h-3.5" />
                      שדרג פרומפט
                    </div>
                    <div className="px-4 py-2.5 text-muted-foreground cursor-default border-t border-border flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5" />
                      שמור בספרייה
                    </div>
                  </div>
                </div>
              </div>
              {/* Glow */}
              <div className="absolute -inset-px rounded-2xl bg-linear-to-b from-amber-500/10 to-transparent pointer-events-none" />
            </div>
          </section>

          {/* How it works */}
          <section className="py-16 space-y-10">
            <div className="text-center space-y-2">
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
                איך זה עובד?
              </h2>
              <p className="text-muted-foreground text-sm">3 צעדים פשוטים</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {HOW_IT_WORKS.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.step}
                    className={`relative rounded-2xl border ${s.border} bg-linear-to-b ${s.bg}/30 to-transparent p-6 text-center space-y-4`}
                  >
                    {/* Step number */}
                    <div className="absolute top-4 left-4 w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {s.step}
                    </div>
                    <div
                      className={`w-12 h-12 rounded-xl ${s.bg} border border-border flex items-center justify-center ${s.color} mx-auto`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-foreground">{s.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Key Features */}
          <section className="py-4 space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
                מה בתוסף?
              </h2>
              <p className="text-muted-foreground text-sm">כל מה שציפיתם שיהיה - ועוד קצת</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {KEY_FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className={`rounded-2xl border ${f.border} bg-linear-to-b ${f.gradient} p-6 space-y-4 transition-transform`}
                  >
                    <div
                      className={`w-11 h-11 rounded-xl bg-secondary border border-border flex items-center justify-center ${f.color}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-foreground">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* CTA - email signup / notify */}
          <section className="py-20 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary border border-border text-muted-foreground text-sm">
              <Chrome className="w-4 h-4" />
              {CHROME_STORE_URL ? "זמין בחנות Chrome" : "בבדיקות אחרונות לפני החנות"}
            </div>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
              {CHROME_STORE_URL ? "התקינו את התוסף" : "נעדכן כשהתוסף בחנות"}
            </h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
              {CHROME_STORE_URL
                ? "ההתקנה לוקחת שניות. אחר כך מתחברים לחשבון Peroot מהתוסף, וזהו."
                : "ההודעה תופיע במה חדש ובניוזלטר. בינתיים אפשר לשדרג פרומפטים באתר."}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
              {CHROME_STORE_URL ? (
                <ButtonLink
                  href={CHROME_STORE_URL}
                  size="lg"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Chrome className="w-5 h-5" />
                  התקנה מחנות Chrome
                </ButtonLink>
              ) : (
                <ButtonLink href="/whats-new" size="lg">
                  <Chrome className="w-5 h-5" />
                  מה חדש
                </ButtonLink>
              )}
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-2xl border border-border text-foreground font-medium hover:bg-secondary transition-colors"
              >
                <Sparkles className="w-5 h-5" />
                נסו את האפליקציה עכשיו
              </Link>
            </div>

            <p className="text-muted-foreground text-xs">
              עד שהתוסף יצא, כל היכולות זמינות ב-
              <Link
                href="/"
                className="text-amber-500/70 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              >
                peroot.space
              </Link>
            </p>
          </section>

          {/* Cross-links */}
          <section className="py-4 space-y-6">
            <h2 className="text-lg font-serif font-bold text-foreground text-center">
              המשיכו לגלות
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <CrossLinkCard
                href="/features"
                title="כל היכולות של Peroot"
                description="5 מנועי AI - טקסט, מחקר, תמונות, סרטונים וסוכנים"
              />
              <CrossLinkCard
                href={`/prompts`}
                title={`ספריית ${PROMPT_TEMPLATE_COUNT} תבניות פרומפטים`}
                description="פרומפטים מוכנים לכל תחום ופלטפורמה"
              />
              <CrossLinkCard
                href="/guide"
                title="מדריך כתיבת פרומפטים"
                description="למדו לכתוב פרומפטים שמניבים תוצאות מדויקות"
              />
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
