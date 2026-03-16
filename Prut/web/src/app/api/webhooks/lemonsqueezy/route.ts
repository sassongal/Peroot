import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { logger } from "@/lib/logger";

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
    logger.error('[LemonSqueezy Webhook] Missing webhook secret');
    return new NextResponse('Webhook secret not configured', { status: 500 });
  }

  // Verify signature
  const rawBody = await request.text();
  const hmac = crypto.createHmac('sha256', secret);
  const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
  const signature = Buffer.from(
    request.headers.get('X-Signature') || '',
    'utf8'
  );

  if (digest.length !== signature.length || !crypto.timingSafeEqual(digest, signature)) {
    logger.error('[LemonSqueezy Webhook] Invalid signature');
    return new NextResponse('Invalid signature', { status: 401 });
  }

  // Parse event
  const event = JSON.parse(rawBody);
  const eventName = event.meta?.event_name;
  const customData = event.meta?.custom_data;
  const userId = customData?.user_id;

  logger.info(`[LemonSqueezy Webhook] Event: ${eventName}, User: ${userId}`);

  if (!eventName) {
    return new NextResponse('Missing event name', { status: 400 });
  }

  // Use admin client (service role) for webhook processing
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceKey) {
    logger.error('[LemonSqueezy Webhook] Missing SUPABASE_SERVICE_ROLE_KEY');
    return new NextResponse('Server configuration error', { status: 500 });
  }

  const supabase = createAdminClient(supabaseUrl, supabaseServiceKey);

  try {
    // Handle subscription events
    if (eventName.startsWith('subscription_')) {
      const attributes = event.data?.attributes;
      if (!attributes) {
        return new NextResponse('Missing subscription data', { status: 400 });
      }

      if (!userId) {
        logger.error('[LemonSqueezy Webhook] Missing user_id in custom_data');
        return new NextResponse('Missing user_id in custom_data', { status: 400 });
      }

      const subscriptionData = {
        user_id: userId,
        lemonsqueezy_subscription_id: event.data.id,
        lemonsqueezy_customer_id: String(attributes.customer_id),
        variant_id: attributes.variant_id,
        status: attributes.status, // active, cancelled, expired, paused, past_due, on_trial, unpaid
        plan_name: attributes.product_name || 'Pro',
        customer_email: attributes.user_email,
        customer_name: attributes.user_name,
        renews_at: attributes.renews_at,
        ends_at: attributes.ends_at,
        trial_ends_at: attributes.trial_ends_at,
        updated_at: new Date().toISOString(),
      };

      if (eventName === 'subscription_created') {
        // Insert new subscription
        const { error } = await supabase
          .from('subscriptions')
          .upsert({
            ...subscriptionData,
            created_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });

        if (error) {
          logger.error('[LemonSqueezy Webhook] Insert error:', error);
          return new NextResponse('Database error', { status: 500 });
        }
      } else {
        // Update existing subscription
        const { error } = await supabase
          .from('subscriptions')
          .update(subscriptionData)
          .eq('lemonsqueezy_subscription_id', event.data.id);

        if (error) {
          logger.error('[LemonSqueezy Webhook] Update error:', error);
          // Try upsert as fallback
          const { error: upsertError } = await supabase
            .from('subscriptions')
            .upsert(subscriptionData, { onConflict: 'user_id' });
          if (upsertError) {
            logger.error('[LemonSqueezy Webhook] Upsert fallback error:', upsertError);
          }
        }
      }

      // Sync plan_tier in profiles table (used by rate limiter / enhance API)
      if (userId) {
        const isActivePro = ['active', 'on_trial'].includes(attributes.status);
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ plan_tier: isActivePro ? 'pro' : 'free' })
          .eq('id', userId);
        if (profileError) {
          logger.error('[LemonSqueezy Webhook] Profile plan_tier update error:', profileError);
        }

        // Grant monthly credits on subscription creation or renewal payment
        const PRO_MONTHLY_CREDITS = 150;
        if (
          isActivePro &&
          (eventName === 'subscription_created' || eventName === 'subscription_payment_success')
        ) {
          // Set balance to PRO_MONTHLY_CREDITS (monthly reset, not additive)
          const { error: creditsError } = await supabase
            .from('profiles')
            .update({
              credits_balance: PRO_MONTHLY_CREDITS,
              credits_refreshed_at: new Date().toISOString(),
            })
            .eq('id', userId);
          if (creditsError) {
            logger.error('[LemonSqueezy Webhook] Credits update error:', creditsError);
          }

          logger.info(`[LemonSqueezy Webhook] Granted ${PRO_MONTHLY_CREDITS} credits to pro user ${userId}`);
        }
      }

      logger.info(`[LemonSqueezy Webhook] Subscription ${eventName}: ${attributes.status} for user ${userId}`);
    }

    // Store webhook event for debugging
    try {
      await supabase.from('webhook_events').insert({
        event_name: eventName,
        body: event,
        processed: true,
      });
    } catch {
      // webhook_events table is optional - ignore errors
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    logger.error('[LemonSqueezy Webhook] Processing error:', error);
    return new NextResponse('Processing error', { status: 500 });
  }
}
