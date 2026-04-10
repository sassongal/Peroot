import { redis } from '@/lib/redis';
import { getContextLimits } from '@/lib/plans';
import type { PlanTier } from './types';

export interface ExtractionLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

function dayKey(): string {
  const d = new Date();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${m}-${day}`;
}

const DAY_TTL = 60 * 60 * 26; // 26h to cover timezone drift

export async function checkExtractionLimit(
  userId: string,
  tier: PlanTier,
): Promise<ExtractionLimitResult> {
  const limit = getContextLimits(tier).extractionsPerDay;
  const k = `extract:${userId}:${dayKey()}`;
  // Ensure the key exists with TTL before incrementing — prevents orphaned keys
  // if the process crashes between incr and expire.
  await redis.set(k, 0, { ex: DAY_TTL, nx: true });
  const count = (await redis.incr(k)) as number;
  const allowed = count <= limit;
  return { allowed, remaining: Math.max(0, limit - count), limit };
}
