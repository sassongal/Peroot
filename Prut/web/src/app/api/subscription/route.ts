import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/ratelimit";

/**
 * GET /api/subscription
 * Returns the current user's subscription status.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const cacheHeaders = { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' };

    if (!user) {
      return NextResponse.json({
        status: 'free',
        plan_name: 'Free',
        renews_at: null,
        ends_at: null,
        trial_ends_at: null,
        lemonsqueezy_subscription_id: null,
      }, { headers: cacheHeaders });
    }

    const rateLimit = await checkRateLimit(user.id, 'subscription');
    if (!rateLimit.success) {
      return NextResponse.json({ error: "חרגת ממגבלת הבקשות. נסה שוב מאוחר יותר", code: "rate_limited" }, { status: 429 });
    }

    const [{ data: subscription }, { data: profile }, { data: adminRole }] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('status, plan_name, renews_at, ends_at, trial_ends_at, lemonsqueezy_subscription_id')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('plan_tier')
        .eq('id', user.id)
        .maybeSingle(),
      createServiceClient()
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle(),
    ]);

    const isAdmin = user.app_metadata?.role === 'admin' || !!adminRole;
    const planTier = isAdmin ? 'admin' : (profile?.plan_tier || 'free');

    if (!subscription) {
      return NextResponse.json({
        status: (planTier === 'pro' || planTier === 'admin') ? 'active' : 'free',
        plan_name: planTier === 'admin' ? 'Admin' : planTier === 'pro' ? 'Pro' : 'Free',
        plan_tier: planTier,
        renews_at: null,
        ends_at: null,
        trial_ends_at: null,
        lemonsqueezy_subscription_id: null,
      }, { headers: cacheHeaders });
    }

    return NextResponse.json({ ...subscription, plan_tier: planTier }, { headers: cacheHeaders });
  } catch (error) {
    logger.error('[Subscription API] Error:', error);
    return NextResponse.json({ error: "טעינת סטטוס המנוי נכשלה", code: "load_failed" }, { status: 500 });
  }
}
