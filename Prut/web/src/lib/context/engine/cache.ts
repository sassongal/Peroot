import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";
import type { ContextBlock, PlanTier } from "./types";

const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const WARNING_TTL_SECONDS = 60 * 5; // 5 minutes — re-attempt after transient failures
const PREFIX = "ctx:";

// URL content is public — safe to share across users for dedup.
// File and image content is private — scoped to userId to prevent cross-user data leak.
function key(sha256: string, tier: PlanTier, type: ContextBlock["type"], userId?: string): string {
  const scope = type !== "url" && userId ? `${userId}:` : "";
  return `${PREFIX}${scope}${sha256}:${tier}`;
}

export async function getCachedBlock(
  sha256: string,
  tier: PlanTier,
  type: ContextBlock["type"],
  userId?: string,
): Promise<ContextBlock | null> {
  try {
    const raw = await redis.get(key(sha256, tier, type, userId));
    if (!raw) return null;
    return JSON.parse(raw as string) as ContextBlock;
  } catch (err) {
    logger.warn("[context-cache] get failed", err);
    return null;
  }
}

export async function putCachedBlock(
  block: ContextBlock,
  tier: PlanTier,
  userId?: string,
): Promise<void> {
  try {
    const k = key(block.sha256, tier, block.type, userId);
    // Strip rawText to save Redis memory — it can be up to ~48KB per block
    const { display, ...rest } = block;
    const { rawText: _raw, ...displayRest } = display;
    const slim = { ...rest, display: displayRest };
    const ttl =
      block.stage === "warning" || block.stage === "error" ? WARNING_TTL_SECONDS : TTL_SECONDS;
    await redis.set(k, JSON.stringify(slim), { ex: ttl });
  } catch (err) {
    logger.warn("[context-cache] put failed", err);
  }
}
