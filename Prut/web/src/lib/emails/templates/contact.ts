import { escapeHtml, emailLayoutBrandedInternal } from './base';

const SUBJECT_LABELS: Record<string, string> = {
  question: 'שאלה כללית',
  bug: 'דיווח על באג',
  feature: 'הצעה לתכונה חדשה',
  billing: 'חיוב ותשלום',
  other: 'אחר',
};

export { SUBJECT_LABELS };

/**
 * Contact form notification email — sent to the admin when a visitor
 * submits the contact form.
 */
export function contactEmail(params: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): string {
  const { name, email, subject, message } = params;
  return emailLayoutBrandedInternal(`
    <h2 style="color: #d97706; font-size: 20px; font-weight: 800; margin: 0 0 16px;">הודעה חדשה מטופס יצירת קשר</h2>
    <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:6px 0;color:#64748b;font-weight:700;width:88px;">שם</td><td style="padding:6px 0;">${escapeHtml(name)}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;font-weight:700;">אימייל</td><td style="padding:6px 0;"><a href="mailto:${escapeHtml(email)}" style="color:#d97706;font-weight:600;">${escapeHtml(email)}</a></td></tr>
      <tr><td style="padding:6px 0;color:#64748b;font-weight:700;">נושא</td><td style="padding:6px 0;">${escapeHtml(SUBJECT_LABELS[subject] || subject)}</td></tr>
    </table>
    <div style="margin-top: 18px; padding: 16px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; white-space: pre-wrap; font-size: 14px; line-height: 1.65;">${escapeHtml(message)}</div>
  `);
}
