import { escapeHtml, emailLayoutBranded } from './base';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.peroot.space';

/**
 * Churn email — sent when a pro user's subscription ends (cancelled/expired).
 * Event-driven, not part of the time-based reengagement sequence.
 */
export function churnEmail(
  name: string,
  unsubscribeUrl: string,
): { subject: string; html: string } {
  return {
    subject: 'נשמח לראות אותך שוב ב-Peroot',
    html: emailLayoutBranded(`
      <h2 style="color: #ef4444; font-size: 22px;">היי ${escapeHtml(name)}</h2>
      <p>קיבלנו את בקשתך לביטול מנוי ה-Pro. עצוב לנו לראות אותך עוזב/ת!</p>
      <div style="background: #fef2f2; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <p style="font-weight: bold; margin: 0 0 8px 0;">מה שעדיין זמין לך בתוכנית החינם:</p>
        <ul style="margin: 0; padding: 0 20px; font-size: 14px;">
          <li>2 קרדיטים ביום (מתחדשים ב-14:00)</li>
          <li>גישה לספריית הפרומפטים</li>
          <li>שיתוף פרומפטים</li>
        </ul>
      </div>
      <p>אם תרצו לחזור, תמיד אפשר לשדרג מחדש בלחיצת כפתור.</p>
      <div style="text-align: center; margin-top: 30px;">
        <a href="${APP_URL}/pricing" style="background: linear-gradient(135deg, #f59e0b, #eab308); color: #000; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold;">חזרו לשדרג</a>
      </div>
    `, unsubscribeUrl, 'הסרה מעדכוני מנוי והצעות'),
  };
}
