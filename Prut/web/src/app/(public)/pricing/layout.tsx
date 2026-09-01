import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { pricingSchema, breadcrumbSchema, faqSchema } from "@/lib/schema";
import { PLANS } from "@/lib/lemonsqueezy";
import { PROMPT_LIBRARY_COUNT } from "@/lib/constants";
import { getQuotaPolicy } from "@/lib/quota-server";
import { PRO_MONTHLY_CREDITS, creditsPhrase, dailyCreditsPhrase } from "@/lib/quota-policy";

// The free allowance appears eleven times on this page, in metadata, JSON-LD
// and the crawlable copy. It used to be written out as "קרדיט אחד ביום" in each
// of them, which is how the page ended up advertising a quota the product no
// longer gave. Everything below now derives from the live setting.
export async function generateMetadata(): Promise<Metadata> {
  const { freeDaily } = await getQuotaPolicy();
  const free = dailyCreditsPhrase(freeDaily);
  const pro = creditsPhrase(PRO_MONTHLY_CREDITS);
  const title = "תמחור - פירוט | שדרוג טקסטים בעברית עם AI";
  const description = `השוו בין התוכניות של פירוט: חינם עם ${free} או Pro עם ${pro} בחודש. שדרוג פרומפטים וטקסטים בעברית עם AI. יום ניסיון במתנה לתוכנית Pro.`;

  return {
    title,
    description,
    alternates: { canonical: "/pricing" },
    openGraph: {
      title,
      description,
      url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space"}/pricing`,
      siteName: "Peroot",
      locale: "he_IL",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description:
        "השוו בין התוכניות של פירוט: חינם או Pro. שדרוג פרומפטים בעברית עם AI. יום ניסיון במתנה.",
    },
  };
}

export default async function PricingLayout({ children }: { children: React.ReactNode }) {
  const { freeDaily } = await getQuotaPolicy();
  const freeDailyPhrase = dailyCreditsPhrase(freeDaily);
  const proCredits = creditsPhrase(PRO_MONTHLY_CREDITS);

  return (
    <>
      <JsonLd data={pricingSchema(freeDaily)} />
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
            answer: `Peroot מציע תוכנית חינמית עם ${freeDailyPhrase}, ותוכנית Pro עם ${proCredits} בחודש. יש יום ניסיון במתנה ל-Pro.`,
          },
          {
            question: "מה ההבדל בין חינם ל-Pro?",
            answer: `התוכנית החינמית כוללת ${freeDailyPhrase} ומודלים בסיסיים. Pro כוללת ${proCredits} בחודש, מודלים פרימיום, שיפור איטרטיבי, וספרייה אישית ללא הגבלה.`,
          },
          {
            question: "איך מערכת הקרדיטים עובדת?",
            answer: `כל שדרוג פרומפט עולה קרדיט אחד. בחינם מקבלים ${creditsPhrase(freeDaily)} שמתחדשים כל 24 שעות מהשימוש האחרון. ב-Pro מקבלים ${proCredits} שמתחדשים בתחילת כל חודש חיוב.`,
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
            Peroot מציע שתי תוכניות: חינם ו-Pro. התוכנית החינמית כוללת {freeDailyPhrase} שמתחדשים
            אוטומטית כל 24 שעות מהשימוש האחרון, גישה לספריית פרומפטים עם מעל {PROMPT_LIBRARY_COUNT}{" "}
            תבניות מקצועיות, אפשרות שיתוף, ותוסף Chrome לשדרוג מהיר מכל אתר. תוכנית Pro כוללת יום
            ניסיון במתנה ו{proCredits} בחודש, גישה לכל המנועים המתקדמים, שיפור איטרטיבי מתקדם,
            ספרייה אישית ומועדפים ללא הגבלה, תוסף Chrome עם סנכרון מלא לאתר, ותמיכה בעדיפות. כל
            שדרוג פרומפט עולה קרדיט אחד. ניתן לבטל בכל עת ללא התחייבות. התשלום מאובטח דרך Lemon
            Squeezy.
          </p>
        </section>
        <section>
          <h2>תוכנית חינם</h2>
          <ul>
            <li>{creditsPhrase(freeDaily)} ליום (מתחדשים כל 24 שעות)</li>
            <li>גישה לספריית {PROMPT_LIBRARY_COUNT} פרומפטים מקצועיים</li>
            <li>שיתוף פרומפטים</li>
            <li>תוסף Chrome לשדרוג מהיר</li>
          </ul>
          <p>מחיר: ₪0 לתמיד</p>
        </section>
        <section>
          <h2>תוכנית Pro</h2>
          <ul>
            <li>{proCredits} בחודש</li>
            <li>גישה לכל המנועים המתקדמים</li>
            <li>שיפור איטרטיבי מתקדם</li>
            <li>ספרייה אישית + מועדפים ללא הגבלה</li>
            <li>תוסף Chrome עם סנכרון מלא</li>
            <li>תמיכה בעדיפות</li>
          </ul>
          <p>מחיר: ₪{PLANS.pro.price} לחודש. יום ניסיון במתנה</p>
        </section>
        <section>
          <h2>מערכת הקרדיטים</h2>
          <p>
            כל שדרוג פרומפט ב-Peroot עולה קרדיט אחד. משתמשי חינם מקבלים {creditsPhrase(freeDaily)}{" "}
            שמתחדשים כל יום. משתמשי Pro מקבלים {proCredits} בחודש שמתחדשים עם כל חיוב. הקרדיטים
            תקפים גם באתר וגם בתוסף Chrome.
          </p>
        </section>
      </div>

      {children}
    </>
  );
}
