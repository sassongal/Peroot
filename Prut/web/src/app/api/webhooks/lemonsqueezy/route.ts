import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { createServiceClient } from "@/lib/supabase/service";
import { EmailService } from '@/lib/emails/service';
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
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.error('[LemonSqueezy Webhook] Missing SUPABASE_SERVICE_ROLE_KEY');
    return new NextResponse('Server configuration error', { status: 500 });
  }

  const supabase = createServiceClient();

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
      // 'paid' is not a standard subscription status but appears in subscription_payment_success
      // event attributes. Including it here is defensive — it maps to active in practice.
      // 'past_due' keeps pro access during LemonSqueezy's dunning/retry period.
      // See: https://docs.lemonsqueezy.com/api/subscriptions
      if (userId) {
        const ACTIVE_STATUSES = ['active', 'on_trial', 'past_due', 'paid'];
        const isActivePro = ACTIVE_STATUSES.includes(attributes.status);

        // Fetch current profile to detect pro→free transitions
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('plan_tier, tags, credits_balance')
          .eq('id', userId)
          .single();

        const wasPro = currentProfile?.plan_tier === 'pro';
        const newTier = isActivePro ? 'pro' : 'free';

        const { error: profileError } = await supabase
          .from('profiles')
          .update({ plan_tier: newTier })
          .eq('id', userId);
        if (profileError) {
          logger.error('[LemonSqueezy Webhook] Profile plan_tier update error:', profileError);
        }

        // --- CHURN: Pro → Free transition ---
        if (wasPro && !isActivePro) {
          // Fetch daily_free_limit from site_settings
          const { data: siteSettings } = await supabase
            .from('site_settings')
            .select('daily_free_limit')
            .single();
          const dailyFreeLimit = siteSettings?.daily_free_limit ?? 2;

          // Revoke pro credits → reset to free daily limit
          const { error: revokeError } = await supabase
            .from('profiles')
            .update({
              credits_balance: dailyFreeLimit,
              credits_refreshed_at: new Date().toISOString(),
              churned_at: new Date().toISOString(),
            })
            .eq('id', userId);
          if (revokeError) {
            logger.error('[LemonSqueezy Webhook] Credit revocation error:', revokeError);
          }

          // Log to credit ledger (delta is always <= 0 for a revoke)
          const previousBalance = currentProfile?.credits_balance ?? 0;
          const revokeDelta = Math.min(0, dailyFreeLimit - previousBalance);
          if (revokeDelta !== 0) {
            try {
              await supabase.rpc('log_credit_change', {
                p_user_id: userId,
                p_delta: revokeDelta,
                p_balance_after: dailyFreeLimit,
                p_reason: 'churn_revoke',
                p_source: 'webhook',
              });
            } catch { /* ledger is best-effort */ }
          }

          // Add "churn" tag (idempotent — only if not already present)
          const existingTags: string[] = currentProfile?.tags ?? [];
          if (!existingTags.includes('churn')) {
            await supabase
              .from('profiles')
              .update({ tags: [...existingTags, 'churn'] })
              .eq('id', userId);
          }

          logger.info(`[LemonSqueezy Webhook] CHURN: User ${userId} reverted to free, credits reset to ${dailyFreeLimit}`);

          // Send churn email to user
          try {
            const { churnEmail } = await import('@/lib/emails/reengagement-templates');
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.peroot.space';
            const template = churnEmail(
              subscriptionData.customer_name || 'משתמש/ת',
              `${siteUrl}/settings?unsubscribe=true`
            );
            if (subscriptionData.customer_email) {
              await EmailService.send({
                to: subscriptionData.customer_email,
                subject: template.subject,
                html: template.html,
                userId,
                emailType: 'churn_notification',
              });
            }
          } catch (emailErr) {
            logger.error('[LemonSqueezy Webhook] Churn email error:', emailErr);
          }

          // Send churn alert to admin
          try {
            const { data: adminSettings } = await supabase
              .from('site_settings')
              .select('contact_email')
              .single();
            const adminEmail = adminSettings?.contact_email || 'gal@joya-tech.net';
            const escHtml = (s: string) => s.replace(/[<>&"']/g, c =>
              ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
            await EmailService.send({
              to: adminEmail,
              subject: `[Peroot] Churn: ${(subscriptionData.customer_email || userId).slice(0, 100)}`,
              html: `<div dir="rtl" style="font-family: sans-serif;">
                <h2 style="color: #ef4444;">משתמש ביטל מנוי Pro</h2>
                <p><strong>שם:</strong> ${escHtml(subscriptionData.customer_name || 'N/A')}</p>
                <p><strong>אימייל:</strong> ${escHtml(subscriptionData.customer_email || 'N/A')}</p>
                <p><strong>ID:</strong> ${escHtml(userId)}</p>
                <p><strong>סטטוס:</strong> ${escHtml(attributes.status)}</p>
                <p><strong>זמן:</strong> ${new Date().toISOString()}</p>
              </div>`,
              emailType: 'admin_churn_alert',
            });
          } catch (adminErr) {
            logger.error('[LemonSqueezy Webhook] Admin churn alert error:', adminErr);
          }
        }

        // --- RESUBSCRIBE: Remove churn tag if user comes back ---
        if (isActivePro && !wasPro) {
          const existingTags: string[] = currentProfile?.tags ?? [];
          if (existingTags.includes('churn')) {
            await supabase
              .from('profiles')
              .update({
                tags: existingTags.filter((t: string) => t !== 'churn'),
                churned_at: null,
              })
              .eq('id', userId);
            logger.info(`[LemonSqueezy Webhook] RESUBSCRIBE: User ${userId} returned to pro, churn tag removed`);
          }
        }

        // Grant monthly credits on subscription creation or renewal payment
        const PRO_MONTHLY_CREDITS = 150;
        if (
          isActivePro &&
          (eventName === 'subscription_created' || eventName === 'subscription_payment_success' || eventName === 'subscription_resumed')
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

          // Log to credit ledger
          try {
            await supabase.rpc('log_credit_change', {
              p_user_id: userId,
              p_delta: PRO_MONTHLY_CREDITS,
              p_balance_after: PRO_MONTHLY_CREDITS,
              p_reason: 'subscription_grant',
              p_source: 'webhook',
            });
          } catch { /* ledger is best-effort */ }

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

    // Log LemonSqueezy-sent emails (LS sends receipts/confirmations automatically)
    const lsEmailEvents: Record<string, string> = {
      subscription_created: 'Subscription Confirmation',
      subscription_payment_success: 'Payment Receipt',
      subscription_cancelled: 'Cancellation Confirmation',
      subscription_expired: 'Subscription Expired',
      subscription_resumed: 'Subscription Resumed',
      subscription_payment_failed: 'Payment Failed Notice',
    };
    const eventAttrs = event.data?.attributes as Record<string, unknown> | undefined;
    if (eventName in lsEmailEvents && eventAttrs?.user_email) {
      await EmailService.logEmail({
        userId: userId || undefined,
        emailTo: eventAttrs.user_email as string,
        source: 'lemonsqueezy',
        emailType: eventName,
        subject: lsEmailEvents[eventName],
        status: 'sent',
        metadata: {
          subscription_id: eventAttrs.subscription_id,
          plan: (eventAttrs.product_name || eventAttrs.variant_name) as string,
        },
      });
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    logger.error('[LemonSqueezy Webhook] Processing error:', error);
    return new NextResponse('Processing error', { status: 500 });
  }
}
