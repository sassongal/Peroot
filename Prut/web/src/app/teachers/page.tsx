import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbSchema } from "@/lib/schema";
import {
  GraduationCap,
  FileText,
  ClipboardList,
  FileSpreadsheet,
  MessageCircle,
  BookOpen,
  Target,
  Users,
  School,
  CheckSquare,
  ArrowLeft,
  ArrowLeftRight,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Metadata ────────────────────────────────────────────────────────────────

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space";

export const metadata: Metadata = {
  title: "פרומפטים למורים | פירוט — כלי AI לחינוך בעברית",
  description:
    "68 פרומפטים מקצועיים למורים בעברית — מבחנים, תכנון שיעורים, דפי עבודה, משוב, רובריקות ועוד. הכלי החינמי למורים בישראל.",
  alternates: { canonical: "/teachers" },
  openGraph: {
    title: "פרומפטים למורים | פירוט — כלי AI לחינוך בעברית",
    description:
      "68 פרומפטים מקצועיים למורים בעברית — מבחנים, תכנון שיעורים, דפי עבודה, משוב, רובריקות ועוד.",
    locale: "he_IL",
    type: "website",
    url: `${SITE_URL}/teachers`,
  },
};

// ─── Data ────────────────────────────────────────────────────────────────────

interface ActionCard {
  icon: LucideIcon;
  emoji: string;
  title: string;
  count: string;
  description: string;
}

const ACTION_CARDS: ActionCard[] = [
  {
    icon: FileText,
    emoji: "📝",
    title: "בניית מבחנים",
    count: "10 פרומפטים",
    description:
      "מבחנים מותאמים לרמת הכיתה עם שאלות פתוחות, אמריקאיות ומחוון מובנה.",
  },
  {
    icon: ClipboardList,
    emoji: "📋",
    title: "תכנון שיעורים",
    count: "10 פרומפטים",
    description:
      "תוכניות שיעור מפורטות עם מטרות, פעילויות, לוח זמנים והערכה.",
  },
  {
    icon: FileSpreadsheet,
    emoji: "📄",
    title: "דפי עבודה",
    count: "8 פרומפטים",
    description:
      "דפי עבודה מגוונים לתרגול עצמאי, קבוצתי ולהעשרה — מותאמים לנושא.",
  },
  {
    icon: MessageCircle,
    emoji: "💬",
    title: 'משוב ודו"חות',
    count: "8 פרומפטים",
    description:
      "משוב מילולי מקצועי, דוחות תקופתיים והערות מעצבות לתלמידים.",
  },
  {
    icon: BookOpen,
    emoji: "🎓",
    title: "חומרי הוראה",
    count: "8 פרומפטים",
    description:
      "סיכומים, מצגות, חומרי רקע ומשאבים דיגיטליים להוראה מתקדמת.",
  },
  {
    icon: Target,
    emoji: "🎯",
    title: "דיפרנציאציה",
    count: "6 פרומפטים",
    description:
      "התאמת חומרי לימוד לרמות שונות — מחוננים, קשיי למידה ושכבות ביניים.",
  },
  {
    icon: Users,
    emoji: "👨‍👩‍👧",
    title: "תקשורת עם הורים",
    count: "6 פרומפטים",
    description:
      "מכתבים להורים, הזמנות לאסיפות, עדכוני מצב ומסרים רגישים.",
  },
  {
    icon: School,
    emoji: "🏫",
    title: "ניהול כיתה",
    count: "6 פרומפטים",
    description:
      "חוקי כיתה, טבלאות התנהגות, שגרות בוקר וכלים לניהול משמעת.",
  },
  {
    icon: CheckSquare,
    emoji: "✅",
    title: "הערכה ורובריקות",
    count: "6 פרומפטים",
    description:
      "רובריקות הערכה, מחוונים מפורטים וכלים להערכה חלופית ומעצבת.",
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TeachersPage() {
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "פרומפטים למורים | פירוט",
    description:
      "68 פרומפטים מקצועיים למורים בעברית — מבחנים, תכנון שיעורים, דפי עבודה, משוב, רובריקות ועוד.",
    url: `${SITE_URL}/teachers`,
    inLanguage: "he",
    isPartOf: {
      "@type": "WebSite",
      name: "Peroot",
      url: SITE_URL,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            webPageSchema,
            breadcrumbSchema([
              { name: "דף הבית", url: "/" },
              { name: "למורים", url: "/teachers" },
            ]),
          ]),
        }}
      />

      <div
        className="min-h-screen bg-background text-foreground selection:bg-amber-500/30"
        dir="rtl"
      >
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="max-w-6xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
            <Link
              href="/"
              className="text-lg font-serif font-bold text-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
            >
              Peroot
            </Link>
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
            >
              חזרה לדף הבית
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 md:px-8 pb-24">
          {/* ── Hero ──────────────────────────────────────────────────────── */}
          <section className="py-16 md:py-24 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm font-medium">
              <GraduationCap className="w-4 h-4" />
              68 פרומפטים מוכנים למורים
            </div>

            <h1 className="text-3xl md:text-5xl font-serif font-bold text-foreground leading-tight">
              פרומפטים מקצועיים למורים
              <br />
              <span className="bg-gradient-to-l from-amber-400 to-[#E17100] bg-clip-text text-transparent">
                — בעברית
              </span>
            </h1>

            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              68 פרומפטים מוכנים לשימוש: מבחנים, שיעורים, דפי עבודה, משוב
              והערכה.
              <br />
              <span className="text-foreground font-medium">בחינם.</span>
            </p>

            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-[#E17100] text-black font-bold text-lg transition-all hover:scale-[1.03] active:scale-[0.98] shadow-lg shadow-amber-500/20"
              >
                <Sparkles className="w-5 h-5" />
                התחילו בחינם
              </Link>
            </div>
          </section>

          {/* ── Action Cards Grid ─────────────────────────────────────────── */}
          <section className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
                מה תמצאו בפנים?
              </h2>
              <p className="text-muted-foreground text-sm">
                9 קטגוריות מותאמות לעבודת ההוראה היומיומית
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {ACTION_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <Link
                    key={card.title}
                    href="/prompts/teachers"
                    className="group rounded-2xl border border-border bg-secondary p-5 space-y-3 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {card.emoji} {card.title}
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                          {card.count}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {card.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* ── Before / After Demo ───────────────────────────────────────── */}
          <section className="py-20 space-y-10">
            <div className="text-center space-y-2">
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
                לפני ואחרי — מה פירוט עושה לפרומפט שלכם
              </h2>
              <p className="text-muted-foreground text-sm">
                מה שלוקח דקות לנסח — פירוט עושה בשנייה
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-6 items-stretch">
              {/* Before */}
              <div className="rounded-2xl border border-border bg-secondary p-6 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  הפרומפט שלכם
                </div>
                <p className="text-foreground text-base leading-relaxed font-mono">
                  &ldquo;תכין לי מבחן במתמטיקה&rdquo;
                </p>
              </div>

              {/* Arrow */}
              <div className="hidden md:flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <div className="flex md:hidden items-center justify-center py-2">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center rotate-90">
                  <ArrowLeftRight className="w-4 h-4 text-amber-400" />
                </div>
              </div>

              {/* After */}
              <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent p-6 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  מה שפירוט מייצר
                </div>
                <div className="text-foreground text-sm leading-relaxed space-y-2 font-mono">
                  <p>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                      תפקיד:
                    </span>{" "}
                    אתה מורה למתמטיקה בחטיבת ביניים עם 15 שנות ניסיון.
                  </p>
                  <p>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                      משימה:
                    </span>{" "}
                    בנה מבחן ל{"{"}כיתה{"}"} בנושא {"{"}נושא{"}"}.
                  </p>
                  <p>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                      מבנה:
                    </span>{" "}
                    5 שאלות אמריקאיות + 3 פתוחות + שאלת חשיבה.
                  </p>
                  <p>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                      דרישות:
                    </span>{" "}
                    מחוון ניקוד, התאמה לתכנית הלימודים, 3 רמות קושי.
                  </p>
                  <p>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                      פורמט:
                    </span>{" "}
                    טבלה מסודרת, מוכנה להדפסה.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Bottom CTA ────────────────────────────────────────────────── */}
          <section className="py-20 text-center space-y-6">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
              הצטרפו למורים שכבר משתמשים בפירוט
            </h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              כל הפרומפטים זמינים בחינם — בלי כרטיס אשראי, בלי התחייבות
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-[#E17100] text-black font-bold transition-all hover:scale-[1.03] active:scale-[0.98] shadow-lg shadow-amber-500/20"
              >
                <GraduationCap className="w-5 h-5" />
                כניסה לפירוט
              </Link>
              <Link
                href="/prompts/teachers"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-2xl border border-border text-foreground font-medium hover:bg-secondary transition-colors"
              >
                <BookOpen className="w-5 h-5" />
                עיינו בפרומפטים
              </Link>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
