import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { pricingSchema, breadcrumbSchema, faqSchema } from "@/lib/schema";
import { PLANS } from "@/lib/lemonsqueezy";

export const metadata: Metadata = {
  title: "תמחור - פירוט | שדרוג טקסטים בעברית עם AI",
  description:
    "השוו בין התוכניות של פירוט: חינם עם קרדיט אחד ביום או Pro עם 150 קרדיטים בחודש. שדרוג פרומפטים וטקסטים בעברית עם AI. יום ניסיון במתנה לתוכנית Pro.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "תמחור - פירוט | שדרוג טקסטים בעברית עם AI",
    description:
      "השוו בין התוכניות של פירוט: חינם עם קרדיט אחד ביום או Pro עם 150 קרדיטים בחודש. שדרוג פרומפטים וטקסטים בעברית עם AI. יום ניסיון במתנה לתוכנית Pro.",
    url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space"}/pricing`,
    siteName: "Peroot",
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "תמחור - פירוט | שדרוג טקסטים בעברית עם AI",
    description:
      "השוו בין התוכניות של פירוט: חינם או Pro. שדרוג פרומפטים בעברית עם AI. יום ניסיון במתנה.",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={pricingSchema()} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "דף הבית", url: "/" },
          { name: "תוכניות ומחירים", url: "/pricing" },
        ])}
      />

      <JsonLd
        data={faqSchema([
          {
            question: "כמה עולה Peroot?",
            answer:
              "Peroot מציע תוכנית חינמית עם קרדיט אחד ביום, ותוכנית Pro עם 150 קרדיטים בחודש. יש יום ניסיון במתנה ל-Pro.",
          },
          {
            question: "מה ההבדל בין חינם ל-Pro?",
            answer:
              "התוכנית החינמית כוללת קרדיט אחד ביום ומודלים בסיסיים. Pro כוללת 150 קרדיטים בחודש, מודלים פרימיום, שיפור איטרטיבי, וספריה אישית ללא הגבלה.",
          },
          {
            question: "איך מערכת הקרדיטים עובדת?",
            answer:
              "כל שדרוג פרומפט עולה קרדיט אחד. בחינם מקבלים קרדיט אחד שמתחדש כל 24 שעות מהשימוש האחרון. ב-Pro מקבלים 150 קרדיטים שמתחדשים בתחילת כל חודש חיוב.",
          },
          {
            question: "אפשר לבטל את המנוי?",
            answer:
              "כן, ביטול מנוי Pro הוא מיידי ללא דמי ביטול. המנוי נשאר פעיל עד סוף תקופת החיוב הנוכחית.",
          },
          {
            question: "האם יש ניסיון חינם?",
            answer: "כן, תוכנית Pro כוללת יום ניסיון במתנה. ללא צורך בכרטיס אשראי לתוכנית החינמית.",
          },
        ])}
      />

      {/* Server-rendered pricing content for AI crawlers */}
      <div className="sr-only" aria-hidden="false">
        <h1>תוכניות ומחירים - Peroot</h1>
        <section>
          <h2>כמה עולה Peroot?</h2>
          <p>
            Peroot מציע שתי תוכניות: חינם ו-Pro. התוכנית החינמית כוללת קרדיט אחד ביום שמתחדש
            אוטומטית כל 24 שעות מהשימוש האחרון, גישה לספריית פרומפטים עם מעל 410 תבניות מקצועיות,
            אפשרות שיתוף, ותוסף Chrome לשדרוג מהיר מכל אתר. תוכנית Pro כוללת יום ניסיון במתנה ו-150
            קרדיטים בחודש, גישה לכל המנועים המתקדמים, שיפור איטרטיבי מתקדם, ספריה אישית ומועדפים ללא
            הגבלה, תוסף Chrome עם סנכרון מלא לאתר, ותמיכה בעדיפות. כל שדרוג פרומפט עולה קרדיט אחד.
            ניתן לבטל בכל עת ללא התחייבות. התשלום מאובטח דרך Lemon Squeezy.
          </p>
        </section>
        <section>
          <h2>תוכנית חינם</h2>
          <ul>
            <li>קרדיט אחד ליום (מתחדש כל 24 שעות)</li>
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
          <p>מחיר: ₪{PLANS.pro.price} לחודש. יום ניסיון במתנה</p>
        </section>
        <section>
          <h2>מערכת הקרדיטים</h2>
          <p>
            כל שדרוג פרומפט ב-Peroot עולה קרדיט אחד. משתמשי חינם מקבלים קרדיט אחד שמתחדש כל יום.
            משתמשי Pro מקבלים 150 קרדיטים בחודש שמתחדשים עם כל חיוב. הקרדיטים תקפים גם באתר וגם
            בתוסף Chrome.
          </p>
        </section>
      </div>

      {children}
    </>
  );
}
