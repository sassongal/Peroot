import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from "@/lib/logger";

/**
 * GET /api/subscription
 * Returns the current user's subscription status.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        status: 'free',
        plan_name: 'Free',
        renews_at: null,
        ends_at: null,
        trial_ends_at: null,
        lemonsqueezy_subscription_id: null,
      });
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, plan_name, renews_at, ends_at, trial_ends_at, lemonsqueezy_subscription_id')
      .eq('user_id', user.id)
      .single();

    if (!subscription) {
      return NextResponse.json({
        status: 'free',
        plan_name: 'Free',
        renews_at: null,
        ends_at: null,
        trial_ends_at: null,
        lemonsqueezy_subscription_id: null,
      });
    }

    return NextResponse.json(subscription);
  } catch (error) {
    logger.error('[Subscription API] Error:', error);
    return NextResponse.json({
      status: 'free',
      plan_name: 'Free',
      renews_at: null,
      ends_at: null,
      trial_ends_at: null,
      lemonsqueezy_subscription_id: null,
    });
  }
}
