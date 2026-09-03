import { PROMPT_LIBRARY_COUNT } from "./constants";
import { PRO_MONTHLY_CREDITS, creditsPhrase } from "@/lib/quota-policy";

export const PLANS = {
  free: {
    name: "Free",
    nameHe: "חינם",
    trialDays: 0,
    // The daily allowance is a live setting, not a plan term, so it is NOT
    // listed here. Render the free bullets with freePlanFeatures() below.
    features: [
      "שדרוג עם ציון איכות ושאלות דיוק",
      "ארבע שפות פלט: עברית, אנגלית, ערבית, רוסית",
      "צירוף קבצים, תמונות וקישורים לפרומפט",
      `ספריית ${PROMPT_LIBRARY_COUNT} פרומפטים ותבניות עם משתנים`,
      "ספרייה אישית, זיכרון AI ופרופיל סגנון",
      "תוסף Chrome: שדרוג ישירות בתוך ChatGPT, Claude ו-Gemini",
    ],
  },
  pro: {
    name: "Pro",
    nameHe: "פרו",
    creditsPerMonth: PRO_MONTHLY_CREDITS,
    price: 9.99, // ₪/month
    // ₪/year — two months free vs paying monthly (12 × 9.99 = 119.88). Shown in
    // the pricing UI ONLY when NEXT_PUBLIC_LEMONSQUEEZY_VARIANT_ID_YEARLY is set;
    // keep this value in sync with the LemonSqueezy yearly variant's price.
    priceYearly: 99.9,
    trialDays: 1,
    features: [
      `${PRO_MONTHLY_CREDITS} קרדיטים בחודש, בלי מכסה יומית`,
      "כל המצבים: מחקר מעמיק, תמונה, וידאו וסוכני AI",
      "כל המצבים גם בתוסף Chrome",
      "העתקה בלי חתימת Peroot",
      "יום ניסיון במתנה",
      "תמיכה אישית במייל, מענה תוך יום עסקים",
    ],
  },
} as const;

/**
 * Free-plan bullets for the pricing UI, with the live daily allowance first.
 * Pass the value from `useSiteSettings()` (client) or `getQuotaPolicy()` (server).
 */
export function freePlanFeatures(freeDaily: number): string[] {
  return [`${creditsPhrase(freeDaily)} ליום (מתחדשים כל 24 שעות)`, ...PLANS.free.features];
}
