/**
 * Circuit Breaker for AI providers.
 * Tracks failures per provider and skips providers that are failing,
 * so we fall back to healthy models faster instead of wasting timeout time.
 *
 * State is persisted in Upstash Redis for cross-instance consistency on Vercel.
 * Falls back to in-memory state if Redis is unavailable.
 *
 * States: CLOSED (healthy) -> OPEN (failing, skip) -> HALF_OPEN (test one request)
 */

import { Redis } from "@upstash/redis";

type CircuitState = "closed" | "open" | "half_open";

interface CircuitEntry {
  state: CircuitState;
  failures: number;
  lastFailure: number;
  lastSuccess: number;
}

const FAILURE_THRESHOLD = 3; // failures before opening circuit
const RECOVERY_TIME_MS = 30_000; // 30s before trying again (half-open)
const REDIS_TTL_S = 60; // auto-expire keys after 60s
const KEY_PREFIX = "@peroot/circuit:";

// Redis client — lazy-initialized to avoid errors when env vars are missing at import time
let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

// In-memory fallback — used when Redis is unavailable
const memoryCircuits = new Map<string, CircuitEntry>();

function defaultEntry(): CircuitEntry {
  return { state: "closed", failures: 0, lastFailure: 0, lastSuccess: Date.now() };
}

function getMemoryEntry(provider: string): CircuitEntry {
  if (!memoryCircuits.has(provider)) {
    memoryCircuits.set(provider, defaultEntry());
  }
  return memoryCircuits.get(provider)!;
}

async function readEntry(provider: string): Promise<CircuitEntry> {
  try {
    const r = getRedis();
    if (!r) return getMemoryEntry(provider);
    const data = await r.get<CircuitEntry>(`${KEY_PREFIX}${provider}`);
    return data ?? defaultEntry();
  } catch {
    // Redis unavailable — fall back to in-memory
    return getMemoryEntry(provider);
  }
}

function writeEntry(provider: string, entry: CircuitEntry): void {
  // Fire-and-forget write — don't block the caller
  try {
    const r = getRedis();
    if (!r) {
      memoryCircuits.set(provider, entry);
      return;
    }
    r.set(`${KEY_PREFIX}${provider}`, entry, { ex: REDIS_TTL_S }).catch(() => {
      // Redis write failed — update in-memory as fallback
      memoryCircuits.set(provider, entry);
    });
  } catch {
    memoryCircuits.set(provider, entry);
  }
}

/**
 * Check if a provider should be skipped.
 * Returns true if the circuit is closed or half-open (provider available).
 */
export async function isProviderAvailable(provider: string): Promise<boolean> {
  const entry = await readEntry(provider);

  if (entry.state === "closed") return true;

  if (entry.state === "open") {
    // Check if recovery time has passed
    if (Date.now() - entry.lastFailure >= RECOVERY_TIME_MS) {
      entry.state = "half_open";
      writeEntry(provider, entry);
      console.log(`[CircuitBreaker] ${provider}: OPEN -> HALF_OPEN (testing)`);
      return true; // allow one test request
    }
    return false; // still failing, skip
  }

  // half_open — allow requests through to test
  return true;
}

/**
 * Record a successful response from a provider.
 */
export function recordSuccess(provider: string): void {
  const entry: CircuitEntry = {
    state: "closed",
    failures: 0,
    lastFailure: 0,
    lastSuccess: Date.now(),
  };
  writeEntry(provider, entry);
}

/**
 * Record a failure from a provider.
 */
export async function recordFailure(provider: string): Promise<void> {
  const entry = await readEntry(provider);
  entry.failures++;
  entry.lastFailure = Date.now();

  if (entry.state === "half_open") {
    entry.state = "open";
    console.log(`[CircuitBreaker] ${provider}: HALF_OPEN -> OPEN (still failing)`);
  } else if (entry.failures >= FAILURE_THRESHOLD) {
    entry.state = "open";
    console.log(`[CircuitBreaker] ${provider}: CLOSED -> OPEN (${entry.failures} failures)`);
  }

  writeEntry(provider, entry);
}

/**
 * Get status of all circuits (for monitoring/admin).
 * Note: only returns in-memory entries; Redis entries for other instances are not enumerable.
 */
export function getCircuitStatus(): Record<string, { state: CircuitState; failures: number }> {
  const status: Record<string, { state: CircuitState; failures: number }> = {};
  for (const [provider, entry] of memoryCircuits) {
    status[provider] = { state: entry.state, failures: entry.failures };
  }
  return status;
}
