import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

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
    console.error('[LemonSqueezy Webhook] Missing webhook secret');
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

  if (!crypto.timingSafeEqual(digest, signature)) {
    console.error('[LemonSqueezy Webhook] Invalid signature');
    return new NextResponse('Invalid signature', { status: 401 });
  }

  // Parse event
  const event = JSON.parse(rawBody);
  const eventName = event.meta?.event_name;
  const customData = event.meta?.custom_data;
  const userId = customData?.user_id;

  console.log(`[LemonSqueezy Webhook] Event: ${eventName}, User: ${userId}`);

  if (!eventName) {
    return new NextResponse('Missing event name', { status: 400 });
  }

  // Use admin client (service role) for webhook processing
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceKey) {
    console.error('[LemonSqueezy Webhook] Missing SUPABASE_SERVICE_ROLE_KEY');
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
          console.error('[LemonSqueezy Webhook] Insert error:', error);
          return new NextResponse('Database error', { status: 500 });
        }
      } else {
        // Update existing subscription
        const { error } = await supabase
          .from('subscriptions')
          .update(subscriptionData)
          .eq('lemonsqueezy_subscription_id', event.data.id);

        if (error) {
          console.error('[LemonSqueezy Webhook] Update error:', error);
          // Try upsert as fallback
          await supabase
            .from('subscriptions')
            .upsert(subscriptionData, { onConflict: 'user_id' });
        }
      }

      // Sync plan_tier in profiles table (used by rate limiter / enhance API)
      if (userId) {
        const isActivePro = ['active', 'on_trial'].includes(attributes.status);
        await supabase
          .from('profiles')
          .update({ plan_tier: isActivePro ? 'pro' : 'free' })
          .eq('id', userId);
      }

      console.log(`[LemonSqueezy Webhook] Subscription ${eventName}: ${attributes.status} for user ${userId}`);
    }

    // Store webhook event for debugging
    try {
      await supabase.from('webhook_events').insert({
        event_name: eventName,
        body: event,
        processed: true,
      });
    } catch {
      // webhook_events table is optional — ignore errors
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('[LemonSqueezy Webhook] Processing error:', error);
    return new NextResponse('Processing error', { status: 500 });
  }
}
