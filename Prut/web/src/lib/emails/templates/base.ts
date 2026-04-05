/**
 * Shared base layout for all Peroot emails.
 *
 * Wraps inner content in the common HTML boilerplate: doctype, <head>,
 * RTL body wrapper, and optional footer with unsubscribe link.
 */

export function escapeHtml(str: string): string {
  return str.replace(/[<>&"']/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] ?? c),
  );
}

/**
 * Full-page email wrapper used by campaign / drip emails that include an
 * unsubscribe footer. Matches the existing `emailWrapper` from onboarding
 * and reengagement templates exactly.
 */
export function emailLayout(content: string, unsubscribeUrl: string): string {
  return `
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.7;">
      ${content}
      <div style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="font-size: 11px; color: #94a3b8;">
          נשלח מ-Peroot · <a href="${unsubscribeUrl}" style="color: #94a3b8;">הסרה מרשימת התפוצה</a>
        </p>
      </div>
    </div>
  `;
}
