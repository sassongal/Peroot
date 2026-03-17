import type { Metadata } from "next";
import { pricingSchema, breadcrumbSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "תמחור - פירוט | שדרוג טקסטים בעברית עם AI",
  description: "השוו בין התוכניות של פירוט: חינם עם 2 קרדיטים ביום או Pro עם 150 קרדיטים בחודש. שדרוג פרומפטים וטקסטים בעברית עם AI. 4 ימי ניסיון חינם, רק ₪3.99/חודש.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "תמחור - פירוט | שדרוג טקסטים בעברית עם AI",
    description: "השוו בין התוכניות של פירוט: חינם עם 2 קרדיטים ביום או Pro עם 150 קרדיטים בחודש. שדרוג פרומפטים וטקסטים בעברית עם AI. 4 ימי ניסיון חינם, רק ₪3.99/חודש.",
    url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space"}/pricing`,
    siteName: "Peroot",
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "תמחור - פירוט | שדרוג טקסטים בעברית עם AI",
    description: "השוו בין התוכניות של פירוט: חינם או Pro. שדרוג פרומפטים בעברית עם AI. 4 ימי ניסיון חינם.",
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
            שמתחדשים אוטומטית בכל יום ב-14:00, גישה לספריית פרומפטים עם מעל 410 תבניות מקצועיות,
            אפשרות שיתוף, ותוסף Chrome לשדרוג מהיר מכל אתר.
            תוכנית Pro עולה 3.99 שקלים בחודש עם 4 ימי ניסיון חינם וכוללת 150 קרדיטים בחודש,
            גישה לכל המנועים המתקדמים, שיפור איטרטיבי מתקדם, ספריה אישית ומועדפים ללא הגבלה,
            תוסף Chrome עם סנכרון מלא לאתר, ותמיכה בעדיפות.
            כל שדרוג פרומפט עולה קרדיט אחד. ניתן לבטל בכל עת ללא התחייבות.
            התשלום מאובטח דרך Lemon Squeezy.
          </p>
        </section>
        <section>
          <h2>תוכנית חינם</h2>
          <ul>
            <li>2 קרדיטים ביום (מתחדשים ב-14:00)</li>
            <li>גישה לספריית 480+ פרומפטים מקצועיים</li>
            <li>שיתוף פרומפטים</li>
            <li>תוסף Chrome לשדרוג מהיר</li>
          </ul>
          <p>מחיר: ₪0 לתמיד</p>
        </section>
        <section>
          <h2>תוכנית Pro</h2>
          <ul>
            <li>150 קרדיטים בחודש</li>
            <li>גישה לכל המנועים המתקדמים</li>
            <li>שיפור איטרטיבי מתקדם</li>
            <li>ספריה אישית + מועדפים ללא הגבלה</li>
            <li>תוסף Chrome עם סנכרון מלא</li>
            <li>תמיכה בעדיפות</li>
          </ul>
          <p>מחיר: ₪3.99 לחודש, 4 ימי ניסיון חינם</p>
        </section>
        <section>
          <h2>מערכת הקרדיטים</h2>
          <p>
            כל שדרוג פרומפט ב-Peroot עולה קרדיט אחד. משתמשי חינם מקבלים 2 קרדיטים
            שמתחדשים כל יום. משתמשי Pro מקבלים 150 קרדיטים בחודש שמתחדשים עם כל חיוב.
            הקרדיטים תקפים גם באתר וגם בתוסף Chrome.
          </p>
        </section>
      </div>

      {children}
    </>
  );
}
