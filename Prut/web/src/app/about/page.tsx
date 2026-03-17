import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Rocket, Globe, Sparkles, Users, ExternalLink } from "lucide-react";
import { breadcrumbSchema } from "@/lib/schema";
import { PROMPT_LIBRARY_COUNT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "אודות Peroot | JoyaTech",
  description:
    "Peroot (פירוט) הוא מוצר של JoyaTech - חברת טכנולוגיה ישראלית המפתחת כלי AI חדשניים בעברית. הכלי הראשון והמתקדם ביותר בישראל לשדרוג פרומפטים מקצועי.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "אודות Peroot | JoyaTech",
    description:
      "Peroot (פירוט) הוא מוצר של JoyaTech - חברת טכנולוגיה ישראלית שמפתחת כלי AI חדשניים בעברית.",
    url: "/about",
    siteName: "Peroot",
    locale: "he_IL",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "דף הבית", url: "/" },
              { name: "אודות", url: "/about" },
            ])
          ),
        }}
      />
      <main
        className="min-h-screen bg-black text-slate-300 font-sans p-6 md:p-12 lg:p-24"
        dir="rtl"
      >
        <div className="max-w-3xl mx-auto space-y-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            חזרה לדף הבית
          </Link>

          <h1 className="text-4xl md:text-5xl font-serif text-white">
            אודות Peroot
          </h1>

          <section className="space-y-4">
            <h2 className="text-2xl font-serif text-white">הסיפור</h2>
            <p className="text-lg leading-relaxed">
              Peroot (פירוט) נולד מתוך צורך אמיתי. כשעבדנו עם מודלי AI
              יום-יום, ראינו שוב ושוב איך פרומפטים גנריים מייצרים תוצאות
              בינוניות - במיוחד בעברית. הכלים שהיו קיימים בשוק היו כולם באנגלית,
              ולא הבינו את הניואנסים של השפה העברית.
            </p>
            <p className="text-lg leading-relaxed">
              אז בנינו את מה שהיינו רוצים שיהיה לנו: כלי שמבין עברית מהיסוד, לא
              תרגום מאנגלית. כלי שיודע לשאול את השאלות הנכונות, לבנות מבנה
              מקצועי, ולהתאים את הפרומפט לכל מודל AI - בין אם זה ChatGPT, Claude,
              Gemini, או Midjourney.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-serif text-white flex items-center gap-3">
              <Rocket className="w-6 h-6 text-amber-400" />
              JoyaTech
            </h2>
            <p className="text-lg leading-relaxed">
              Peroot הוא מוצר של{" "}
              <a
                href="https://joya-tech.net"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 transition-colors underline inline-flex items-center gap-1"
              >
                JoyaTech
                <ExternalLink className="w-3.5 h-3.5" />
              </a>{" "}
              - חברת טכנולוגיה ישראלית שמתמחה בפיתוח כלי AI חדשניים.
            </p>
            <p className="text-lg leading-relaxed">
              ב-JoyaTech אנחנו מאמינים שטכנולוגיה מתקדמת צריכה להיות נגישה
              לכולם, ובמיוחד לדוברי עברית. המשימה שלנו היא לגשר על הפער
              הטכנולוגי ולהביא כלים מתקדמים בשפה שלנו - כלים שנבנו מאפס
              לעברית, לא תרגומים חובבניים מאנגלית.
            </p>
            <p className="text-lg leading-relaxed">
              הצוות שלנו משלב ניסיון של שנים בפיתוח תוכנה, בינה מלאכותית,
              ועיצוב מוצרים דיגיטליים. אנחנו עובדים עם הטכנולוגיות
              המתקדמות ביותר כדי להפוך רעיונות לכלים שעובדים - פשוט, מהר, ובעברית.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-serif text-white">למה Peroot?</h2>
            <ul className="space-y-4 text-lg">
              <li className="flex gap-3">
                <Globe className="w-5 h-5 text-amber-400 shrink-0 mt-1" />
                <span>
                  <strong className="text-white">עברית מהיסוד</strong> - לא
                  תרגום. המערכת נבנתה לעברית מהשורש, עם הבנה של מבנה השפה
                  והתרבות.
                </span>
              </li>
              <li className="flex gap-3">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-1" />
                <span>
                  <strong className="text-white">כל המודלים, מקום אחד</strong> -
                  ChatGPT, Claude, Gemini, Midjourney, כלי וידאו AI - הכל תחת
                  קורת גג אחת.
                </span>
              </li>
              <li className="flex gap-3">
                <Users className="w-5 h-5 text-amber-400 shrink-0 mt-1" />
                <span>
                  <strong className="text-white">{PROMPT_LIBRARY_COUNT}+ תבניות מוכנות</strong> -
                  ספרייה מקצועית ב-30+ קטגוריות לכל תחום עיסוק.
                </span>
              </li>
              <li className="flex gap-3">
                <Rocket className="w-5 h-5 text-amber-400 shrink-0 mt-1" />
                <span>
                  <strong className="text-white">דירוג איכות בזמן אמת</strong> -
                  המערכת מודדת כל פרומפט ומציעה שיפורים מיידיים.
                </span>
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-serif text-white">המשימה שלנו</h2>
            <p className="text-lg leading-relaxed">
              לאפשר לכל דובר עברית להפיק את המקסימום מכלי AI - בלי לדעת אנגלית,
              בלי להבין prompt engineering, ובלי לבזבז זמן על ניסוי וטעייה.
              אנחנו ב-JoyaTech מפתחים את הדור הבא של כלי AI בעברית, ו-Peroot הוא
              רק ההתחלה.
            </p>
          </section>

          <section className="border-t border-white/10 pt-8 mt-8">
            <h2 className="text-2xl font-serif text-white mb-4">
              רוצים ליצור קשר?
            </h2>
            <p className="text-lg mb-4">
              שאלות, הצעות, שיתופי פעולה - תמיד שמחים לשמוע.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/contact"
                className="text-amber-400 hover:text-amber-300 transition-colors underline"
              >
                צור קשר
              </Link>
              <a
                href="mailto:gal@joya-tech.net"
                className="text-amber-400 hover:text-amber-300 transition-colors underline"
              >
                gal@joya-tech.net
              </a>
              <a
                href="https://joya-tech.net"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 transition-colors underline inline-flex items-center gap-1"
              >
                joya-tech.net
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
