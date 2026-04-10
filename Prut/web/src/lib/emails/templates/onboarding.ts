import { emailLayoutBranded, escapeHtml } from './base';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.peroot.space';

export interface OnboardingStep {
  id: string;
  delayHours: number;
  subject: string;
  html: (name: string, unsubscribeUrl: string, referralCode?: string) => string;
}

/**
 * Single welcome mail — product policy: no multi-day onboarding drip.
 * Cron still respects delayHours (0) for edge cases; primary send is on signup (auth callback).
 */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'onboarding_welcome',
    delayHours: 0,
    subject: 'ברוכים הבאים ל-Peroot',
    html: (name, unsubscribeUrl) => {
      const displayName = escapeHtml(name?.trim() || 'שם');
      return emailLayoutBranded(`
      <p style="margin: 0 0 8px; font-size: 15px; color: #64748b;">היי <strong style="color: #0f172a;">${displayName}</strong>,</p>
      <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">שמחים שהצטרפתם</h1>
      <p style="margin: 0 0 20px; font-size: 15px; color: #334155;">
        <strong>Peroot</strong> היא מערכת לניהול פרומפטים וזרימות עבודה עם בינה מלאכותית — כדי שתעבדו מהר יותר, בצורה עקבית, ועם תוצאות איכותיות יותר.
      </p>

      <div style="margin: 24px 0;">
        <p style="margin: 0 0 12px; font-size: 13px; font-weight: 800; color: #92400e; text-transform: uppercase; letter-spacing: 0.06em;">מה אפשר לעשות כאן</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="padding: 14px 16px; background: #fffbeb; border-radius: 12px; border: 1px solid #fde68a;">
              <strong style="color: #b45309;">ספריית פרומפטים</strong>
              <p style="margin: 8px 0 0; font-size: 14px; color: #78350f;">שמרו, ארגנו ושתפו פרומפטים — לעצמכם או לצוות.</p>
            </td>
          </tr>
          <tr><td style="height:10px;"></td></tr>
          <tr>
            <td style="padding: 14px 16px; background: #eff6ff; border-radius: 12px; border: 1px solid #bfdbfe;">
              <strong style="color: #1d4ed8;">שרשראות (chains)</strong>
              <p style="margin: 8px 0 0; font-size: 14px; color: #1e3a8a;">חברו כמה שלבים ברצף — הפלט של אחד הופך לקלט של הבא.</p>
            </td>
          </tr>
          <tr><td style="height:10px;"></td></tr>
          <tr>
            <td style="padding: 14px 16px; background: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0;">
              <strong style="color: #15803d;">מנועים שונים</strong>
              <p style="margin: 8px 0 0; font-size: 14px; color: #14532d;">מצב סטנדרט, חקר, תמונות, סוכנים ועוד — לפי סוג המשימה.</p>
            </td>
          </tr>
          <tr><td style="height:10px;"></td></tr>
          <tr>
            <td style="padding: 14px 16px; background: #faf5ff; border-radius: 12px; border: 1px solid #e9d5ff;">
              <strong style="color: #7c3aed;">קרדיטים</strong>
              <p style="margin: 8px 0 0; font-size: 14px; color: #5b21b6;">בחינם קיבלתם קרדיטים להתחיל; ב-Pro — מכסה חודשית גדולה יותר.</p>
            </td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin-top: 28px;">
        <a href="${APP_URL}/prompts" style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #eab308); color: #0a0a0a; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 15px;">כניסה ישירה לאפליקציה</a>
      </div>
      <p style="margin: 20px 0 0; font-size: 13px; color: #64748b; text-align: center;">
        נתראה בפנים — ואם משהו לא ברור, פשוט תשיבו על המייל.
      </p>
    `, unsubscribeUrl);
    },
  },
];
