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
