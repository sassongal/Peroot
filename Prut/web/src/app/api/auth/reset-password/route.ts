import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { passwordResetEmail } from "@/lib/emails/templates/password-reset";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM_EMAIL || "noreply@joya-tech.net";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.peroot.space").replace(
  /\/$/,
  "",
);

/**
 * POST /api/auth/reset-password
 *
 * Accepts { email } and:
 * 1. Rate-limits by email (3 req/hr) to prevent abuse
 * 2. Generates a Supabase recovery link via admin.generateLink
 * 3. Sends a branded Hebrew email via Resend
 *
 * Always returns 200 regardless of whether the email exists — prevents
 * account enumeration. Errors are logged server-side only.
 */
export async function POST(req: NextRequest) {
  let email = "";
  try {
    const body = await req.json();
    if (typeof body?.email === "string") {
      email = body.email.toLowerCase().trim();
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "כתובת אימייל לא תקינה" }, { status: 400 });
  }

  // Rate limit: 3 requests per hour per email address
  const rl = await checkRateLimit(email, "passwordReset");
  if (!rl.success) {
    return NextResponse.json({ error: "יותר מדי בקשות — נסה/י שוב בעוד שעה" }, { status: 429 });
  }

  try {
    const service = createServiceClient();

    // Generate a recovery link (server-side, no PKCE required).
    // redirectTo goes through /auth/callback which exchanges the code
    // and then routes to /auth/reset-password.
    const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${SITE_URL}/auth/callback?type=recovery`,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      // User not found or other error — return 200 to prevent enumeration
      logger.warn(
        "[Reset Password] generateLink failed (not exposing to client):",
        linkError?.message,
      );
      return NextResponse.json({ success: true });
    }

    const resetUrl = linkData.properties.action_link;
    const user = linkData.user;
    const displayName =
      (user?.user_metadata?.full_name as string | undefined) ||
      (user?.user_metadata?.name as string | undefined) ||
      "";

    if (!resend) {
      logger.error("[Reset Password] Resend not configured — cannot send email");
      return NextResponse.json({ error: "שירות האימייל אינו מוגדר" }, { status: 500 });
    }

    const html = passwordResetEmail({ name: displayName, resetUrl });

    const { error: sendError } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: "איפוס סיסמה — Peroot",
      html,
    });

    if (sendError) {
      logger.error("[Reset Password] Resend send error:", sendError);
      return NextResponse.json({ error: "שגיאה בשליחת האימייל — נסה/י שוב" }, { status: 500 });
    }

    // Log to email_logs for admin tracking
    try {
      await service.from("email_logs").insert({
        user_id: user?.id ?? null,
        email_to: email,
        source: "resend",
        email_type: "password_reset",
        subject: "איפוס סיסמה — Peroot",
        status: "sent",
        metadata: {},
      });
    } catch {
      /* logging is best-effort */
    }

    logger.info("[Reset Password] Email sent to:", email);
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("[Reset Password] Unexpected error:", err);
    // Return 200 to prevent enumeration
    return NextResponse.json({ success: true });
  }
}
