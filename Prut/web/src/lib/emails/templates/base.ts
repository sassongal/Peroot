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

const appBaseUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL || "https://www.peroot.space").replace(/\/$/, "");

/** Header strip + card body (welcome / key lifecycle mails). */
export function emailLayoutBranded(
  content: string,
  unsubscribeUrl: string,
  footerUnsubscribeLabel = "הסרה ממיילי האונבורדינג והעדכונים",
): string {
  const logoUrl = `${appBaseUrl()}/assets/branding/logo.svg`;
  return `
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #0f172a; line-height: 1.75;">
      <div style="background: linear-gradient(180deg, #0a0a0a 0%, #171717 100%); padding: 28px 24px; text-align: center; border-radius: 16px 16px 0 0;">
        <img src="${logoUrl}" alt="Peroot" width="132" style="display:block;margin:0 auto;" />
      </div>
      <div style="background:#fafafa;border:1px solid #e2e8f0;border-top:0;padding:28px 24px;border-radius:0 0 16px 16px;">
        ${content}
      </div>
      <div style="margin-top: 22px; text-align: center;">
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">
          נשלח מ-Peroot · <a href="${unsubscribeUrl}" style="color: #d97706;">${footerUnsubscribeLabel}</a>
        </p>
      </div>
    </div>
  `;
}

/**
 * Branded layout for internal mail (admin alerts, contact form) — no marketing unsubscribe link.
 */
export function emailLayoutBrandedInternal(content: string): string {
  const base = appBaseUrl();
  const logoUrl = `${base}/assets/branding/logo.svg`;
  return `
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #0f172a; line-height: 1.75;">
      <div style="background: linear-gradient(180deg, #0a0a0a 0%, #171717 100%); padding: 28px 24px; text-align: center; border-radius: 16px 16px 0 0;">
        <img src="${logoUrl}" alt="Peroot" width="132" style="display:block;margin:0 auto;" />
      </div>
      <div style="background:#fafafa;border:1px solid #e2e8f0;border-top:0;padding:28px 24px;border-radius:0 0 16px 16px;">
        ${content}
      </div>
      <div style="margin-top: 22px; text-align: center;">
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">מייל מערכת · Peroot</p>
      </div>
    </div>
  `;
}
