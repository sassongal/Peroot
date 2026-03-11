import type { Metadata } from "next";
import { pricingSchema, breadcrumbSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "תוכניות ומחירים - Peroot",
  description: "שדרגו לפרומפטים ללא הגבלה עם Peroot Pro. השוואת תוכניות: חינם ו-Pro עם 150 קרדיטים בחודש.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "תוכניות ומחירים - Peroot",
    description: "שדרגו לפרומפטים ללא הגבלה עם Peroot Pro. השוואת תוכניות: חינם ו-Pro עם 150 קרדיטים בחודש.",
    url: "/pricing",
    siteName: "Peroot",
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "תוכניות ומחירים - Peroot",
    description: "שדרגו לפרומפטים ללא הגבלה עם Peroot Pro.",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingSchema()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "דף הבית", url: "/" },
              { name: "תוכניות ומחירים", url: "/pricing" },
            ])
          ),
        }}
      />

      {/* Server-rendered pricing content for AI crawlers */}
      <div className="sr-only" aria-hidden="false">
        <h1>תוכניות ומחירים - Peroot</h1>
        <section>
          <h2>כמה עולה Peroot?</h2>
          <p>
            Peroot מציע שתי תוכניות: חינם ו-Pro. התוכנית החינמית כוללת 2 קרדיטים ביום
            שמתחדשים אוטומטית, גישה לספריית פרומפטים עם מעל 410 תבניות, ואפשרות שיתוף.
            תוכנית Pro עולה 3.99 שקלים בחודש וכוללת 150 קרדיטים בחודש, גישה לכל המנועים,
            שיפור איטרטיבי מתקדם, ספריה אישית ללא הגבלה ותמיכה בעדיפות.
            ניתן לבטל בכל עת ללא התחייבות. התשלום מאובטח דרך Lemon Squeezy.
          </p>
        </section>
        <section>
          <h2>תוכנית חינם</h2>
          <ul>
            <li>2 קרדיטים ביום (מתחדשים ב-14:00)</li>
            <li>גישה לספריית פרומפטים</li>
            <li>שיתוף פרומפטים</li>
          </ul>
          <p>מחיר: ₪0 לתמיד</p>
        </section>
        <section>
          <h2>תוכנית Pro</h2>
          <ul>
            <li>150 קרדיטים בחודש</li>
            <li>גישה לכל המנועים</li>
            <li>שיפור איטרטיבי מתקדם</li>
            <li>שמירה לספריה אישית ללא הגבלה</li>
            <li>תמיכה בעדיפות</li>
          </ul>
          <p>מחיר: ₪3.99 לחודש</p>
        </section>
      </div>

      {children}
    </>
  );
}
