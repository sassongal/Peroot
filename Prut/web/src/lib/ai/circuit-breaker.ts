/**
 * Circuit Breaker for AI providers.
 * Tracks failures per provider and skips providers that are failing,
 * so we fall back to healthy models faster instead of wasting timeout time.
 *
 * States: CLOSED (healthy) -> OPEN (failing, skip) -> HALF_OPEN (test one request)
 */

type CircuitState = "closed" | "open" | "half_open";

interface CircuitEntry {
  state: CircuitState;
  failures: number;
  lastFailure: number;
  lastSuccess: number;
}

const FAILURE_THRESHOLD = 3; // failures before opening circuit
const RECOVERY_TIME_MS = 30_000; // 30s before trying again (half-open)
const SUCCESS_RESET = 1; // successes in half-open to close circuit

const circuits = new Map<string, CircuitEntry>();

function getEntry(provider: string): CircuitEntry {
  if (!circuits.has(provider)) {
    circuits.set(provider, {
      state: "closed",
      failures: 0,
      lastFailure: 0,
      lastSuccess: Date.now(),
    });
  }
  return circuits.get(provider)!;
}

/**
 * Check if a provider should be skipped.
 * Returns true if the circuit is open (provider is failing).
 */
export function isProviderAvailable(provider: string): boolean {
  const entry = getEntry(provider);

  if (entry.state === "closed") return true;

  if (entry.state === "open") {
    // Check if recovery time has passed
    if (Date.now() - entry.lastFailure >= RECOVERY_TIME_MS) {
      entry.state = "half_open";
      console.log(`[CircuitBreaker] ${provider}: OPEN -> HALF_OPEN (testing)`);
      return true; // allow one test request
    }
    return false; // still failing, skip
  }

  // half_open - allow requests through to test
  return true;
}

/**
 * Record a successful response from a provider.
 */
export function recordSuccess(provider: string): void {
  const entry = getEntry(provider);
  if (entry.state === "half_open" || entry.state === "open") {
    console.log(`[CircuitBreaker] ${provider}: ${entry.state} -> CLOSED (recovered)`);
  }
  entry.state = "closed";
  entry.failures = 0;
  entry.lastSuccess = Date.now();
}

/**
 * Record a failure from a provider.
 */
export function recordFailure(provider: string): void {
  const entry = getEntry(provider);
  entry.failures++;
  entry.lastFailure = Date.now();

  if (entry.state === "half_open") {
    // Failed during test - go back to open
    entry.state = "open";
    console.log(`[CircuitBreaker] ${provider}: HALF_OPEN -> OPEN (still failing)`);
  } else if (entry.failures >= FAILURE_THRESHOLD) {
    entry.state = "open";
    console.log(`[CircuitBreaker] ${provider}: CLOSED -> OPEN (${entry.failures} failures)`);
  }
}

/**
 * Get status of all circuits (for monitoring/admin).
 */
export function getCircuitStatus(): Record<string, { state: CircuitState; failures: number }> {
  const status: Record<string, { state: CircuitState; failures: number }> = {};
  for (const [provider, entry] of circuits) {
    status[provider] = { state: entry.state, failures: entry.failures };
  }
  return status;
}
