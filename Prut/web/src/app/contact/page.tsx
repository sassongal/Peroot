import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail, Clock, MessageSquare } from "lucide-react";
import { ContactForm } from "@/components/ui/ContactForm";
import { breadcrumbSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "צור קשר | Peroot",
  description: "צור קשר עם צוות Peroot - שאלות טכניות, הצעות לשיפור, דיווח על באגים, או בקשות לשיתוף פעולה. זמן מענה ממוצע: עד 24 שעות.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "צור קשר | Peroot",
    description: "צור קשר עם צוות Peroot - שאלות, הצעות, דיווח על באגים. זמן מענה ממוצע: עד 24 שעות.",
    url: "/contact",
    siteName: "Peroot",
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "צור קשר | Peroot",
    description: "צור קשר עם צוות Peroot - שאלות, הצעות, דיווח על באגים.",
  },
};

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "דף הבית", url: "/" },
              { name: "צור קשר", url: "/contact" },
            ])
          ),
        }}
      />
      <main className="min-h-screen bg-black text-slate-300 font-sans p-6 md:p-12 lg:p-24" dir="rtl">
        <div className="max-w-2xl mx-auto space-y-8">
          <Link href="/" className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors mb-8">
            <ArrowRight className="w-4 h-4" />
            חזרה לדף הבית
          </Link>

          <h1 className="text-4xl md:text-5xl font-serif text-white mb-6">צור קשר</h1>

          <p className="text-lg text-slate-300 leading-relaxed">
            יש לכם שאלה על השימוש ב-Peroot? הצעה לשיפור? רוצים לדווח על באג?
            או אולי מעוניינים בשיתוף פעולה? אנחנו כאן בשבילכם.
          </p>

          {/* Response time info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white font-medium text-sm">זמן מענה</h3>
                <p className="text-slate-400 text-sm">עד 24 שעות בימי עסקים</p>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white font-medium text-sm">שפות מענה</h3>
                <p className="text-slate-400 text-sm">עברית ואנגלית</p>
              </div>
            </div>
          </div>

          <ContactForm />

          <div className="text-center pt-4">
            <p className="text-sm text-slate-500 mb-2">או שלחו מייל ישירות:</p>
            <a
              href="mailto:gal@joya-tech.net"
              className="inline-flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
            >
              <Mail className="w-4 h-4" />
              gal@joya-tech.net
            </a>
          </div>

          {/* FAQ Section */}
          <section className="border-t border-white/10 pt-8 space-y-6">
            <h2 className="text-2xl font-serif text-white">שאלות נפוצות</h2>

            <div className="space-y-4">
              <details className="group bg-white/5 border border-white/10 rounded-xl">
                <summary className="cursor-pointer p-4 text-white font-medium hover:text-amber-400 transition-colors list-none flex justify-between items-center">
                  מה ההבדל בין התוכנית החינמית ל-Pro?
                  <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-4 pb-4 text-slate-400 text-sm leading-relaxed">
                  התוכנית החינמית כוללת 2 קרדיטים ביום וגישה לספריית 480+ הפרומפטים.
                  תוכנית Pro (₪3.99/חודש) כוללת 150 קרדיטים בחודש, גישה לכל המנועים המתקדמים,
                  שיפור איטרטיבי, ספריה אישית ללא הגבלה, וסנכרון מלא עם תוסף Chrome.
                </div>
              </details>

              <details className="group bg-white/5 border border-white/10 rounded-xl">
                <summary className="cursor-pointer p-4 text-white font-medium hover:text-amber-400 transition-colors list-none flex justify-between items-center">
                  מה קורה כשנגמרים הקרדיטים?
                  <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-4 pb-4 text-slate-400 text-sm leading-relaxed">
                  בתוכנית החינמית, הקרדיטים מתאפסים כל יום בשעה 14:00. בתוכנית Pro,
                  150 הקרדיטים מתחדשים בתחילת כל חודש חיוב. אפשר תמיד לשדרג ל-Pro
                  באמצע חודש ולקבל מיד את מלוא הקרדיטים.
                </div>
              </details>

              <details className="group bg-white/5 border border-white/10 rounded-xl">
                <summary className="cursor-pointer p-4 text-white font-medium hover:text-amber-400 transition-colors list-none flex justify-between items-center">
                  איך מבטלים מנוי Pro?
                  <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-4 pb-4 text-slate-400 text-sm leading-relaxed">
                  ביטול מנוי הוא פשוט ומיידי — דרך דף ההגדרות באתר או במייל אלינו.
                  אין התחייבות, אין דמי ביטול. המנוי יישאר פעיל עד סוף תקופת החיוב הנוכחית.
                </div>
              </details>

              <details className="group bg-white/5 border border-white/10 rounded-xl">
                <summary className="cursor-pointer p-4 text-white font-medium hover:text-amber-400 transition-colors list-none flex justify-between items-center">
                  האם הפרומפטים שנוצרים שייכים לי?
                  <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-4 pb-4 text-slate-400 text-sm leading-relaxed">
                  כן, באופן מלא. כל פרומפט שאתם יוצרים או משדרגים עם Peroot שייך לכם לחלוטין.
                  אתם יכולים להשתמש בו, לשתף אותו, או לשנות אותו בכל דרך שתרצו.
                </div>
              </details>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
