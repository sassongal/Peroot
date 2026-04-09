/**
 * Inflight lock regression tests.
 *
 * Guards the two invariants the feature exists for:
 *
 * 1. `acquireInflightLock` returns a distinct key for semantically
 *    different requests. Changing the hash inputs (prompt, mode, tone,
 *    targetModel, attachment fingerprint, isRefinement) flips the key.
 *    If this breaks, a different request could silently block an
 *    unrelated one.
 *
 * 2. Guests (no userId) always fail open with `acquired: true`. Dedup
 *    is a paid-user feature because guests share IPs and credit flow.
 *    This regression test exists because "just add a guest fallback"
 *    would silently skip the lock for everyone if someone removes the
 *    userId check later.
 *
 * Redis is NOT mocked here. The helper's designed fallback is "no
 * UPSTASH_REDIS_REST_URL env var → fail open", which is exactly what
 * the test environment provides. That makes these unit tests deterministic
 * without a running Redis.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { acquireInflightLock, buildInflightKey, __resetRedisForTest } from '../inflight-lock';

describe('inflight-lock — buildInflightKey', () => {
    beforeEach(() => {
        __resetRedisForTest();
    });

    it('returns null for guests (no userId)', () => {
        expect(buildInflightKey({ prompt: 'hello' })).toBeNull();
    });

    it('returns a key for authenticated users', () => {
        const key = buildInflightKey({ userId: 'user-1', prompt: 'hello' });
        expect(key).toMatch(/^peroot:enhance:inflight:user-1:[a-f0-9]{64}$/);
    });

    it('normalizes prompt whitespace and trailing punctuation', () => {
        const a = buildInflightKey({ userId: 'u', prompt: 'Hello World' });
        const b = buildInflightKey({ userId: 'u', prompt: '  hello   world.' });
        expect(a).toBe(b);
    });

    it('different prompts produce different keys', () => {
        const a = buildInflightKey({ userId: 'u', prompt: 'foo' });
        const b = buildInflightKey({ userId: 'u', prompt: 'bar' });
        expect(a).not.toBe(b);
    });

    it('different users produce different keys even for identical prompts', () => {
        const a = buildInflightKey({ userId: 'u1', prompt: 'foo' });
        const b = buildInflightKey({ userId: 'u2', prompt: 'foo' });
        expect(a).not.toBe(b);
    });

    it('different modes produce different keys', () => {
        const a = buildInflightKey({ userId: 'u', prompt: 'foo', mode: 'STANDARD' });
        const b = buildInflightKey({ userId: 'u', prompt: 'foo', mode: 'IMAGE_GENERATION' });
        expect(a).not.toBe(b);
    });

    it('refinement flag flips the key so refine cannot block base enhance', () => {
        const base = buildInflightKey({ userId: 'u', prompt: 'foo', isRefinement: false });
        const refine = buildInflightKey({ userId: 'u', prompt: 'foo', isRefinement: true });
        expect(base).not.toBe(refine);
    });

    it('attachment fingerprint flips the key so different PDFs do not collide', () => {
        const a = buildInflightKey({ userId: 'u', prompt: 'foo', contextFingerprint: 'abc' });
        const b = buildInflightKey({ userId: 'u', prompt: 'foo', contextFingerprint: 'def' });
        expect(a).not.toBe(b);
    });
});

describe('inflight-lock — acquireInflightLock without Redis (fail-open)', () => {
    beforeEach(() => {
        __resetRedisForTest();
        // Ensure no Redis config leaks from CI env.
        delete process.env.UPSTASH_REDIS_REST_URL;
        delete process.env.UPSTASH_REDIS_REST_TOKEN;
        delete process.env.REDIS_URL;
        delete process.env.REDIS_TOKEN;
    });

    it('fails open (acquired: true) when no Redis is configured', async () => {
        const result = await acquireInflightLock({ userId: 'u', prompt: 'foo' });
        expect(result.acquired).toBe(true);
        expect(typeof result.release).toBe('function');
        await expect(result.release()).resolves.toBeUndefined();
    });

    it('returns acquired: true for guests regardless of Redis state', async () => {
        const result = await acquireInflightLock({ prompt: 'foo' });
        expect(result.acquired).toBe(true);
        expect(result.key).toBeNull();
    });
});
