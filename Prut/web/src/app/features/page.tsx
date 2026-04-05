import type { Metadata } from "next";
import Link from "next/link";
import { CrossLinkCard } from "@/components/ui/CrossLinkCard";
import { PageHeading } from "@/components/ui/PageHeading";
import { PROMPT_LIBRARY_COUNT } from "@/lib/constants";
import { breadcrumbSchema } from "@/lib/schema";
import {
  MessageSquare,
  Globe,
  Palette,
  Bot,
  Video,
  Sparkles,
  BookOpen,
  FolderOpen,
  Link2,
  Mic,
  Zap,
  ArrowLeft,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

export const metadata: Metadata = {
  title: "מה עושים פה? | פירוט - Peroot",
  description:
    "הכירו את כל היכולות של פירוט: שדרוג פרומפטים, מחקר מעמיק, יצירת תמונות וסרטונים, בניית סוכני AI ועוד. הכל בעברית, הכל במקום אחד.",
  alternates: { canonical: "/features" },
  openGraph: {
    title: "מה עושים פה? | כל היכולות של פירוט",
    description:
      "5 מנועי AI, תמיכה ב-15+ פלטפורמות, ספרייה אישית, שרשראות פרומפטים ועוד",
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "מה עושים פה? | כל היכולות של פירוט",
    description: "5 מנועי AI, תמיכה ב-15+ פלטפורמות, ספרייה אישית, שרשראות פרומפטים ועוד",
  },
};

// ─── Data ────────────────────────────────────────────────────────────────────

interface CapabilityData {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  color: string;
  gradient: string;
  borderColor: string;
  description: string;
  platforms: string[];
  features: string[];
}

const CAPABILITIES: CapabilityData[] = [
  {
    icon: MessageSquare,
    title: "פרומפטים לטקסט",
    subtitle: "Standard",
    color: "text-sky-400",
    gradient: "from-sky-500/20 to-sky-500/5",
    borderColor: "border-sky-500/20",
    description:
      "שדרגו כל משפט לפרומפט מקצועי ומובנה. המנוע מזהה את הכוונה שלכם ומייצר פרומפט חד שמוציא תוצאות מדויקות מ-ChatGPT, Claude, Gemini וכל מודל שפה.",
    platforms: ["ChatGPT", "Claude", "Gemini", "Llama", "Mistral", "Copilot"],
    features: [
      "זיהוי כוונה אוטומטי",
      "מבנה פרומפט מקצועי",
      "תמיכה מלאה בעברית",
      "משתנים דינמיים",
    ],
  },
  {
    icon: Globe,
    title: "מחקר מעמיק",
    subtitle: "Deep Research",
    color: "text-emerald-400",
    gradient: "from-emerald-500/20 to-emerald-500/5",
    borderColor: "border-emerald-500/20",
    description:
      "צרו פרומפטים למחקר מעמיק עם חיפוש ברשת, ציטוטים ושרשרת חשיבה. מושלם למאמרים אקדמיים, סקירות שוק, ומחקר תחרותי.",
    platforms: [
      "ChatGPT Deep Research",
      "Gemini Deep Research",
      "Perplexity",
      "Claude",
    ],
    features: [
      "חיפוש ברשת עם מקורות",
      "שרשרת חשיבה מובנית",
      "ציטוטים ואסמכתאות",
      "מבנה מחקרי מקצועי",
    ],
  },
  {
    icon: Palette,
    title: "יצירת תמונות",
    subtitle: "Image Generation",
    color: "text-purple-400",
    gradient: "from-purple-500/20 to-purple-500/5",
    borderColor: "border-purple-500/20",
    description:
      "פרומפטים מותאמים לכל פלטפורמת תמונות AI. כל מנוע מדבר שפה שונה - אנחנו יודעים לייצר את הפרומפט המושלם לכל אחד.",
    platforms: [
      "Midjourney",
      "DALL-E 3",
      "Flux",
      "Stable Diffusion",
      "Google Imagen",
      "Gemini Image",
    ],
    features: [
      "פרומפטים ספציפיים לכל פלטפורמה",
      "בחירת יחס תמונה ופורמט",
      "סגנון, תאורה וקומפוזיציה",
      "Negative prompts אוטומטיים",
    ],
  },
  {
    icon: Video,
    title: "יצירת סרטונים",
    subtitle: "Video Generation",
    color: "text-rose-400",
    gradient: "from-rose-500/20 to-rose-500/5",
    borderColor: "border-rose-500/20",
    description:
      "פרומפטים מותאמים ליצירת סרטוני AI. מתנועות מצלמה ועד סגנון עריכה - המנוע שלנו יודע בדיוק מה כל פלטפורמה מצפה לקבל.",
    platforms: [
      "Runway Gen-4",
      "Kling 2.0",
      "Sora",
      "Google Veo 3",
      "Higgsfield",
      "Minimax Hailuo",
    ],
    features: [
      "תנועות מצלמה מותאמות",
      "פרמטרים ספציפיים לכל פלטפורמה",
      "אווירה, תאורה וסגנון",
      "משך סרטון ורזולוציה",
    ],
  },
  {
    icon: Bot,
    title: "בניית סוכני AI",
    subtitle: "Agent Builder",
    color: "text-amber-400",
    gradient: "from-amber-500/20 to-amber-500/5",
    borderColor: "border-amber-500/20",
    description:
      "צרו הוראות מערכת מקצועיות ל-GPT מותאמים אישית וסוכני AI. הגדירו אישיות, יכולות, מגבלות ותזרימי עבודה - הכל בפרומפט אחד.",
    platforms: ["Custom GPTs", "Claude Projects", "Gemini Gems", "AI Agents"],
    features: [
      "הוראות מערכת מקצועיות",
      "הגדרת אישיות ותפקיד",
      "כללים ומגבלות",
      "תזרימי עבודה מובנים",
    ],
  },
];

interface ExtraFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const EXTRA_FEATURES: ExtraFeature[] = [
  {
    icon: FolderOpen,
    title: "ספרייה אישית",
    description:
      "שמרו, ארגנו וסווגו את הפרומפטים שלכם בתיקיות. חיפוש, מועדפים ומוצמדים - הכל במקום אחד.",
  },
  {
    icon: BookOpen,
    title: "ספריית פרומפטים ציבורית",
    description:
      "מאות פרומפטים מוכנים לשימוש - שיווק, תוכן, HR, חינוך, קוד, ועוד.",
  },
  {
    icon: Link2,
    title: "שרשראות פרומפטים",
    description:
      "חברו כמה פרומפטים יחד לתהליך אוטומטי. כל פלט מזין את הפרומפט הבא.",
  },
  {
    icon: Mic,
    title: "הכתבה קולית",
    description:
      "דברו במקום לכתוב. המערכת ממירה את הדיבור לטקסט ומשדרגת אותו אוטומטית.",
  },
  {
    icon: Sparkles,
    title: "שיפור חכם",
    description:
      "אחרי כל שדרוג, קבלו הצעות לשיפורים נוספים מבוססי AI - עד שהפרומפט מושלם.",
  },
  {
    icon: Zap,
    title: "משתנים דינמיים",
    description:
      "הגדירו משתנים {כמו_זה} בפרומפטים ומלאו אותם מחדש בכל שימוש - בלי לערוך מחדש.",
  },
];

// ─── Components ──────────────────────────────────────────────────────────────

function CapabilityCard({ cap, index }: { cap: CapabilityData; index: number }) {
  const Icon = cap.icon;
  return (
    <div
      className={`group relative rounded-2xl border ${cap.borderColor} bg-gradient-to-b ${cap.gradient} p-6 md:p-8 transition-all hover:scale-[1.01] hover:shadow-lg hover:shadow-black/20`}
    >
      {/* Number badge */}
      <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-bold text-muted-foreground">
        {index + 1}
      </div>

      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center ${cap.color} shrink-0`}
          >
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">{cap.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{cap.subtitle}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {cap.description}
        </p>

        {/* Platforms */}
        <div className="flex flex-wrap gap-2">
          {cap.platforms.map((p) => (
            <span
              key={p}
              className="text-[11px] px-2.5 py-1 rounded-full bg-secondary border border-border text-muted-foreground"
            >
              {p}
            </span>
          ))}
        </div>

        {/* Features */}
        <ul className="space-y-2">
          {cap.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-foreground">
              <CheckCircle2
                className={`w-4 h-4 ${cap.color} shrink-0 mt-0.5`}
              />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function FeaturesPage() {
  return (
    <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(
          breadcrumbSchema([
            { name: "דף הבית", url: "/" },
            { name: "תכונות", url: "/features" },
          ])
        ),
      }}
    />
    <main
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

      <div className="max-w-6xl mx-auto px-4 md:px-8 pb-24">
        {/* Hero */}
        <section className="py-16 md:py-24">
          <PageHeading
            title="מה עושים פה?"
            subtitle="פירוט הוא כלי AI ישראלי שמשדרג כל פרומפט שאתם כותבים לרמה מקצועית. טקסט, מחקר, תמונות, סרטונים וסוכני AI - הכל בעברית, הכל במקום אחד."
            badge="5 מנועי AI חכמים"
            badgeIcon={<Sparkles className="w-4 h-4" />}
            size="large"
            align="center"
          />
        </section>

        {/* 5 Capability Modes */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
              5 מצבי עבודה
            </h2>
            <p className="text-muted-foreground text-sm">
              כל מצב מייצר פרומפט מותאם בדיוק לסוג הפלטפורמה שאתם עובדים איתה
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CAPABILITIES.map((cap, i) => (
              <CapabilityCard key={cap.subtitle} cap={cap} index={i} />
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
              איך זה עובד?
            </h2>
            <p className="text-muted-foreground text-sm">3 צעדים פשוטים</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "1",
                title: "כתבו משפט פשוט",
                desc: "אפילו משפט אחד בעברית. לא צריך להיות מומחים.",
                color: "text-sky-400",
                bg: "bg-sky-500/10",
              },
              {
                step: "2",
                title: "בחרו מצב עבודה",
                desc: "טקסט, מחקר, תמונה, סרטון או סוכן - בחרו מה אתם צריכים.",
                color: "text-amber-400",
                bg: "bg-amber-500/10",
              },
              {
                step: "3",
                title: "קבלו פרומפט מקצועי",
                desc: "AI מתקדם משדרג את המשפט שלכם לפרומפט חד ומדויק.",
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="relative rounded-2xl border border-border bg-secondary p-6 text-center"
              >
                <div
                  className={`w-10 h-10 rounded-full ${s.bg} ${s.color} flex items-center justify-center text-lg font-bold mx-auto mb-4`}
                >
                  {s.step}
                </div>
                <h3 className="text-base font-bold text-foreground mb-2">
                  {s.title}
                </h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Extra Features */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
              ועוד הרבה יותר
            </h2>
            <p className="text-muted-foreground text-sm">
              כל מה שצריך כדי לעבוד עם AI כמו מקצוען
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {EXTRA_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-xl border border-border bg-secondary p-5 space-y-3 hover:border-border transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {f.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Cross-links */}
        <section className="py-12 space-y-4">
          <h2 className="text-lg font-serif font-bold text-foreground text-center mb-6">
            המשיכו לגלות
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <CrossLinkCard href="/prompts" title={`ספריית ${PROMPT_LIBRARY_COUNT} תבניות פרומפטים`} description="פרומפטים מוכנים לכל תחום ופלטפורמה" />
            <CrossLinkCard href="/examples" title="דוגמאות לפרומפטים משודרגים" description="ראו לפני ואחרי - איך Peroot משפר פרומפטים" />
            <CrossLinkCard href="/blog" title="טיפים נוספים בבלוג" description="מדריכים מקצועיים לכתיבת פרומפטים ו-AI" />
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 text-center space-y-6">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
            מוכנים לשדרג את הפרומפטים שלכם?
          </h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            נסו בחינם - בלי כרטיס אשראי, בלי התחייבות
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold transition-all hover:scale-[1.03] active:scale-[0.98]"
            >
              <Sparkles className="w-5 h-5" />
              בואו ננסה!
            </Link>
            <Link
              href="/guide"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-2xl border border-border text-foreground font-medium hover:bg-secondary transition-colors"
            >
              <BookOpen className="w-5 h-5" />
              מדריך כתיבת פרומפטים
            </Link>
          </div>
          <p className="text-slate-600 text-xs mt-4">
            <Link href="/pricing" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">מחירים ותוכניות</Link>
          </p>
        </section>
      </div>
    </main>
    </>
  );
}
