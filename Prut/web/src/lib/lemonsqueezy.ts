export const PLANS = {
  free: {
    name: "Free",
    nameHe: "חינם",
    creditsPerDay: 1,
    trialDays: 0,
    features: [
      "קרדיט אחד ליום (מתחדש כל 24 שעות)",
      "גישה לספריית 480+ פרומפטים",
      "שיתוף פרומפטים",
      "תוסף Chrome לשדרוג מהיר",
    ],
  },
  pro: {
    name: "Pro",
    nameHe: "פרו",
    creditsPerMonth: 150,
    price: 9.99, // ₪/month
    // ₪/year — two months free vs paying monthly (12 × 9.99 = 119.88). Shown in
    // the pricing UI ONLY when NEXT_PUBLIC_LEMONSQUEEZY_VARIANT_ID_YEARLY is set;
    // keep this value in sync with the LemonSqueezy yearly variant's price.
    priceYearly: 99.9,
    trialDays: 1,
    features: [
      "150 קרדיטים בחודש",
      "גישה לכל המנועים המתקדמים",
      "שיפור איטרטיבי מתקדם",
      "ספריה אישית + מועדפים ללא הגבלה",
      "תוסף Chrome עם סנכרון מלא",
      "תמיכה בעדיפות",
    ],
  },
} as const;
