import Link from "next/link";
import { ArrowRight, Accessibility as AccessibilityIcon } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-black text-slate-300 font-sans p-6 md:p-12 lg:p-24" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors mb-8"
        >
          <ArrowRight className="w-4 h-4" />
          חזרה לדף הבית
        </Link>
        
        <h1 className="text-4xl md:text-5xl font-serif text-white mb-12">מדיניות פרטיות - פירוט (Peroot)</h1>
        
        <section className="space-y-4">
          <h2 className="text-2xl text-white font-semibold">1. מינוח כללי</h2>
          <p>
            מדיניות פרטיות זו מתארת כיצד אנו אוספים, משתמשים ומגנים על המידע האישי שלך בעת השימוש באפליקציית &quot;פירוט&quot;. אנו מחויבים לשמור על פרטיות המשתמשים שלנו ולפעול בהתאם לחוקי הגנת הפרטיות בישראל.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl text-white font-semibold">2. המידע שאנו אוספים</h2>
          <p>
            בעת השימוש באתר, אנו עשויים לאסוף את המידע הבא:
          </p>
          <ul className="list-disc pr-6 space-y-2">
            <li>פרטי התחברות (באמצעות Google או אימייל) הכוללים שם, כתובת אימייל ותמונת פרופיל.</li>
            <li>פרומפטים שאתה שומר בספריה האישית שלך.</li>
            <li>היסטוריית שימוש מקומית (על גבי הדפדפן שלך) ובסיס נתונים מאובטח למשתמשים רשומים.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl text-white font-semibold">3. השימוש במידע</h2>
          <p>
            אנו משתמשים במידע כדי:
          </p>
          <ul className="list-disc pr-6 space-y-2">
            <li>לאפשר לך לשמור ולנהל את הפרומפטים האישיים שלך.</li>
            <li>לשפר את חווית המשתמש ואת אלגוריתם שיפור הפרומפטים.</li>
            <li>לספק תמיכה טכנית במידת הצורך.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl text-white font-semibold">4. אבטחת מידע</h2>
          <p>
            המידע שלך נשמר באמצעות שירותי Supabase המאובטחים. אנו מיישמים אמצעי הגנה טכנולוגיים כדי למנוע גישה לא מורשית למידע שלך. עם זאת, אין אבטחה מוחלטת באינטרנט והשימוש באתר הוא על אחריות המשתמש.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl text-white font-semibold">5. זכויות המשתמש</h2>
          <p>
            זכותך לבקש לעיין במידע שנאסף עליך, לבקש את תיקונו או את מחיקת חשבונך לצמיתות דרך פנייה לשירות הלקוחות בכתובת המופיעה מטה.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl text-white font-semibold flex items-center gap-2">
            <AccessibilityIcon className="w-5 h-5 text-purple-400" />
            6. נגישות
          </h2>
          <p>
            אנו מחויבים לספק אתר נגיש לכלל האוכלוסייה. לקבלת פירוט מלא על התאמות הנגישות שביצענו, ניתן לעיין ב-
            <Link href="/accessibility" className="text-purple-400 hover:underline mx-1">הצהרת הנגישות המלאה</Link>.
          </p>
        </section>

        <footer className="pt-12 border-t border-white/10 text-sm text-slate-500">
          עודכן לאחרונה: ינואר 2026 | ליצירת קשר: support@peroot.net
        </footer>
      </div>
    </div>
  );
}
