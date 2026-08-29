import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { EmailService } from "@/lib/emails/service";
import { logger } from "@/lib/logger";
import { verifyWebhookSignature } from "./lib/verify";
import { type LsEvent } from "./lib/subscription-data";
import { handleSubscriptionEvent } from "./lib/subscription";

type ServiceClient = ReturnType<typeof createServiceClient>;

/**
 * Best-effort resolution of the Peroot user_id for a webhook event.
 * Order: checkout custom_data → stored subscription row by LS subscription id →
 * stored subscription row by LS customer id (stable across resubscribes).
 * Returns null when none match. Reads the `subscriptions` table only, whose rows
 * were written with a verified user_id at checkout time.
 */
async function resolveUserId(supabase: ServiceClient, event: LsEvent): Promise<string | null> {
  const fromCustom = event.meta?.custom_data?.user_id;
  if (fromCustom) return fromCustom;

  const subId = event.data?.id;
  if (subId) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("lemonsqueezy_subscription_id", subId)
      .maybeSingle();
    if (sub?.user_id) return sub.user_id as string;
  }

  const customerId = event.data?.attributes?.customer_id;
  if (customerId != null) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("lemonsqueezy_customer_id", String(customerId))
      .maybeSingle();
    if (sub?.user_id) return sub.user_id as string;
  }

  return null;
}

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
  //
  // Key includes the subscription's updated_at so every distinct state change
  // on the same subscription gets its own row. Without this, the second
  // subscription_updated (e.g. expired → active after trial payment) would
  // collide with the first and be silently dropped.
  const subUpdatedAt =
    (event.data?.attributes as Record<string, unknown> | undefined)?.updated_at ?? "none";
  const dedupKey = `${eventName}:${event.data?.id || "unknown"}:${subUpdatedAt}`;
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

  // Resolve the Peroot user this event belongs to — only for subscription events,
  // which are the only ones that act on a user. custom_data.user_id is set at
  // checkout (see /api/checkout) and is present on checkout-triggered events, but
  // automatic renewals, dunning retries and dashboard "send test" pings can arrive
  // WITHOUT it. Rather than error out (which spammed Sentry via captureConsole and
  // made LemonSqueezy retry an un-attributable event forever), fall back to the
  // subscription row we already stored (by subscription id, then customer id).
  const isSubscriptionEvent = eventName.startsWith("subscription_");
  const userId = isSubscriptionEvent ? await resolveUserId(supabase, event) : null;

  logger.info(`[LemonSqueezy Webhook] Event: ${eventName}, User: ${userId ?? "unresolved"}`);

  try {
    if (isSubscriptionEvent) {
      const attributes = event.data?.attributes;
      if (!attributes) {
        return new NextResponse("Missing subscription data", { status: 400 });
      }
      if (!userId) {
        // Not an error — we genuinely cannot attribute this event (e.g. a test
        // ping or a legacy sub with no matching row/e-mail). Acknowledge with 200
        // so LemonSqueezy stops retrying; warn (not error) keeps it out of Sentry.
        logger.warn(
          `[LemonSqueezy Webhook] Could not resolve user for ${eventName} (sub ${event.data?.id}); acknowledging without processing`,
        );
        await supabase
          .from("webhook_events")
          .update({ processed: true })
          .eq("event_name", dedupKey);
        return new NextResponse("Acknowledged (no matching user)", { status: 200 });
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
