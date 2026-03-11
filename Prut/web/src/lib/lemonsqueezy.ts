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
    features: [
      '2 קרדיטים ביום (מתחדשים ב-14:00)',
      'גישה לספריית פרומפטים',
      'שיתוף פרומפטים',
    ],
  },
  pro: {
    name: 'Pro',
    nameHe: 'פרו',
    creditsPerMonth: 150,
    price: 3.99, // ₪/month
    features: [
      '150 קרדיטים בחודש',
      'גישה לכל המנועים',
      'שיפור איטרטיבי מתקדם',
      'שמירה לספריה אישית ללא הגבלה',
      'תמיכה בעדיפות',
    ],
  },
} as const;
