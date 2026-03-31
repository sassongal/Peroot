"use client";

import { useState, useEffect, useCallback } from 'react';
import { getApiPath } from '@/lib/api-path';
import { logger } from "@/lib/logger";

export type SubscriptionStatus = 'free' | 'active' | 'cancelled' | 'past_due' | 'paused' | 'on_trial' | 'expired';

export interface Subscription {
  status: SubscriptionStatus;
  plan_name: string;
  renews_at: string | null;
  ends_at: string | null;
  trial_ends_at: string | null;
  lemonsqueezy_subscription_id: string | null;
}

const FREE_SUBSCRIPTION: Subscription = {
  status: 'free',
  plan_name: 'Free',
  renews_at: null,
  ends_at: null,
  trial_ends_at: null,
  lemonsqueezy_subscription_id: null,
};

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription>(FREE_SUBSCRIPTION);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const res = await fetch(getApiPath('/api/subscription'));
        if (res.ok) {
          const data = await res.json();
          setSubscription(data);
        }
      } catch {
        // User not logged in or no subscription - stays free
      } finally {
        setLoading(false);
      }
    };
    fetchSubscription();
  }, []);

  const isPro = subscription.status === 'active' || subscription.status === 'on_trial' || subscription.status === 'past_due';

  const checkout = useCallback(async (variantId?: string) => {
    const vid = (variantId || process.env.NEXT_PUBLIC_LEMONSQUEEZY_VARIANT_ID || '').trim();
    if (!vid) {
      logger.error('No variant ID configured');
      return;
    }

    try {
      const res = await fetch(getApiPath('/api/checkout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId: vid }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Checkout failed');
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (error) {
      logger.error('[Checkout]', error);
      throw error;
    }
  }, []);

  return {
    subscription,
    isPro,
    loading,
    checkout,
  };
}
