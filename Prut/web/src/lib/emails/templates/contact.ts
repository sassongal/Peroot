import { escapeHtml } from './base';

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
  return `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #F59E0B;">הודעה חדשה מ-Peroot</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; font-weight: bold; color: #888;">שם:</td><td style="padding: 8px;">${escapeHtml(name)}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #888;">אימייל:</td><td style="padding: 8px;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #888;">נושא:</td><td style="padding: 8px;">${SUBJECT_LABELS[subject] || subject}</td></tr>
          </table>
          <div style="margin-top: 16px; padding: 16px; background: #f5f5f5; border-radius: 8px; white-space: pre-wrap;">${escapeHtml(message)}</div>
        </div>
      `;
}
