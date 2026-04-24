import { redis } from "@/lib/redis";
import { getContextLimits } from "@/lib/plans";
import type { PlanTier } from "./types";

export interface ExtractionLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  /** Seconds until midnight UTC — use as Retry-After value on 429 responses. */
  resetIn: number;
  /** Decrement the counter by 1 — call on error to refund a failed extraction. */
  rollback: () => Promise<void>;
}

function dayKey(): string {
  const d = new Date();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${m}-${day}`;
}

function secondsUntilEndOfDay(): number {
  const now = new Date();
  const tomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  return Math.ceil((tomorrow.getTime() - now.getTime()) / 1000);
}

const DAY_TTL = 60 * 60 * 26; // 26h to cover timezone drift

export async function checkExtractionLimit(
  userId: string,
  tier: PlanTier,
): Promise<ExtractionLimitResult> {
  const limit = getContextLimits(tier).extractionsPerDay;
  const k = `extract:${userId}:${dayKey()}`;

  let count: number;
  try {
    // Ensure the key exists with TTL before incrementing — prevents orphaned keys
    // if the process crashes between incr and expire.
    await redis.set(k, 0, { ex: DAY_TTL, nx: true });
    count = (await redis.incr(k)) as number;
  } catch {
    // Redis unavailable (missing env vars in local dev, or transient outage).
    // Fail open so uploads are not broken when the rate-limit store is down.
    // A missed count wastes one slot per failed check — acceptable vs total outage.
    return {
      allowed: true,
      remaining: limit,
      limit,
      resetIn: secondsUntilEndOfDay(),
      rollback: async () => {
        // Nothing to roll back — counter was never incremented.
      },
    };
  }

  const allowed = count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - count),
    limit,
    resetIn: secondsUntilEndOfDay(),
    rollback: async () => {
      try {
        await (redis as unknown as { decr(k: string): Promise<number> }).decr(k);
      } catch {
        // Best-effort — a missed decrement wastes one slot, not a security issue
      }
    },
  };
}
