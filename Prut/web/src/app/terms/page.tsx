import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "תנאי שימוש | Peroot",
  description: "תנאי השימוש וכללי הקהילה של Peroot.",
};

export default function TermsPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen bg-black text-slate-300 font-sans p-6 md:p-12 lg:p-24"
      dir="rtl"
    >
      <div className="max-w-4xl mx-auto space-y-10">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors mb-4"
        >
          <ArrowRight className="w-4 h-4" />
          חזרה לדף הבית
        </Link>
        
        <header className="space-y-4 border-b border-white/10 pb-10">
          <div className="flex items-center gap-4 text-white">
            <FileText className="w-10 h-10 text-purple-500" />
            <h1 className="text-4xl md:text-5xl font-serif font-bold">תנאי שימוש</h1>
          </div>
          <p className="text-lg text-slate-400 max-w-2xl">
            השימוש במערכת Peroot כפוף לתנאים המפורטים להלן. עצם השימוש במערכת מהווה הסכמה לתנאים אלו.
          </p>
        </header>

        <section className="space-y-6">
          <div className="space-y-8">
            <article className="space-y-3">
              <h2 className="text-xl text-white font-semibold">1. השימוש במערכת</h2>
              <p className="leading-relaxed text-slate-400">
                מערכת Peroot נועדה לסיוע ביצירה ושיפור של הנחיות (Prompts) למודלי בינה מלאכותית. השימוש במערכת מותר למטרות חוקיות בלבד. חל איסור לעשות שימוש במערכת ליצירת תוכן פוגעני, מסית, גזעני או בלתי חוקי.
              </p>
            </article>

            <article className="space-y-3">
              <h2 className="text-xl text-white font-semibold">2. קניין רוחני</h2>
              <p className="leading-relaxed text-slate-400">
                כל הזכויות על המערכת, הקוד, העיצוב והאלגוריתמים שמורות ל-JoyaTech. התוכן שנוצר על ידך (הפרומפטים) שייך לך, אך את/ה מעניק/ה לנו רישיון לא בלעדי להשתמש בו לצורך שיפור השירות והצגתו במערכת.
              </p>
            </article>

            <article className="space-y-3">
              <h2 className="text-xl text-white font-semibold">3. אחריות</h2>
              <p className="leading-relaxed text-slate-400">
               השירות ניתן כמות שהוא (AS IS). אנו לא אחראים לתוצאות השימוש בפרומפטים שנוצרו במערכת מול צדדים שלישיים (כגון OpenAI או Anthropic). האחריות על השימוש בתוצרים היא על המשתמש בלבד.
              </p>
            </article>

            <article className="space-y-3">
              <h2 className="text-xl text-white font-semibold">4. פרטיות</h2>
              <p className="leading-relaxed text-slate-400">
                אנו מכבדים את פרטיותך. לפרטים המלאים על איסוף ושימוש במידע, אנא עיין ב<Link href="/privacy" className="text-purple-400 hover:underline mx-1">מדיניות הפרטיות</Link> שלנו.
              </p>
            </article>

             <article className="space-y-3">
              <h2 className="text-xl text-white font-semibold">5. שינויים בתנאים</h2>
              <p className="leading-relaxed text-slate-400">
                אנו שומרים לעצמנו את הזכות לעדכן את תנאי השימוש מעת לעת. המשך השימוש באתר לאחר עדכון התנאים מהווה הסכמה לתנאים המעודכנים.
              </p>
            </article>
          </div>
        </section>

        <footer className="pt-12 text-center text-sm text-slate-600 border-t border-white/5 mt-12">
          עודכן לאחרונה: ינואר 2026
        </footer>
      </div>
    </main>
  );
}
