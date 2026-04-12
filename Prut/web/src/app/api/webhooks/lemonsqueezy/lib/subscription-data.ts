/**
 * Shared types and pure data-mapping helpers for LemonSqueezy webhook events.
 * No side effects, no I/O — safe to unit-test directly.
 */

export const ACTIVE_STATUSES = ["active", "on_trial", "past_due", "paid"] as const;

export interface LsEventAttributes {
  customer_id: string | number;
  variant_id: unknown;
  status: string;
  product_name?: string | null;
  user_email?: string | null;
  user_name?: string | null;
  renews_at?: string | null;
  ends_at?: string | null;
  trial_ends_at?: string | null;
}

export interface LsEvent {
  meta?: { event_name?: string; custom_data?: { user_id?: string } };
  data?: { id: string; attributes: LsEventAttributes };
}

export interface SubscriptionData {
  user_id: string;
  lemonsqueezy_subscription_id: string;
  lemonsqueezy_customer_id: string;
  variant_id: unknown;
  status: string;
  plan_name: string;
  customer_email: string | null | undefined;
  customer_name: string | null | undefined;
  renews_at: string | null | undefined;
  ends_at: string | null | undefined;
  trial_ends_at: string | null | undefined;
  updated_at: string;
}

/**
 * Maps a raw LemonSqueezy webhook event into the shape stored in the `subscriptions` table.
 * Pure function — no side effects.
 */
export function buildSubscriptionData(event: LsEvent, userId: string): SubscriptionData {
  const attributes = event.data!.attributes;
  return {
    user_id: userId,
    lemonsqueezy_subscription_id: event.data!.id,
    lemonsqueezy_customer_id: String(attributes.customer_id),
    variant_id: attributes.variant_id,
    status: attributes.status,
    plan_name: attributes.product_name || "Pro",
    customer_email: attributes.user_email,
    customer_name: attributes.user_name,
    renews_at: attributes.renews_at,
    ends_at: attributes.ends_at,
    trial_ends_at: attributes.trial_ends_at,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Returns true when the subscription status grants Pro access.
 * 'paid' is not a standard LS status but appears in payment_success events — kept as
 * defensive mapping; 'past_due' keeps access during LemonSqueezy's dunning/retry window.
 */
export function isActivePro(status: string): boolean {
  return (ACTIVE_STATUSES as readonly string[]).includes(status);
}
