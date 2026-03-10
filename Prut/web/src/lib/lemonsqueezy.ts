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
    promptsPerDay: 3,
    features: [
      '3 פרומפטים ביום',
      'גישה לספריית פרומפטים',
      'שיתוף פרומפטים',
    ],
  },
  pro: {
    name: 'Pro',
    nameHe: 'פרו',
    promptsPerDay: Infinity,
    price: 3.99, // ₪/month
    features: [
      'פרומפטים ללא הגבלה',
      'גישה לכל המנועים',
      'שיפור איטרטיבי מתקדם',
      'שמירה לספריה אישית ללא הגבלה',
      'תמיכה בעדיפות',
    ],
  },
} as const;
