import { escapeHtml, emailLayoutBrandedInternal } from "./base";

const brandBtn =
  "display:inline-block;background:linear-gradient(135deg,#f59e0b,#eab308);color:#0a0a0a;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:800;font-size:15px;letter-spacing:-0.01em;";

/**
 * Password reset email — sent when the user clicks "שכחתי סיסמה".
 * The resetUrl is a Supabase-signed recovery link valid for 1 hour.
 */
export function passwordResetEmail(params: { name?: string; resetUrl: string }): string {
  const { name, resetUrl } = params;
  const safeUrl = escapeHtml(resetUrl);
  const displayName = name ? escapeHtml(name) : "שם";

  return emailLayoutBrandedInternal(`
    <h1 style="color:#0f172a;font-size:22px;font-weight:800;margin:0 0 8px;letter-spacing:-0.02em;">
      בקשה לאיפוס סיסמה
    </h1>
    <p style="font-size:15px;color:#334155;margin:0 0 20px;">
      היי ${displayName},
    </p>
    <p style="font-size:14px;color:#475569;margin:0 0 24px;line-height:1.7;">
      קיבלנו בקשה לאיפוס הסיסמה של חשבון Peroot שלך.<br/>
      לחץ/י על הכפתור למטה כדי להגדיר סיסמה חדשה:
    </p>

    <div style="text-align:center;margin:28px 0;">
      <a href="${safeUrl}" style="${brandBtn}">איפוס סיסמה</a>
    </div>

    <div style="background:#f1f5f9;border-radius:10px;padding:14px 16px;margin:20px 0;">
      <p style="font-size:12px;color:#64748b;margin:0;line-height:1.6;">
        <strong style="color:#475569;">שים/י לב:</strong> הקישור תקף למשך <strong>שעה אחת</strong>.
        אם לא ביצעת את הבקשה הזו, ניתן להתעלם מהמייל הזה — הסיסמה לא תשתנה.
      </p>
    </div>

    <p style="font-size:13px;color:#94a3b8;margin:16px 0 0;line-height:1.6;">
      אם הכפתור לא עובד, העתק/י את הקישור הבא לדפדפן:<br/>
      <span style="word-break:break-all;color:#d97706;font-size:12px;">${safeUrl}</span>
    </p>
  `);
}
