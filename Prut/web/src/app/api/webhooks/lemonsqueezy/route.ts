import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { EmailService } from "@/lib/emails/service";
import { logger } from "@/lib/logger";
import { verifyWebhookSignature } from "./lib/verify";
import { type LsEvent } from "./lib/subscription-data";
import { handleSubscriptionEvent } from "./lib/subscription";

/**
 * POST /api/webhooks/lemonsqueezy
 * Handles LemonSqueezy webhook events for subscription lifecycle.
 *
 * Events handled:
 * - subscription_created
 * - subscription_updated
 * - subscription_cancelled
 * - subscription_expired
 * - subscription_resumed
 * - subscription_paused
 * - subscription_unpaused
 * - subscription_payment_success
 * - subscription_payment_failed
 */
export async function POST(request: Request) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    logger.error("[LemonSqueezy Webhook] Missing webhook secret");
    return new NextResponse("Webhook secret not configured", { status: 500 });
  }

  // Verify HMAC-SHA256 signature before touching the body
  const rawBody = await request.text();
  if (!verifyWebhookSignature(rawBody, request.headers.get("X-Signature") || "", secret)) {
    logger.error("[LemonSqueezy Webhook] Invalid signature");
    return new NextResponse("Invalid signature", { status: 401 });
  }

  // Parse event
  const event = JSON.parse(rawBody) as LsEvent;
  const eventName = event.meta?.event_name;
  const userId = event.meta?.custom_data?.user_id;

  logger.info(`[LemonSqueezy Webhook] Event: ${eventName}, User: ${userId}`);

  if (!eventName) {
    return new NextResponse("Missing event name", { status: 400 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.error("[LemonSqueezy Webhook] Missing SUPABASE_SERVICE_ROLE_KEY");
    return new NextResponse("Server configuration error", { status: 500 });
  }

  const supabase = createServiceClient();

  // Idempotency: INSERT event BEFORE processing. Unique index on event_name
  // ensures only one concurrent webhook wins the insert. Losers get a constraint error.
  const dedupKey = `${eventName}:${event.data?.id || "unknown"}`;
  const { error: dedupError } = await supabase.from("webhook_events").insert({
    event_name: dedupKey,
    body: event,
    processed: false,
  });
  if (dedupError) {
    // Only treat the unique-violation (23505) as "already processed".
    // Any other DB error (RLS denial, table locked, etc.) must return 5xx
    // so LemonSqueezy retries — otherwise we silently lose events.
    if (dedupError.code === "23505") {
      logger.info(`[LemonSqueezy Webhook] Skipping duplicate event: ${dedupKey}`);
      return new NextResponse("Already processed", { status: 200 });
    }
    logger.error(
      `[LemonSqueezy Webhook] Dedup insert failed (will retry): ${dedupKey}`,
      dedupError,
    );
    return new NextResponse("Dedup insert failed", { status: 500 });
  }

  try {
    if (eventName.startsWith("subscription_")) {
      const attributes = event.data?.attributes;
      if (!attributes) {
        return new NextResponse("Missing subscription data", { status: 400 });
      }
      if (!userId) {
        logger.error("[LemonSqueezy Webhook] Missing user_id in custom_data");
        return new NextResponse("Missing user_id in custom_data", { status: 400 });
      }
      await handleSubscriptionEvent(supabase, event, eventName, userId);
    }

    // Mark event as processed
    await supabase.from("webhook_events").update({ processed: true }).eq("event_name", dedupKey);

    // Log LemonSqueezy-sent emails (LS sends receipts/confirmations automatically)
    const lsEmailEvents: Record<string, string> = {
      subscription_created: "Subscription Confirmation",
      subscription_payment_success: "Payment Receipt",
      subscription_cancelled: "Cancellation Confirmation",
      subscription_expired: "Subscription Expired",
      subscription_resumed: "Subscription Resumed",
      subscription_payment_failed: "Payment Failed Notice",
    };
    const eventAttrs = event.data?.attributes as Record<string, unknown> | undefined;
    if (eventName in lsEmailEvents && eventAttrs?.user_email) {
      await EmailService.logEmail({
        userId: userId || undefined,
        emailTo: eventAttrs.user_email as string,
        source: "lemonsqueezy",
        emailType: eventName,
        subject: lsEmailEvents[eventName],
        status: "sent",
        metadata: {
          subscription_id: eventAttrs.subscription_id,
          plan: (eventAttrs.product_name || eventAttrs.variant_name) as string,
        },
      });
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    logger.error("[LemonSqueezy Webhook] Processing error:", error);
    return new NextResponse("Processing error", { status: 500 });
  }
}
