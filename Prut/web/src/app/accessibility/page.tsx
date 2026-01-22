
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Accessibility as AccessibilityIcon, Phone, Mail, User } from "lucide-react";

export const metadata: Metadata = {
  title: "הצהרת נגישות | Peroot",
  description: "הצהרת הנגישות של Peroot והתאמות שבוצעו באתר.",
};

export default function AccessibilityPage() {
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
            <AccessibilityIcon className="w-10 h-10 text-purple-500" />
            <h1 className="text-4xl md:text-5xl font-serif font-bold">הצהרת נגישות</h1>
          </div>
          <p className="text-lg text-slate-400 max-w-2xl">
            אנו ב-Peroot רואים חשיבות עליונה במתן שירות שוויוני, מכובד, נגיש ומקצועי לכלל הגולשים, בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות.
          </p>
        </header>

        <section className="space-y-6">
          <h2 className="text-2xl text-white font-semibold flex items-center gap-2">
            <div className="w-1 h-6 bg-purple-500 rounded-full" />
            סטטוס נגישות האתר
          </h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <p>
              אתר זה עומד בדרישות תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע&quot;ג-2013. התאמות הנגישות בוצעו בהתאם לתקן הישראלי ת&quot;י 5568 המבוסס על WCAG 2.1 ברמת <strong>AA</strong>.
            </p>
            <p className="text-sm text-slate-400">
              בדיקה אחרונה: ינואר 2026. בדיקות בוצעו בדפדפני Chrome, Edge, Firefox ו-Safari ובקוראי מסך NVDA ו-VoiceOver.
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-medium">
              <li className="flex items-center gap-2 bg-black/40 p-3 rounded-xl border border-white/5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                תמיכה מלאה בניווט מקלדת (Tab/Shift+Tab/Enter)
              </li>
              <li className="flex items-center gap-2 bg-black/40 p-3 rounded-xl border border-white/5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                קישור דילוג לתוכן הראשי
              </li>
              <li className="flex items-center gap-2 bg-black/40 p-3 rounded-xl border border-white/5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                מותאם לקוראי מסך (NVDA, VoiceOver)
              </li>
              <li className="flex items-center gap-2 bg-black/40 p-3 rounded-xl border border-white/5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                מבנה היררכי תקין (H1, H2)
              </li>
              <li className="flex items-center gap-2 bg-black/40 p-3 rounded-xl border border-white/5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                ניגודיות צבעים גבוהה וסימון פוקוס ברור
              </li>
              <li className="flex items-center gap-2 bg-black/40 p-3 rounded-xl border border-white/5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                כיבוד העדפת הפחתת תנועה (Reduced Motion)
              </li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl text-white font-semibold">הנחיות להפעלה וניווט</h2>
          <div className="space-y-4 leading-relaxed">
            <p>
              האתר מותאם לצפייה בדפדפנים המודרניים (Chrome, Edge, Firefox, Safari) וכולל את ההתאמות הבאות:
            </p>
            <ul className="list-disc pr-6 space-y-2">
              <li>שימוש במקש <strong>Tab</strong> למעבר בין אלמנטים אינטראקטיביים.</li>
              <li>שימוש ב-<strong>Enter</strong> ו-<strong>Space</strong> להפעלת כפתורים ותפריטים.</li>
              <li>קישור &quot;דלג לתוכן הראשי&quot; זמין מתחילת העמוד.</li>
              <li>תמיכה בתיאורי טקסט חלופיים (Alt Text) לתמונות משמעותיות.</li>
              <li>אפשרות להפחתת אנימציות במערכת (prefers-reduced-motion).</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl text-white font-semibold">יישומי נגישות נוספים</h2>
          <p>
            האתר נבנה בטכנולוגיית React/Next.js ומיישם ניהול פוקוס, ARIA Roles ותיוגים סמנטיים כדי להנגיש אלמנטים דינמיים כגון מודאלים ותפריטים נפתחים באופן עקבי.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl text-white font-semibold">מגבלות ידועות</h2>
          <p>
            ייתכן כי רכיבי צד שלישי (כגון קישורים חיצוניים או תכנים מוטמעים) לא יהיו נגישים במלואם. אנו ממשיכים לשפר את הנגישות ונשמח לקבל דיווחים.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl text-white font-semibold">הסדרי נגישות פיזיים</h2>
          <p>
            השירות ניתן באופן דיגיטלי בלבד, ואין קבלת קהל או משרד פיזי לקבלת שירות.
          </p>
        </section>

        <section className="space-y-6 pt-6 border-t border-white/10">
          <h2 className="text-2xl text-white font-semibold underline decoration-purple-500 underline-offset-8 text-center md:text-right">
            רכז נגישות ודרכי התקשרות
          </h2>
          <p>
            למרות מאמצנו להנגיש את כלל דפי האתר, ייתכן שיתגלו חלקים שטרם הונגשו במלואם. אם נתקלתם בבעיה או שיש לכם הצעה לשיפור, נשמח לשמוע מכם. ניתן גם להשתמש בכפתור &quot;תעזור לנו להשתפר&quot; בתחתית האתר.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 flex flex-col items-center text-center gap-3">
              <User className="w-6 h-6 text-purple-400" />
              <span className="text-xs text-slate-500 uppercase tracking-widest">רכז נגישות</span>
              <span className="font-bold text-white">גל ששון</span>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 flex flex-col items-center text-center gap-3">
              <Mail className="w-6 h-6 text-purple-400" />
              <span className="text-xs text-slate-500 uppercase tracking-widest">אימייל</span>
              <span className="font-bold text-white">support@peroot.net</span>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 flex flex-col items-center text-center gap-3">
              <Phone className="w-6 h-6 text-purple-400" />
              <span className="text-xs text-slate-500 uppercase tracking-widest">זמן מענה</span>
              <span className="font-bold text-white">עד 48 שעות</span>
            </div>
          </div>
        </section>

        <footer className="pt-12 text-center text-sm text-slate-600">
          תאריך עדכון הצהרה: ינואר 2026
        </footer>
      </div>
    </main>
  );
}
