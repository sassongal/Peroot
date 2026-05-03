import { escapeHtml, emailLayoutBrandedInternal } from "./base";

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
      אימייל: <strong style="direction:ltr;display:inline-block;">${escapeHtml(customerEmail || "—")}</strong>
    </p>
  `);
}

/**
 * Admin alert summarising anomalies found during LemonSqueezy API cross-check.
 * Sent at most once per cron run and only when anomalies exist.
 */
export function adminLsAnomalyAlertEmail(params: {
  ghostProUsers: Array<{ userId: string; email: string; subId: string }>;
  duplicateCustomers: Array<{ customerId: string; email: string; subIds: string[] }>;
  mismatchedUsers: Array<{ userId: string; email: string; dbStatus: string; lsStatus: string }>;
}): string {
  const { ghostProUsers, duplicateCustomers, mismatchedUsers } = params;

  const renderRows = (rows: string[]) => rows.join("");

  const ghostSection = ghostProUsers.length
    ? `<h3 style="color:#dc2626;margin:16px 0 8px;">Pro ב-DB ללא מנוי פעיל ב-LS (${ghostProUsers.length})</h3>
       <table role="presentation" style="width:100%;border-collapse:collapse;font-size:13px;">
         <tr style="background:#fee2e2;"><td style="padding:4px 8px;font-weight:700;">UserId</td><td style="padding:4px 8px;font-weight:700;">Email</td><td style="padding:4px 8px;font-weight:700;">Sub ID</td></tr>
         ${renderRows(ghostProUsers.map((u) => `<tr><td style="padding:4px 8px;direction:ltr;">${escapeHtml(u.userId)}</td><td style="padding:4px 8px;direction:ltr;">${escapeHtml(u.email)}</td><td style="padding:4px 8px;direction:ltr;">${escapeHtml(u.subId)}</td></tr>`))}
       </table>`
    : "";

  const dupSection = duplicateCustomers.length
    ? `<h3 style="color:#d97706;margin:16px 0 8px;">לקוחות עם מספר מנויים פעילים ב-LS (${duplicateCustomers.length})</h3>
       <table role="presentation" style="width:100%;border-collapse:collapse;font-size:13px;">
         <tr style="background:#fef3c7;"><td style="padding:4px 8px;font-weight:700;">CustomerId</td><td style="padding:4px 8px;font-weight:700;">Email</td><td style="padding:4px 8px;font-weight:700;">Sub IDs</td></tr>
         ${renderRows(duplicateCustomers.map((c) => `<tr><td style="padding:4px 8px;direction:ltr;">${escapeHtml(c.customerId)}</td><td style="padding:4px 8px;direction:ltr;">${escapeHtml(c.email)}</td><td style="padding:4px 8px;direction:ltr;">${escapeHtml(c.subIds.join(", "))}</td></tr>`))}
       </table>`
    : "";

  const mismatchSection = mismatchedUsers.length
    ? `<h3 style="color:#7c3aed;margin:16px 0 8px;">חוסר התאמה בין DB לבין LS (${mismatchedUsers.length})</h3>
       <table role="presentation" style="width:100%;border-collapse:collapse;font-size:13px;">
         <tr style="background:#ede9fe;"><td style="padding:4px 8px;font-weight:700;">UserId</td><td style="padding:4px 8px;font-weight:700;">Email</td><td style="padding:4px 8px;font-weight:700;">DB status</td><td style="padding:4px 8px;font-weight:700;">LS status</td></tr>
         ${renderRows(mismatchedUsers.map((u) => `<tr><td style="padding:4px 8px;direction:ltr;">${escapeHtml(u.userId)}</td><td style="padding:4px 8px;direction:ltr;">${escapeHtml(u.email)}</td><td style="padding:4px 8px;">${escapeHtml(u.dbStatus)}</td><td style="padding:4px 8px;">${escapeHtml(u.lsStatus)}</td></tr>`))}
       </table>`
    : "";

  return emailLayoutBrandedInternal(`
    <h2 style="color:#dc2626;font-size:20px;font-weight:800;margin:0 0 4px;">חריגות מנויים — LemonSqueezy Cross-Check</h2>
    <p style="color:#64748b;font-size:13px;margin:0 0 12px;">${escapeHtml(new Date().toISOString())}</p>
    ${ghostSection}${dupSection}${mismatchSection}
    <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">נשלח ע"י sync-subscriptions cron</p>
  `);
}
