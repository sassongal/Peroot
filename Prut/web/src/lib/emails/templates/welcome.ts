import { escapeHtml, emailLayoutBrandedInternal } from './base';

const brandBtn =
  'display:inline-block;background:linear-gradient(135deg,#f59e0b,#eab308);color:#0a0a0a;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:800;font-size:15px;';

/**
 * Welcome email — preset from EmailService.sendWelcome (optional flow).
 */
export function welcomeEmail(params: {
  name?: string;
  appUrl: string;
}): string {
  const { name, appUrl } = params;
  const safeUrl = escapeHtml(appUrl.replace(/\/$/, ''));
  return emailLayoutBrandedInternal(`
    <h1 style="color: #0f172a; font-size: 22px; font-weight: 800; margin: 0 0 12px; letter-spacing: -0.02em;">
      היי ${escapeHtml(name || 'שם')} — ברוכים הבאים ל-Peroot
    </h1>
    <p style="font-size: 15px; color: #334155; margin: 0 0 16px;">
      אנחנו כאן כדי לעזור לך לנהל פרומפטים וזרימות עבודה עם בינה מלאכותית — מהר יותר, בעקביות, ובאיכות גבוהה יותר.
    </p>
    <ul style="margin: 0; padding: 0 20px 0 0; font-size: 14px; color: #475569; line-height: 1.7;">
      <li style="margin-bottom: 10px;"><strong style="color: #0f172a;">ספריית פרומפטים</strong> — שמירה, ארגון ושיתוף</li>
      <li style="margin-bottom: 10px;"><strong style="color: #0f172a;">שרשראות</strong> — זרימות רב-שלביות</li>
      <li style="margin-bottom: 10px;"><strong style="color: #0f172a;">מנועים</strong> — מצבים שונים לפי סוג המשימה</li>
    </ul>
    <div style="text-align: center; margin-top: 28px;">
      <a href="${safeUrl}/prompts" style="${brandBtn}">כניסה לספרייה</a>
    </div>
  `);
}
