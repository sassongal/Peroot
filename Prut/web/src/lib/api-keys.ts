import { createHash, randomBytes, timingSafeEqual } from "crypto";

/**
 * Peroot Connect developer API keys (`prk_live_…`) — generation & hashing.
 *
 * Format: `prk_live_` + 40 lowercase hex chars (20 crypto-random bytes).
 * Storage: only the SHA-256 hex of the FULL raw key (`key_hash`) plus a
 * display/lookup prefix (`key_prefix`, first 16 chars). The raw key is shown
 * to the user exactly once, at creation.
 *
 * Lookup strategy: select active rows by indexed `key_prefix`, then compare
 * `key_hash` against every match in constant time — prefix collisions are
 * possible by design and must not leak timing.
 */

export const API_KEY_LIVE_PREFIX = "prk_live_";
/** First 16 chars of the raw key — enough entropy (7 hex chars) for lookup, safe to display. */
export const API_KEY_DISPLAY_PREFIX_LEN = 16;
/** Full raw key format. `prk_` detection elsewhere stays broader on purpose. */
export const API_KEY_PATTERN = /^prk_live_[0-9a-f]{40}$/;

export interface GeneratedApiKey {
  /** The full secret — return to the user once, never store. */
  raw: string;
  /** SHA-256 hex of `raw` — what goes in developer_api_keys.key_hash. */
  hash: string;
  /** First 16 chars of `raw` — what goes in developer_api_keys.key_prefix. */
  prefix: string;
}

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function generateApiKey(): GeneratedApiKey {
  const raw = API_KEY_LIVE_PREFIX + randomBytes(20).toString("hex");
  return {
    raw,
    hash: hashApiKey(raw),
    prefix: raw.slice(0, API_KEY_DISPLAY_PREFIX_LEN),
  };
}

/** Constant-time equality of two sha256 hex digests (equal length by construction). */
export function hashesEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return timingSafeEqual(bufA, bufB);
}
