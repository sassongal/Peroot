import "server-only";
import { PostHog } from "posthog-node";

/**
 * Server-side analytics. Captures events that should NOT depend on the client
 * (engine invocations, credit decrements, paywall hits, webhook subscription
 * events) so funnels stay accurate even when ad-blockers strip posthog-js.
 *
 * Reuses one process-singleton client so we don't leak handles across requests.
 */

let _client: PostHog | null = null;

function getClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!key || !host) return null;
  if (!_client) {
    _client = new PostHog(key, {
      host,
      // Flush quickly — Vercel functions are short-lived.
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return _client;
}

type ServerEventProps = Record<string, string | number | boolean | null | undefined>;

/**
 * Fire-and-forget. Errors swallowed: analytics must never break a request.
 * Pass `userId` (Supabase user.id) when known; otherwise we use a stable
 * anonymous id so events still funnel-attribute correctly.
 */
export async function captureServer(
  event: string,
  opts: { userId?: string | null; anonymousId?: string | null; properties?: ServerEventProps } = {},
): Promise<void> {
  try {
    const client = getClient();
    if (!client) return;
    const distinctId = opts.userId || opts.anonymousId || "server-anonymous";
    client.capture({
      distinctId,
      event,
      properties: opts.properties as Record<string, unknown> | undefined,
    });
    // For one-shot serverless invocations, flush so the event lands before the
    // function suspends. Cheap when flushAt=1.
    await client.flush();
  } catch {
    // intentional: analytics failures must never propagate
  }
}

// ─── Typed helpers ───────────────────────────────────────────────────────────

export const trackEngineInvoked = (
  userId: string | null,
  props: { engine: string; mode: string; durationMs: number; success: boolean },
) => captureServer("prompt_engine_invoked", { userId, properties: props });

export const trackCreditDecremented = (
  userId: string,
  props: { plan: "free" | "pro"; remaining: number },
) => captureServer("credit_decremented", { userId, properties: props });

export const trackSubscriptionStarted = (
  userId: string,
  props: { plan: "pro_monthly" | "pro_yearly"; lemonsqueezy_order_id: string },
) => captureServer("subscription_started", { userId, properties: props });

export const trackSubscriptionCancelled = (userId: string, props: { reason: string | null }) =>
  captureServer("subscription_cancelled", { userId, properties: props });

/** Server-side mirror for paywall_hit (e.g., from credit RPC failure). */
export const trackPaywallHitServer = (
  userId: string,
  props: { reason: "daily_limit" | "monthly_limit" },
) => captureServer("paywall_hit", { userId, properties: props });
