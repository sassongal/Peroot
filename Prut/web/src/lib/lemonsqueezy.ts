import { lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js';

let isConfigured = false;

export function configureLemonSqueezy() {
  if (isConfigured) return;

  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  if (!apiKey) {
    throw new Error('Missing LEMONSQUEEZY_API_KEY environment variable');
  }

  lemonSqueezySetup({ apiKey });
  isConfigured = true;
}

export const PLANS = {
  free: {
    name: 'Free',
    nameHe: 'חינם',
    creditsPerDay: 2,
    trialDays: 0,
    features: [
      '2 קרדיטים ביום (מתחדשים ב-14:00)',
      'גישה לספריית 480+ פרומפטים',
      'שיתוף פרומפטים',
      'תוסף Chrome לשדרוג מהיר',
    ],
  },
  pro: {
    name: 'Pro',
    nameHe: 'פרו',
    creditsPerMonth: 150,
    price: 3.99, // ₪/month
    trialDays: 4,
    features: [
      '150 קרדיטים בחודש',
      'גישה לכל המנועים המתקדמים',
      'שיפור איטרטיבי מתקדם',
      'ספריה אישית + מועדפים ללא הגבלה',
      'תוסף Chrome עם סנכרון מלא',
      'תמיכה בעדיפות',
    ],
  },
} as const;
