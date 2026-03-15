import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "דוגמאות פרומפטים - לפני ואחרי",
  description: "ראו איך Peroot הופך פרומפטים פשוטים לפרומפטים מקצועיים. דוגמאות אמיתיות עם השוואת לפני ואחרי.",
  alternates: { canonical: "/examples" },
  openGraph: {
    title: "דוגמאות פרומפטים - לפני ואחרי | Peroot",
    description: "ראו איך Peroot הופך פרומפטים פשוטים לפרומפטים מקצועיים. דוגמאות אמיתיות עם השוואת לפני ואחרי.",
    url: "/examples",
    siteName: "Peroot",
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "דוגמאות פרומפטים - לפני ואחרי | Peroot",
    description: "ראו איך Peroot הופך פרומפטים פשוטים לפרומפטים מקצועיים.",
  },
};

const EXAMPLES = [
  {
    category: "שיווק",
    categoryColor: "rose",
    before: "כתוב לי מייל שיווקי להשקת מוצר חדש",
    after: `## 🎯 תפקיד וזהות
אתה מומחה קופירייטינג ושיווק דיגיטלי עם 12 שנות ניסיון בכתיבת מיילים שיווקיים לסטארטאפים ומוצרי טכנולוגיה.

## 📋 המשימה
כתוב מייל שיווקי להשקת מוצר חדש שיוביל לפתיחות גבוהות ולחיצות על CTA.

## 👥 קהל יעד
מנהלי שיווק ובעלי עסקים קטנים-בינוניים בישראל, דוברי עברית, שמכירים כלי AI בסיסיים.

## 📐 פורמט פלט
- שורת נושא (עד 50 תווים)
- כותרת ראשית
- 3 פסקאות קצרות (עד 150 מילים סה"כ)
- CTA ברור עם כפתור

## ⚡ הנחיות
- טון: מקצועי אך נגיש, לא פורמלי מדי
- הימנע מ: קלישאות, סימני קריאה מרובים, הבטחות מופרזות
- כלול: מספר אחד קונקרטי שמוכיח ערך`,
  },
  {
    category: "תוכן",
    categoryColor: "purple",
    before: "צור תוכן לפוסט אינסטגרם לעסק קטן",
    after: `## 🎯 תפקיד וזהות
את/ה מנהל/ת תוכן ברשתות חברתיות עם התמחות בעסקים קטנים ומקומיים בישראל.

## 📋 המשימה
צור פוסט אינסטגרם שמניע מעורבות (לייקים, תגובות, שיתופים) עבור עסק קטן.

## 👥 קהל יעד
עוקבים בגילאי 25-45, דוברי עברית, מתעניינים בקניות מקומיות ותמיכה בעסקים קטנים.

## 📐 פורמט פלט
- טקסט ראשי (עד 2,200 תווים)
- 5 שורות ראשונות חזקות (הוק)
- CTA בסוף הפוסט
- 15-20 האשטאגים רלוונטיים (מקומיים + כלליים)
- הצעה לתמונה/ריל מתאים

## ⚡ הנחיות
- טון: חם, אותנטי, קהילתי
- כלול: אמוג'י מדוד (2-3 בלבד)
- הימנע מ: שפה מכירתית ישירה, קלישאות
- הוסף: שאלה פתוחה לעידוד תגובות`,
  },
  {
    category: "HR",
    categoryColor: "pink",
    before: "בנה תבנית לתיאור משרה של מפתח Full Stack",
    after: `## 🎯 תפקיד וזהות
את/ה מומחה/ית גיוס טכנולוגי עם ניסיון בכתיבת תיאורי משרות שמושכים מועמדים איכותיים בשוק ההייטק הישראלי.

## 📋 המשימה
כתוב תיאור משרה למפתח/ת Full Stack שמדויק, מושך, ומבדל את החברה ממתחרים.

## 📐 פורמט פלט
מבנה קבוע:
1. כותרת משרה + מיקום
2. על החברה (3 משפטים)
3. על התפקיד (פסקה אחת)
4. אחריות עיקריות (5-7 נקודות)
5. דרישות חובה (4-5 נקודות)
6. יתרון (3-4 נקודות)
7. מה אנחנו מציעים (4-6 נקודות)

## ⚡ הנחיות
- שפה מכילה ומגדרית
- הימנע מ: "ניסיון של X שנים" (העדף "ניסיון משמעותי ב...")
- הימנע מ: דרישות לא ריאליות (10 שנות React)
- כלול: טווח שכר או ציון "שכר תחרותי"
- טון: מקצועי אך לא יבש`,
  },
  {
    category: "חינוך",
    categoryColor: "indigo",
    before: "כתוב סקריפט לסרטון הסבר על המוצר שלי",
    after: `## 🎯 תפקיד וזהות
את/ה תסריטאי/ת וידאו עם ניסיון ביצירת סרטוני הסבר (Explainer Videos) לסטארטאפים ומוצרי SaaS.

## 📋 המשימה
כתוב תסריט לסרטון הסבר של 60-90 שניות שמציג את המוצר בצורה ברורה ומניע לפעולה.

## 📐 פורמט פלט
מבנה הסרטון:
1. **הוק** (0-5 שניות): שאלה או בעיה מזוהה
2. **הבעיה** (5-15 שניות): תיאור הכאב
3. **הפתרון** (15-35 שניות): הצגת המוצר
4. **איך זה עובד** (35-55 שניות): 3 שלבים פשוטים
5. **הוכחה חברתית** (55-65 שניות): מספר או ציטוט
6. **CTA** (65-75 שניות): מה לעשות עכשיו

כלול לכל חלק:
- טקסט לקריינות
- תיאור ויזואלי (מה על המסך)
- תזמון מדויק

## ⚡ הנחיות
- שפה פשוטה, ללא ז'רגון
- משפטים קצרים (עד 15 מילים)
- הימנע מ: פתיחה עם "בעולם של היום..."`,
  },
];

export default function ExamplesPage() {
  return (
    <div className="min-h-screen bg-black text-slate-200 p-4 md:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group w-fit mb-8"
        >
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-[-2px]" />
          <span>חזרה</span>
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-serif text-white mb-4">לפני ואחרי</h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            ראו איך Peroot הופך פרומפט פשוט לפרומפט מקצועי שמוציא תוצאות טובות יותר מכל מודל AI
          </p>
        </div>

        <div className="space-y-8">
          {EXAMPLES.map((example, i) => (
            <div key={i} className="glass-card rounded-xl border border-white/10 overflow-hidden cursor-pointer">
              <div className="p-4 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 bg-white/5 px-3 py-1 rounded-full">
                  {example.category}
                </span>
                <span className="text-[10px] text-slate-500">דוגמה #{i + 1}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-white/5">
                {/* Before */}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-red-400/60" />
                    <span className="text-[10px] font-semibold text-red-400/60 uppercase tracking-wider">לפני</span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">{example.before}</p>
                </div>

                {/* After */}
                <div className="p-6 bg-white/[0.01]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">אחרי - Peroot</span>
                  </div>
                  <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-mono text-xs">
                    {example.after}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16 mb-8">
          <h2 className="text-2xl font-serif text-white mb-4">רוצים לנסות בעצמכם?</h2>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl accent-gradient text-black font-bold text-sm hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none"
          >
            שדרגו פרומפט עכשיו - בחינם
          </Link>
        </div>
      </div>
    </div>
  );
}
