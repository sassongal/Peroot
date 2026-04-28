import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/signup
 *
 * Server-side signup that creates the user with email already confirmed
 * (admin.createUser + email_confirm: true), grants initial credits, starts
 * the onboarding email sequence, and logs the registration event.
 *
 * The client then calls signInWithPassword immediately — no verification link needed.
 */
export async function POST(req: NextRequest) {
  try {
    let body: { email?: unknown; password?: unknown; fullName?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "גוף הבקשה אינו JSON תקין", code: "invalid_json" }, { status: 400 });
    }

    const { email: rawEmail, password, fullName: rawName } = body;

    if (
      typeof rawEmail !== "string" ||
      typeof password !== "string" ||
      typeof rawName !== "string"
    ) {
      return NextResponse.json({ error: "חסרים שדות חובה", code: "missing_fields" }, { status: 400 });
    }

    const email = rawEmail.toLowerCase().trim();
    const fullName = rawName.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "כתובת אימייל לא תקינה" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "הסיסמה חייבת להכיל לפחות 6 תווים" }, { status: 400 });
    }
    if (fullName.length === 0) {
      return NextResponse.json({ error: "שם מלא נדרש" }, { status: 400 });
    }

    const service = createServiceClient();

    // Create user with email pre-confirmed — no verification email sent
    const {
      data: { user },
      error: createError,
    } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      logger.error("[Signup] createUser error:", createError.message);
      // Translate Supabase error messages to Hebrew
      if (
        createError.message.toLowerCase().includes("already registered") ||
        createError.message.toLowerCase().includes("already been registered") ||
        createError.message.toLowerCase().includes("user already exists")
      ) {
        return NextResponse.json({ error: "כתובת אימייל זו כבר רשומה במערכת" }, { status: 409 });
      }
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    if (!user) {
      return NextResponse.json({ error: "יצירת המשתמש נכשלה", code: "user_create_failed" }, { status: 500 });
    }

    // ── New-user setup (mirrors /auth/callback logic) ──────────────────────
    // Profile row is created synchronously by a DB trigger on auth.users INSERT,
    // so it exists by the time we reach here.
    try {
      const { data: siteSettings } = await service
        .from("site_settings")
        .select("daily_free_limit")
        .single();
      const dailyLimit = siteSettings?.daily_free_limit ?? 2;

      await service
        .from("profiles")
        .update({
          credits_balance: dailyLimit,
          credits_refreshed_at: new Date().toISOString(),
          last_prompt_at: null,
        })
        .eq("id", user.id);

      try {
        await service.rpc("log_credit_change", {
          p_user_id: user.id,
          p_delta: dailyLimit,
          p_balance_after: dailyLimit,
          p_reason: "initial_quota",
          p_source: "system",
        });
      } catch {
        /* ledger is best-effort */
      }

      await service.from("activity_logs").insert({
        user_id: user.id,
        action: "user_registered",
        entity_type: "auth",
        entity_id: user.id,
        details: { provider: "email" },
      });

      // Start onboarding email sequence + welcome email
      const { data: seqRow, error: seqErr } = await service
        .from("email_sequences")
        .insert({
          user_id: user.id,
          sequence_type: "onboarding",
          current_step: 0,
          status: "active",
        })
        .select("id")
        .single();

      if (seqErr) {
        logger.error("[Signup] Failed to start email sequence:", seqErr);
      } else if (seqRow?.id && user.email) {
        try {
          const { sendOnboardingWelcomeNow } = await import("@/lib/emails/onboarding-welcome-send");
          await sendOnboardingWelcomeNow({
            userId: user.id,
            email: user.email,
            displayName: fullName,
            sequenceId: seqRow.id,
          });
        } catch (welcomeErr) {
          logger.error("[Signup] Welcome email failed:", welcomeErr);
        }
      }
    } catch (setupErr) {
      logger.error("[Signup] User setup error (user created OK):", setupErr);
      // Don't fail the request — user is created, setup is non-critical
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("[Signup] Unexpected error:", err);
    return NextResponse.json({ error: "שגיאת שרת פנימית", code: "internal_error" }, { status: 500 });
  }
}
