import { escapeHtml } from "@/lib/emails/templates/base";

type UnsubscribeSuccessKind = "sequence" | "newsletter";

export function unsubscribeSuccessHtml(appUrl: string, kind: UnsubscribeSuccessKind): string {
  const safeUrl = escapeHtml(appUrl.replace(/\/$/, ""));
  const title = kind === "newsletter" ? "הוסרתם מניוזלטר העדכונים" : "הוסרתם ממיילי האונבורדינג";
  const body =
    kind === "newsletter"
      ? "לא תקבלו יותר מיילי עדכונים ותוכן מהבלוג. מיילים חשבונאיים ממנוי (למשל מאת Lemon Squeezy) עשויים להמשיך לפי מדיניות הספק."
      : "לא תקבלו יותר מיילי הצטרפות והדרכה מ-Peroot. עדיין עשויים להגיע מיילים הקשורים לחשבון או לתשלום (למשל אישור מנוי).";

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;font-family:Segoe UI,Tahoma,Arial,sans-serif;background:#0a0a0a;color:#e2e8f0;min-height:100vh;display:flex;align-items:center;justify-content:center;">
  <div style="text-align:center;max-width:420px;padding:32px 24px;">
    <div style="margin-bottom:24px;">
      <img src="${safeUrl}/assets/branding/logo.svg" alt="Peroot" width="120" style="display:inline-block;opacity:0.95;" />
    </div>
    <h1 style="color:#f59e0b;font-size:22px;font-weight:800;margin:0 0 12px;letter-spacing:-0.02em;">${escapeHtml(title)}</h1>
    <p style="color:#94a3b8;font-size:14px;line-height:1.65;margin:0 0 24px;">${body}</p>
    <a href="${safeUrl}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#eab308);color:#0a0a0a;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:800;font-size:14px;">חזרה ל-Peroot</a>
  </div>
</body>
</html>`;
}
