/**
 * Circuit-breaker regression tests (in-memory path).
 *
 * Redis is NOT mocked — these tests rely on the designed fallback
 * behavior: when no UPSTASH_REDIS_REST_URL / REDIS_URL is set, the
 * breaker uses its in-memory Map. That's the path exercised by local
 * dev and by Vercel preview deploys without Upstash bindings, so
 * asserting the state transitions on the in-memory path is the
 * highest-leverage guarantee we can make without mocking fetch.
 *
 * What we guard:
 *
 * 1. Fresh provider starts CLOSED (available).
 * 2. FAILURE_THRESHOLD (3) failures trip CLOSED -> OPEN, and further
 *    calls are blocked.
 * 3. recordSuccess resets OPEN -> CLOSED immediately.
 * 4. After RECOVERY_TIME_MS the OPEN circuit transitions to HALF_OPEN
 *    and allows one test request through.
 * 5. A HALF_OPEN failure immediately re-opens (not a fresh count).
 *
 * Every test resets both the in-memory Map and the lazy Redis singleton
 * so tests don't leak state across describes.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    isProviderAvailable,
    recordSuccess,
    recordFailure,
    __resetCircuitBreakerForTest,
} from '../circuit-breaker';

const PROVIDER = 'test-provider';

beforeEach(() => {
    __resetCircuitBreakerForTest();
    // Guarantee in-memory path — if CI leaks Upstash creds into env,
    // these tests would try to hit real Redis and flake.
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.REDIS_URL;
    delete process.env.REDIS_TOKEN;
});

afterEach(() => {
    vi.useRealTimers();
});

describe('circuit-breaker — fresh state', () => {
    it('a never-seen provider is available', async () => {
        expect(await isProviderAvailable('brand-new')).toBe(true);
    });

    it('recordSuccess on a fresh provider keeps it available', async () => {
        recordSuccess(PROVIDER);
        expect(await isProviderAvailable(PROVIDER)).toBe(true);
    });
});

describe('circuit-breaker — CLOSED -> OPEN transition', () => {
    it('stays CLOSED under the failure threshold', async () => {
        await recordFailure(PROVIDER);
        await recordFailure(PROVIDER);
        // 2 failures, threshold is 3 — still available.
        expect(await isProviderAvailable(PROVIDER)).toBe(true);
    });

    it('opens at exactly FAILURE_THRESHOLD (3) failures', async () => {
        await recordFailure(PROVIDER);
        await recordFailure(PROVIDER);
        await recordFailure(PROVIDER);
        expect(await isProviderAvailable(PROVIDER)).toBe(false);
    });

    it('remains OPEN on additional failures', async () => {
        for (let i = 0; i < 5; i++) await recordFailure(PROVIDER);
        expect(await isProviderAvailable(PROVIDER)).toBe(false);
    });
});

describe('circuit-breaker — recovery', () => {
    it('recordSuccess immediately resets OPEN -> CLOSED', async () => {
        await recordFailure(PROVIDER);
        await recordFailure(PROVIDER);
        await recordFailure(PROVIDER);
        expect(await isProviderAvailable(PROVIDER)).toBe(false);

        recordSuccess(PROVIDER);
        expect(await isProviderAvailable(PROVIDER)).toBe(true);
    });

    it('after RECOVERY_TIME_MS (30s) the OPEN circuit goes HALF_OPEN and allows a probe', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

        await recordFailure(PROVIDER);
        await recordFailure(PROVIDER);
        await recordFailure(PROVIDER);
        expect(await isProviderAvailable(PROVIDER)).toBe(false);

        // Advance past the 30-second recovery window.
        vi.setSystemTime(new Date('2025-01-01T00:00:31Z'));
        expect(await isProviderAvailable(PROVIDER)).toBe(true);
    });
});

describe('circuit-breaker — HALF_OPEN failure path', () => {
    it('a failure while HALF_OPEN immediately re-opens the circuit', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

        // Open the circuit.
        await recordFailure(PROVIDER);
        await recordFailure(PROVIDER);
        await recordFailure(PROVIDER);

        // Wait for recovery window.
        vi.setSystemTime(new Date('2025-01-01T00:00:31Z'));

        // First call transitions OPEN -> HALF_OPEN and returns true.
        expect(await isProviderAvailable(PROVIDER)).toBe(true);

        // The probe request fails — should immediately re-open.
        await recordFailure(PROVIDER);
        expect(await isProviderAvailable(PROVIDER)).toBe(false);
    });
});

describe('circuit-breaker — isolation between providers', () => {
    it('opening one provider does not affect another', async () => {
        await recordFailure('provider-a');
        await recordFailure('provider-a');
        await recordFailure('provider-a');

        expect(await isProviderAvailable('provider-a')).toBe(false);
        expect(await isProviderAvailable('provider-b')).toBe(true);
    });
});
