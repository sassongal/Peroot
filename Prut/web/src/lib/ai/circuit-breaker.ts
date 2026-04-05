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
 * Uses Redis EVAL (Lua) for atomic read-increment-write to prevent
 * concurrent requests from losing failure counts.
 */
export async function recordFailure(provider: string): Promise<void> {
  const key = `${KEY_PREFIX}${provider}`;
  try {
    const r = getRedis();
    if (r) {
      // Atomic increment via Lua script — avoids TOCTOU race between instances
      const script = `
        local data = redis.call('GET', KEYS[1])
        local entry = data and cjson.decode(data) or {state="closed",failures=0,lastFailure=0,lastSuccess=0}
        entry.failures = entry.failures + 1
        entry.lastFailure = tonumber(ARGV[1])
        if entry.state == "half_open" then
          entry.state = "open"
        elseif entry.failures >= tonumber(ARGV[2]) then
          entry.state = "open"
        end
        redis.call('SET', KEYS[1], cjson.encode(entry), 'EX', tonumber(ARGV[3]))
        return cjson.encode(entry)
      `;
      const result = await r.eval(script, [key], [Date.now().toString(), FAILURE_THRESHOLD.toString(), REDIS_TTL_S.toString()]) as string;
      const entry = JSON.parse(result) as CircuitEntry;
      if (entry.state === "open") {
        console.log(`[CircuitBreaker] ${provider}: -> OPEN (${entry.failures} failures)`);
      }
      return;
    }
  } catch {
    // Redis unavailable — fall through to in-memory
  }

  // In-memory fallback
  const entry = getMemoryEntry(provider);
  entry.failures++;
  entry.lastFailure = Date.now();
  if (entry.state === "half_open") {
    entry.state = "open";
    console.log(`[CircuitBreaker] ${provider}: HALF_OPEN -> OPEN (still failing)`);
  } else if (entry.failures >= FAILURE_THRESHOLD) {
    entry.state = "open";
    console.log(`[CircuitBreaker] ${provider}: CLOSED -> OPEN (${entry.failures} failures)`);
  }
}

