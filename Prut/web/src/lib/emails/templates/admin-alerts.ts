import { escapeHtml } from './base';

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
  return `<div dir="rtl" style="font-family: sans-serif;">
                <h2 style="color: #ef4444;">משתמש ביטל מנוי Pro</h2>
                <p><strong>שם:</strong> ${escapeHtml(customerName)}</p>
                <p><strong>אימייל:</strong> ${escapeHtml(customerEmail)}</p>
                <p><strong>ID:</strong> ${escapeHtml(userId)}</p>
                <p><strong>סטטוס:</strong> ${escapeHtml(status)}</p>
                <p><strong>זמן:</strong> ${new Date().toISOString()}</p>
              </div>`;
}

/**
 * Simple admin alert for cron-detected churn (sync-subscriptions).
 */
export function adminCronChurnAlertEmail(params: {
  customerEmail: string;
  userId: string;
}): string {
  const { customerEmail, userId } = params;
  return `<p>Stale pro user fixed by sync-subscriptions cron. User: ${escapeHtml(customerEmail || userId)}</p>`;
}
