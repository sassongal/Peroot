import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyNewsletterUnsubscribeSignature } from "@/lib/email/newsletter-unsubscribe-signing";
import { unsubscribeSuccessHtml } from "@/app/api/email/unsubscribe/html";
import { logger } from "@/lib/logger";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const email = request.nextUrl.searchParams.get("email");

  const supabase = createServiceClient();
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.peroot.space";
  let successKind: "sequence" | "newsletter" = "sequence";

  // Route 1: Token-based unsubscribe (from email_sequences)
  if (token && UUID_REGEX.test(token)) {
    const { data: sequence } = await supabase
      .from("email_sequences")
      .select("id, user_id, status")
      .eq("id", token)
      .maybeSingle();

    if (!sequence) {
      return new NextResponse("טוקן לא תקין", { status: 400 });
    }

    if (sequence.status !== "unsubscribed") {
      const { error } = await supabase
        .from("email_sequences")
        .update({ status: "unsubscribed" })
        .eq("id", token);

      if (error) {
        logger.error("[Unsubscribe] Failed:", error);
        return new NextResponse("שגיאה בהסרה מרשימת התפוצה", { status: 500 });
      }

      logger.info(`[Unsubscribe] User ${sequence.user_id} unsubscribed via token`);
    }

    // Also unsubscribe from newsletter_subscribers if user has an email
    if (sequence.user_id) {
      const { data: userData } = await supabase.auth.admin.getUserById(sequence.user_id);
      if (userData?.user?.email) {
        await supabase
          .from("newsletter_subscribers")
          .update({ unsubscribed_at: new Date().toISOString() })
          .eq("email", userData.user.email.toLowerCase())
          .is("unsubscribed_at", null);
      }
    }
  }
  // Route 2: Email-based unsubscribe (from newsletter) — requires HMAC sig
  else if (email) {
    successKind = "newsletter";
    const normalizedEmail = email.trim().toLowerCase();
    const sig = request.nextUrl.searchParams.get("sig") || "";
    if (!verifyNewsletterUnsubscribeSignature(normalizedEmail, sig)) {
      return new NextResponse("קישור לא תקין או פג תוקף", { status: 400 });
    }

    const { error } = await supabase
      .from("newsletter_subscribers")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("email", normalizedEmail)
      .is("unsubscribed_at", null);

    if (error) {
      logger.error("[Unsubscribe] Newsletter unsubscribe failed:", error);
      return new NextResponse("שגיאה בהסרה מרשימת התפוצה", { status: 500 });
    }

    // Also unsubscribe from email_sequences if user exists
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .limit(1);

    if (profiles?.[0]) {
      await supabase
        .from("email_sequences")
        .update({ status: "unsubscribed" })
        .eq("user_id", profiles[0].id)
        .neq("status", "unsubscribed");
    }

    logger.info(`[Unsubscribe] Email ${normalizedEmail.slice(0, 3)}*** unsubscribed`);
  } else {
    return new NextResponse("חסר טוקן או כתובת מייל", { status: 400 });
  }

  return new NextResponse(unsubscribeSuccessHtml(APP_URL, successKind), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/**
 * RFC 8058 one-click unsubscribe handler.
 *
 * Mail clients (Gmail, Yahoo, Outlook) POST to the List-Unsubscribe URL with
 * body "List-Unsubscribe=One-Click" when the user clicks the native
 * unsubscribe button. Same validation as GET, but returns 204 No Content on
 * success instead of an HTML confirmation page.
 */
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const email = request.nextUrl.searchParams.get("email");

  // Defensive: RFC 8058 mandates `List-Unsubscribe=One-Click` in body.
  // We accept any POST but log anomalies for observability.
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    try {
      const body = await request.formData();
      const marker = body.get("List-Unsubscribe");
      if (marker && marker !== "One-Click") {
        logger.warn("[Unsubscribe POST] Unexpected List-Unsubscribe value:", marker);
      }
    } catch {
      // Ignore malformed bodies — mail clients are inconsistent.
    }
  }

  const supabase = createServiceClient();

  if (token && UUID_REGEX.test(token)) {
    const { data: sequence } = await supabase
      .from("email_sequences")
      .select("id, user_id, status")
      .eq("id", token)
      .maybeSingle();

    if (!sequence) {
      return new NextResponse(null, { status: 400 });
    }

    if (sequence.status !== "unsubscribed") {
      const { error } = await supabase
        .from("email_sequences")
        .update({ status: "unsubscribed" })
        .eq("id", token);
      if (error) {
        logger.error("[Unsubscribe POST] Failed:", error);
        return new NextResponse(null, { status: 500 });
      }
    }

    if (sequence.user_id) {
      const { data: userData } = await supabase.auth.admin.getUserById(sequence.user_id);
      if (userData?.user?.email) {
        await supabase
          .from("newsletter_subscribers")
          .update({ unsubscribed_at: new Date().toISOString() })
          .eq("email", userData.user.email.toLowerCase())
          .is("unsubscribed_at", null);
      }
    }

    logger.info(`[Unsubscribe POST] Sequence ${token.slice(0, 8)}*** unsubscribed (one-click)`);
    return new NextResponse(null, { status: 204 });
  }

  if (email) {
    const normalizedEmail = email.trim().toLowerCase();
    const sig = request.nextUrl.searchParams.get("sig") || "";
    if (!verifyNewsletterUnsubscribeSignature(normalizedEmail, sig)) {
      return new NextResponse(null, { status: 400 });
    }

    const { error } = await supabase
      .from("newsletter_subscribers")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("email", normalizedEmail)
      .is("unsubscribed_at", null);
    if (error) {
      logger.error("[Unsubscribe POST] Newsletter failed:", error);
      return new NextResponse(null, { status: 500 });
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .limit(1);
    if (profiles?.[0]) {
      await supabase
        .from("email_sequences")
        .update({ status: "unsubscribed" })
        .eq("user_id", profiles[0].id)
        .neq("status", "unsubscribed");
    }

    logger.info(`[Unsubscribe POST] Email ${normalizedEmail.slice(0, 3)}*** unsubscribed (one-click)`);
    return new NextResponse(null, { status: 204 });
  }

  return new NextResponse(null, { status: 400 });
}
