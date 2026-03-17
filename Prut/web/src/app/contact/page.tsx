import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail, Clock, MessageSquare } from "lucide-react";
import { PageHeading } from "@/components/ui/PageHeading";
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
      <main className="min-h-screen bg-background text-foreground font-sans p-6 md:p-12 lg:p-24" dir="rtl">
        <div className="max-w-2xl mx-auto space-y-8">
          <Link href="/" className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 transition-colors mb-8">
            <ArrowRight className="w-4 h-4" />
            חזרה לדף הבית
          </Link>

          <PageHeading title="צור קשר" align="start" />

          <p className="text-lg text-foreground leading-relaxed">
            יש לכם שאלה על השימוש ב-Peroot? הצעה לשיפור? רוצים לדווח על באג?
            או אולי מעוניינים בשיתוף פעולה? אנחנו כאן בשבילכם.
          </p>

          {/* Response time info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-secondary border border-border rounded-xl p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-foreground font-medium text-sm">זמן מענה</h3>
                <p className="text-muted-foreground text-sm">עד 24 שעות בימי עסקים</p>
              </div>
            </div>
            <div className="bg-secondary border border-border rounded-xl p-4 flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-foreground font-medium text-sm">שפות מענה</h3>
                <p className="text-muted-foreground text-sm">עברית ואנגלית</p>
              </div>
            </div>
          </div>

          <ContactForm />

          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground mb-2">או שלחו מייל ישירות:</p>
            <a
              href="mailto:gal@joya-tech.net"
              className="inline-flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 transition-colors"
            >
              <Mail className="w-4 h-4" />
              gal@joya-tech.net
            </a>
          </div>

          {/* FAQ Section */}
          <section className="border-t border-border pt-8 space-y-6">
            <h2 className="text-2xl font-serif text-foreground">שאלות נפוצות</h2>

            <div className="space-y-4">
              <details className="group bg-secondary border border-border rounded-xl">
                <summary className="cursor-pointer p-4 text-foreground font-medium hover:text-amber-600 dark:hover:text-amber-400 transition-colors list-none flex justify-between items-center">
                  מה ההבדל בין התוכנית החינמית ל-Pro?
                  <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-4 pb-4 text-muted-foreground text-sm leading-relaxed">
                  התוכנית החינמית כוללת 2 קרדיטים ביום וגישה לספריית 480+ הפרומפטים.
                  תוכנית Pro (₪3.99/חודש) כוללת 150 קרדיטים בחודש, גישה לכל המנועים המתקדמים,
                  שיפור איטרטיבי, ספריה אישית ללא הגבלה, וסנכרון מלא עם תוסף Chrome.
                </div>
              </details>

              <details className="group bg-secondary border border-border rounded-xl">
                <summary className="cursor-pointer p-4 text-foreground font-medium hover:text-amber-600 dark:hover:text-amber-400 transition-colors list-none flex justify-between items-center">
                  מה קורה כשנגמרים הקרדיטים?
                  <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-4 pb-4 text-muted-foreground text-sm leading-relaxed">
                  בתוכנית החינמית, הקרדיטים מתאפסים כל יום בשעה 14:00. בתוכנית Pro,
                  150 הקרדיטים מתחדשים בתחילת כל חודש חיוב. אפשר תמיד לשדרג ל-Pro
                  באמצע חודש ולקבל מיד את מלוא הקרדיטים.
                </div>
              </details>

              <details className="group bg-secondary border border-border rounded-xl">
                <summary className="cursor-pointer p-4 text-foreground font-medium hover:text-amber-600 dark:hover:text-amber-400 transition-colors list-none flex justify-between items-center">
                  איך מבטלים מנוי Pro?
                  <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-4 pb-4 text-muted-foreground text-sm leading-relaxed">
                  ביטול מנוי הוא פשוט ומיידי - דרך דף ההגדרות באתר או במייל אלינו.
                  אין התחייבות, אין דמי ביטול. המנוי יישאר פעיל עד סוף תקופת החיוב הנוכחית.
                </div>
              </details>

              <details className="group bg-secondary border border-border rounded-xl">
                <summary className="cursor-pointer p-4 text-foreground font-medium hover:text-amber-600 dark:hover:text-amber-400 transition-colors list-none flex justify-between items-center">
                  האם הפרומפטים שנוצרים שייכים לי?
                  <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-4 pb-4 text-muted-foreground text-sm leading-relaxed">
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
