import { lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";
import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";

const PRO_PRICE_ILS_FALLBACK = 10.0;
const LS_ACTIVE_STATUSES = new Set(["active", "on_trial", "past_due", "paid"]);
const LS_MRR_CACHE_KEY = "admin:revenue:ls_mrr";
const LS_MRR_CACHE_TTL = 300; // 5 minutes

export async function getLsMrr(
  skipCache = false,
): Promise<{ mrr: number; activeSubs: number } | null> {
  try {
    if (!skipCache) {
      const cached = await redis.get<{ mrr: number; activeSubs: number }>(LS_MRR_CACHE_KEY);
      if (cached) return cached;
    }

    if (!process.env.LEMONSQUEEZY_API_KEY) return null;
    lemonSqueezySetup({ apiKey: process.env.LEMONSQUEEZY_API_KEY! });
    const { listSubscriptions, getPrice } = await import("@lemonsqueezy/lemonsqueezy.js");

    // Fetch all subs without a status filter — LS API only accepts one status value
    // at a time, so we fetch all and filter client-side for the four active statuses.
    const result = await listSubscriptions({ filter: {}, page: { size: 100 } } as Parameters<
      typeof listSubscriptions
    >[0]);
    if (!result.data) return null;

    const subs = (result.data.data ?? []).filter((s) =>
      LS_ACTIVE_STATUSES.has((s.attributes as { status?: string }).status ?? ""),
    );
    const activeSubs = subs.length;

    // Collect unique price_ids from active subscriptions
    const priceIds = new Set<string>();
    for (const sub of subs) {
      const priceId = (sub.attributes as { first_subscription_item?: { price_id?: number } })
        .first_subscription_item?.price_id;
      if (priceId) priceIds.add(String(priceId));
    }

    // Fetch real unit_price (cents → ILS) for each unique price_id in parallel
    const priceAmountMap = new Map<string, number>();
    await Promise.all(
      Array.from(priceIds).map(async (priceId) => {
        try {
          const priceResult = await getPrice(priceId);
          const unitPrice = (
            priceResult.data?.data?.attributes as { unit_price?: number } | undefined
          )?.unit_price;
          if (unitPrice != null) priceAmountMap.set(priceId, unitPrice / 100);
        } catch {
          // fall back to PRO_PRICE_ILS_FALLBACK for this sub
        }
      }),
    );

    // Sum real prices per subscriber; fall back to ₪10 for any unresolved price_id
    let totalMrr = 0;
    for (const sub of subs) {
      const priceId = String(
        (sub.attributes as { first_subscription_item?: { price_id?: number } })
          .first_subscription_item?.price_id ?? "",
      );
      totalMrr += priceAmountMap.get(priceId) ?? PRO_PRICE_ILS_FALLBACK;
    }

    const out = { mrr: parseFloat(totalMrr.toFixed(2)), activeSubs };
    await redis.set(LS_MRR_CACHE_KEY, out, { ex: LS_MRR_CACHE_TTL });
    return out;
  } catch (err) {
    logger.warn("[Admin] LemonSqueezy MRR fetch failed:", err);
    return null;
  }
}
