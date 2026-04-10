import { escapeHtml, emailLayoutBrandedInternal } from './base';

/**
 * Admin alert for churn events — sent to the admin when a pro user cancels.
 * Used by both the LemonSqueezy webhook and the sync-subscriptions cron.
 */
export function adminChurnAlertEmail(params: {
  customerName: string;
  customerEmail: string;
  userId: string;
  status: string;
}): string {
  const { customerName, customerEmail, userId, status } = params;
  return emailLayoutBrandedInternal(`
    <h2 style="color: #dc2626; font-size: 20px; font-weight: 800; margin: 0 0 16px;">משתמש/ת יצא/ה ממנוי Pro</h2>
    <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:6px 0;color:#64748b;font-weight:700;width:88px;">שם</td><td style="padding:6px 0;">${escapeHtml(customerName)}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;font-weight:700;">אימייל</td><td style="padding:6px 0;direction:ltr;text-align:right;">${escapeHtml(customerEmail)}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;font-weight:700;">מזהה</td><td style="padding:6px 0;direction:ltr;text-align:right;font-size:12px;">${escapeHtml(userId)}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;font-weight:700;">סטטוס</td><td style="padding:6px 0;">${escapeHtml(status)}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;font-weight:700;">זמן</td><td style="padding:6px 0;direction:ltr;">${escapeHtml(new Date().toISOString())}</td></tr>
    </table>
  `);
}

/**
 * Simple admin alert for cron-detected churn (sync-subscriptions).
 */
export function adminCronChurnAlertEmail(params: {
  customerEmail: string;
  userId: string;
}): string {
  const { customerEmail, userId } = params;
  return emailLayoutBrandedInternal(`
    <p style="margin:0;font-size:15px;line-height:1.6;">
      סנכרון מנויים (cron) תיקן משתמש/ת Pro שפג תוקף. מזהה: <strong style="direction:ltr;display:inline-block;">${escapeHtml(userId)}</strong><br/>
      אימייל: <strong style="direction:ltr;display:inline-block;">${escapeHtml(customerEmail || '—')}</strong>
    </p>
  `);
}
