import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "איך לכתוב פרומפט טוב — המדריך המלא",
  description: "5 עקרונות שיהפכו כל פרומפט שלכם ממשהו בסיסי לפרומפט מקצועי שמוציא תוצאות מדויקות מ-ChatGPT, Claude ו-Gemini.",
  alternates: { canonical: "/blog/how-to-write-good-prompt" },
  openGraph: {
    title: "איך לכתוב פרומפט טוב — המדריך המלא | Peroot",
    description: "5 עקרונות שיהפכו כל פרומפט שלכם ממשהו בסיסי לפרומפט מקצועי שמוציא תוצאות מדויקות מ-ChatGPT, Claude ו-Gemini.",
    url: "/blog/how-to-write-good-prompt",
    siteName: "Peroot",
    locale: "he_IL",
    type: "article",
  },
  twitter: {
    card: "summary",
    title: "איך לכתוב פרומפט טוב — המדריך המלא | Peroot",
    description: "5 עקרונות שיהפכו כל פרומפט שלכם ממשהו בסיסי לפרומפט מקצועי.",
  },
};

export default function HowToWriteGoodPrompt() {
  return (
    <div className="min-h-screen bg-black text-slate-200 p-4 md:p-8" dir="rtl">
      <article className="max-w-3xl mx-auto">
        <Link
          href="/blog"
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group w-fit mb-8"
        >
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-[-2px]" />
          <span>חזרה לבלוג</span>
        </Link>

        <header className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full">מדריכים</span>
            <span className="text-[10px] text-slate-500">10 מרץ 2026</span>
            <span className="text-[10px] text-slate-600">5 דקות קריאה</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif text-white mb-4 leading-tight">
            איך לכתוב פרומפט טוב — המדריך המלא
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed">
            רוב האנשים כותבים פרומפטים כמו הודעת טקסט — קצר, עמום, בלי הקשר. התוצאה? תשובות גנריות שלא באמת עוזרות. הנה 5 עקרונות שישנו את זה.
          </p>
        </header>

        <div className="prose prose-invert prose-amber max-w-none space-y-8">

          <section>
            <h2 className="text-2xl font-serif text-white mb-4">1. תנו תפקיד — אל תדברו לרובוט</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              הדבר הראשון שמשנה את איכות התשובה הוא לתת למודל <strong className="text-amber-200">זהות מקצועית</strong>. במקום לכתוב &quot;כתוב לי מייל&quot;, כתבו &quot;אתה מומחה קופירייטינג עם 10 שנות ניסיון בשיווק דיגיטלי. כתוב מייל...&quot;.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                <div className="text-[10px] font-semibold text-red-400 mb-2">❌ חלש</div>
                <p className="text-sm text-slate-400">כתוב לי מייל שיווקי</p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <div className="text-[10px] font-semibold text-emerald-400 mb-2">✅ חזק</div>
                <p className="text-sm text-slate-300">אתה מומחה שיווק דיגיטלי. כתוב מייל שיווקי להשקת אפליקציה חדשה לניהול משימות, מיועד למנהלי פרויקטים.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-white mb-4">2. היו ספציפיים — &quot;מה בדיוק&quot; ולא &quot;משהו&quot;</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              ככל שאתם יותר מדויקים, התוצאה יותר טובה. ציינו: <strong className="text-amber-200">למי</strong> זה מיועד, <strong className="text-amber-200">מה</strong> המטרה, <strong className="text-amber-200">באיזה פורמט</strong> אתם רוצים את הפלט, ו<strong className="text-amber-200">מה לא לכלול</strong>.
            </p>
            <p className="text-slate-300 leading-relaxed">
              המודל לא קורא מחשבות. אם לא אמרתם שאתם רוצים רשימה עם נקודות — תקבלו פסקה. אם לא אמרתם &quot;בעברית&quot; — יכול להיות שתקבלו באנגלית.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-white mb-4">3. תנו פורמט — אמרו איך צריך להיראות</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              אחד הטריקים הכי פשוטים ואפקטיביים: ציינו בדיוק איך אתם רוצים שהפלט ייראה. כמה מילים? טבלה או רשימה? כותרות? קוד?
            </p>
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <div className="text-[10px] font-semibold text-amber-400 mb-2">💡 דוגמה</div>
              <p className="text-sm text-slate-300">&quot;כתוב 5 כותרות, כל אחת עד 60 תווים. אחרי כל כותרת, הוסף שורה אחת שמסבירה למה היא עובדת.&quot;</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-white mb-4">4. השתמשו במגבלות — &quot;אל תעשה&quot; חשוב כמו &quot;עשה&quot;</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              מגבלות שליליות (Negative Constraints) הן כלי חזק. אמרו למודל מה <strong className="text-amber-200">לא</strong> לכלול: &quot;אל תשתמש בקלישאות&quot;, &quot;הימנע ממשפטי פתיחה גנריים&quot;, &quot;לא יותר מ-200 מילים&quot;.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif text-white mb-4">5. תנו דוגמה — הראו מה אתם רוצים</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              Few-shot prompting — לתת למודל דוגמה אחת או שתיים של הפלט הרצוי — משפר דרמטית את התוצאות. זה עובד במיוחד טוב כשאתם רוצים טון ספציפי או מבנה מסוים.
            </p>
          </section>

          <section className="!mt-12 p-6 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <h2 className="text-xl font-serif text-white mb-2">רוצים לדלג על כל זה?</h2>
            <p className="text-sm text-slate-300 mb-4">
              Peroot עושה את כל העבודה בשבילכם. כתבו את הרעיון שלכם — והמערכת תבנה פרומפט מקצועי עם כל 5 העקרונות האלה אוטומטית.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl accent-gradient text-black font-bold text-sm hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all"
            >
              נסו את Peroot בחינם
            </Link>
          </section>
        </div>
      </article>
    </div>
  );
}
