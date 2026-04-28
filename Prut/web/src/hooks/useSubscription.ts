"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getApiPath } from "@/lib/api-path";
import { logger } from "@/lib/logger";

export type SubscriptionStatus =
  | "free"
  | "active"
  | "cancelled"
  | "past_due"
  | "paused"
  | "on_trial"
  | "expired";

export interface Subscription {
  status: SubscriptionStatus;
  plan_name: string;
  plan_tier?: string;
  renews_at: string | null;
  ends_at: string | null;
  trial_ends_at: string | null;
  lemonsqueezy_subscription_id: string | null;
}

const FREE_SUBSCRIPTION: Subscription = {
  status: "free",
  plan_name: "Free",
  renews_at: null,
  ends_at: null,
  trial_ends_at: null,
  lemonsqueezy_subscription_id: null,
};

async function fetchSubscription(): Promise<Subscription> {
  const res = await fetch(getApiPath("/api/subscription"));
  if (!res.ok) return FREE_SUBSCRIPTION;
  return res.json();
}

export function useSubscription() {
  const { data: subscription = FREE_SUBSCRIPTION, isLoading: loading } = useQuery({
    queryKey: ["subscription"],
    queryFn: fetchSubscription,
    placeholderData: FREE_SUBSCRIPTION,
  });

  const isPro =
    subscription.status === "active" ||
    subscription.status === "on_trial" ||
    subscription.status === "past_due" ||
    subscription.plan_tier === "pro" ||
    subscription.plan_tier === "admin" ||
    subscription.plan_tier === "premium";

  const checkout = useCallback(async (variantId?: string) => {
    const vid = (variantId || process.env.NEXT_PUBLIC_LEMONSQUEEZY_VARIANT_ID || "").trim();
    if (!vid) {
      logger.error("No variant ID configured");
      return;
    }

    try {
      const res = await fetch(getApiPath("/api/checkout"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: vid }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Checkout failed");
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (error) {
      logger.error("[Checkout]", error);
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
