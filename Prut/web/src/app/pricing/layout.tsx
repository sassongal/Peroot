import type { Metadata } from "next";
import { pricingSchema, breadcrumbSchema, faqSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "תמחור - פירוט | שדרוג טקסטים בעברית עם AI",
  description: "השוו בין התוכניות של פירוט: חינם עם 2 קרדיטים ביום או Pro עם 150 קרדיטים בחודש. שדרוג פרומפטים וטקסטים בעברית עם AI. מחיר השקה ₪3.99 במקום ₪9.99 - עד 1 במאי!",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "תמחור - פירוט | שדרוג טקסטים בעברית עם AI",
    description: "השוו בין התוכניות של פירוט: חינם עם 2 קרדיטים ביום או Pro עם 150 קרדיטים בחודש. שדרוג פרומפטים וטקסטים בעברית עם AI. מחיר השקה ₪3.99 במקום ₪9.99 - עד 1 במאי!",
    url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space"}/pricing`,
    siteName: "Peroot",
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "תמחור - פירוט | שדרוג טקסטים בעברית עם AI",
    description: "השוו בין התוכניות של פירוט: חינם או Pro. שדרוג פרומפטים בעברית עם AI. יום ניסיון במתנה.",
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

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            faqSchema([
              { question: "כמה עולה Peroot?", answer: "Peroot מציע תוכנית חינמית עם 2 קרדיטים ביום, ותוכנית Pro במחיר השקה - רק 3.99 שקלים בחודש במקום 9.99 שקלים, עם 150 קרדיטים. מחיר ההשקה תקף עד 1 במאי 2026. יש יום ניסיון במתנה ל-Pro." },
              { question: "מה ההבדל בין חינם ל-Pro?", answer: "התוכנית החינמית כוללת 2 קרדיטים ביום ומודלים בסיסיים. Pro כוללת 150 קרדיטים בחודש, מודלים פרימיום, שיפור איטרטיבי, וספריה אישית ללא הגבלה." },
              { question: "איך מערכת הקרדיטים עובדת?", answer: "כל שדרוג פרומפט עולה קרדיט אחד. בחינם מקבלים 2 קרדיטים שמתחדשים כל יום ב-14:00. ב-Pro מקבלים 150 קרדיטים שמתחדשים בתחילת כל חודש חיוב." },
              { question: "אפשר לבטל את המנוי?", answer: "כן, ביטול מנוי Pro הוא מיידי ללא דמי ביטול. המנוי נשאר פעיל עד סוף תקופת החיוב הנוכחית." },
              { question: "האם יש ניסיון חינם?", answer: "כן, תוכנית Pro כוללת יום ניסיון במתנה. ללא צורך בכרטיס אשראי לתוכנית החינמית." },
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
            תוכנית Pro במחיר השקה עולה רק 3.99 שקלים בחודש במקום 9.99 שקלים (מחיר ההשקה תקף עד 1 במאי 2026), עם יום ניסיון במתנה וכוללת 150 קרדיטים בחודש,
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
          <p>מחיר: מחיר השקה ₪3.99 לחודש (במקום ₪9.99), תקף עד 1 במאי 2026. יום ניסיון במתנה</p>
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
