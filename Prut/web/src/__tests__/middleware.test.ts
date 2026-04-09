/**
 * Middleware regression tests.
 *
 * Scope: pure helper functions exported from src/middleware.ts. The full
 * middleware() handler is not tested here because it pulls in Supabase
 * SSR + Sentry + maintenance-mode Redis, and mocking that stack faithfully
 * is brittle. The helpers below encode the load-bearing security logic
 * (CSRF origin matching, auth-required path prefixes, method gating) —
 * that's where the real regressions would land.
 *
 * Follow-up scheduled separately: migrate src/middleware.ts to
 * src/proxy.ts for the Next.js 16 rename + Node.js runtime.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import {
    needsAuth,
    isStateChangingMethod,
    isCsrfExempt,
    validateCsrfOrigin,
} from '../middleware';

function makeRequest(opts: {
    pathname: string;
    method?: string;
    origin?: string | null;
    referer?: string | null;
    authorization?: string | null;
    siteUrl?: string;
}): NextRequest {
    const siteUrl = opts.siteUrl ?? 'https://www.peroot.space';
    const url = new URL(opts.pathname, siteUrl);
    const headers = new Map<string, string>();
    if (opts.origin) headers.set('origin', opts.origin);
    if (opts.referer) headers.set('referer', opts.referer);
    if (opts.authorization) headers.set('authorization', opts.authorization);

    return {
        nextUrl: url,
        method: opts.method ?? 'GET',
        headers: {
            get: (name: string) => headers.get(name.toLowerCase()) ?? null,
        },
    } as unknown as NextRequest;
}

describe('needsAuth', () => {
    it('returns true for /admin and /api/admin prefixes', () => {
        expect(needsAuth('/admin')).toBe(true);
        expect(needsAuth('/admin/users')).toBe(true);
        expect(needsAuth('/api/admin/stats')).toBe(true);
    });

    it('returns true for /api/enhance and billing routes', () => {
        expect(needsAuth('/api/enhance')).toBe(true);
        expect(needsAuth('/api/subscription/status')).toBe(true);
        expect(needsAuth('/api/checkout')).toBe(true);
    });

    it('returns false for public routes', () => {
        expect(needsAuth('/')).toBe(false);
        expect(needsAuth('/pricing')).toBe(false);
        expect(needsAuth('/prompts')).toBe(false);
        expect(needsAuth('/api/health')).toBe(false);
        // Webhooks carry their own HMAC auth and must not trip the
        // getUser() path — that's what makes them 200 under load.
        expect(needsAuth('/api/webhooks/lemonsqueezy')).toBe(false);
    });

    it('returns false for blog and docs routes', () => {
        expect(needsAuth('/blog')).toBe(false);
        expect(needsAuth('/blog/my-post')).toBe(false);
        expect(needsAuth('/guides')).toBe(false);
    });
});

describe('isStateChangingMethod', () => {
    it('GET/HEAD/OPTIONS are not state-changing', () => {
        expect(isStateChangingMethod('GET')).toBe(false);
        expect(isStateChangingMethod('HEAD')).toBe(false);
        expect(isStateChangingMethod('OPTIONS')).toBe(false);
    });

    it('POST/PUT/PATCH/DELETE are state-changing', () => {
        expect(isStateChangingMethod('POST')).toBe(true);
        expect(isStateChangingMethod('PUT')).toBe(true);
        expect(isStateChangingMethod('PATCH')).toBe(true);
        expect(isStateChangingMethod('DELETE')).toBe(true);
    });

    it('is case-insensitive', () => {
        expect(isStateChangingMethod('get')).toBe(false);
        expect(isStateChangingMethod('post')).toBe(true);
    });
});

describe('isCsrfExempt', () => {
    it('exempts /api/webhooks/ (HMAC-authenticated)', () => {
        const req = makeRequest({ pathname: '/api/webhooks/lemonsqueezy', method: 'POST' });
        expect(isCsrfExempt('/api/webhooks/lemonsqueezy', req)).toBe(true);
    });

    it('exempts /api/cron/ (CRON_SECRET-authenticated)', () => {
        const req = makeRequest({ pathname: '/api/cron/daily', method: 'POST' });
        expect(isCsrfExempt('/api/cron/daily', req)).toBe(true);
    });

    it('exempts /api/health', () => {
        const req = makeRequest({ pathname: '/api/health' });
        expect(isCsrfExempt('/api/health', req)).toBe(true);
    });

    it('exempts Bearer-authenticated requests (Chrome extension)', () => {
        const req = makeRequest({
            pathname: '/api/enhance',
            method: 'POST',
            authorization: 'Bearer eyJhbGciOi...',
        });
        expect(isCsrfExempt('/api/enhance', req)).toBe(true);
    });

    it('does NOT exempt a cookie-authenticated /api/enhance request', () => {
        const req = makeRequest({ pathname: '/api/enhance', method: 'POST' });
        expect(isCsrfExempt('/api/enhance', req)).toBe(false);
    });
});

describe('validateCsrfOrigin', () => {
    beforeEach(() => {
        vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.peroot.space');
    });

    it('returns null (allow) for GET requests — no state change', () => {
        const req = makeRequest({ pathname: '/api/enhance', method: 'GET' });
        expect(validateCsrfOrigin(req)).toBeNull();
    });

    it('returns null (allow) for non-API paths', () => {
        const req = makeRequest({
            pathname: '/prompts',
            method: 'POST',
            origin: 'https://evil.com',
        });
        expect(validateCsrfOrigin(req)).toBeNull();
    });

    it('returns null (allow) for webhook POST regardless of origin', () => {
        const req = makeRequest({
            pathname: '/api/webhooks/lemonsqueezy',
            method: 'POST',
            // LemonSqueezy webhook origin — would fail a naive check,
            // but webhooks are exempt (HMAC-authenticated).
            origin: 'https://api.lemonsqueezy.com',
        });
        expect(validateCsrfOrigin(req)).toBeNull();
    });

    it('returns null (allow) when origin matches NEXT_PUBLIC_SITE_URL', () => {
        const req = makeRequest({
            pathname: '/api/enhance',
            method: 'POST',
            origin: 'https://www.peroot.space',
        });
        expect(validateCsrfOrigin(req)).toBeNull();
    });

    it('allows www and non-www variants of the same host', () => {
        const withWww = makeRequest({
            pathname: '/api/enhance',
            method: 'POST',
            origin: 'https://www.peroot.space',
        });
        const withoutWww = makeRequest({
            pathname: '/api/enhance',
            method: 'POST',
            origin: 'https://peroot.space',
        });
        expect(validateCsrfOrigin(withWww)).toBeNull();
        expect(validateCsrfOrigin(withoutWww)).toBeNull();
    });

    it('falls back to Referer header when Origin is missing', () => {
        const req = makeRequest({
            pathname: '/api/enhance',
            method: 'POST',
            referer: 'https://www.peroot.space/prompts',
        });
        expect(validateCsrfOrigin(req)).toBeNull();
    });

    it('returns 403 for a cross-origin state-changing request', () => {
        const req = makeRequest({
            pathname: '/api/enhance',
            method: 'POST',
            origin: 'https://evil.com',
        });
        const result = validateCsrfOrigin(req);
        expect(result).not.toBeNull();
        expect(result?.status).toBe(403);
    });

    it('returns 403 when origin header is missing entirely (no referer either)', () => {
        // Missing origin AND referer is treated as unverifiable — block.
        // This is what a non-browser attacker would send.
        const req = makeRequest({
            pathname: '/api/enhance',
            method: 'POST',
        });
        const result = validateCsrfOrigin(req);
        expect(result).not.toBeNull();
        expect(result?.status).toBe(403);
    });

    it('returns 403 for a malformed origin URL', () => {
        const req = makeRequest({
            pathname: '/api/enhance',
            method: 'POST',
            origin: 'not-a-url',
        });
        const result = validateCsrfOrigin(req);
        expect(result).not.toBeNull();
        expect(result?.status).toBe(403);
    });
});
