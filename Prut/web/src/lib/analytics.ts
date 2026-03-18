"use client";

import posthog from 'posthog-js';

export const initAnalytics = () => {
    if (typeof window !== 'undefined') {
        const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
        const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

        if (key && host) {
            posthog.init(key, {
                api_host: host,
                person_profiles: 'identified_only',
                capture_pageview: false,
                capture_pageleave: true,
                persistence: 'localStorage+cookie',
            });

            // Capture UTM params on first load
            const params = new URLSearchParams(window.location.search);
            const utmProps: Record<string, string> = {};
            ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(key => {
                const val = params.get(key);
                if (val) utmProps[key] = val;
            });
            if (Object.keys(utmProps).length > 0) {
                posthog.register(utmProps);
            }

            // Set initial referrer
            if (document.referrer && !document.referrer.includes(window.location.hostname)) {
                posthog.register_once({ $initial_referrer: document.referrer });
            }
        }
    }
};

export const analytics = posthog;

// ─── Typed Event Helpers ──────────────────────────────────────────────────────

export function trackEvent(event: string, properties?: Record<string, unknown>) {
    if (typeof window !== 'undefined' && analytics) {
        analytics.capture(event, properties);
    }
}

/** Track when a user starts a prompt enhancement */
export function trackPromptEnhance(category: string, mode: string, inputLength: number) {
    trackEvent('prompt_enhance', { category, mode, input_length: inputLength });
}

/** Track when enhancement completes */
export function trackEnhanceComplete(mode: string, score: number, durationMs: number) {
    trackEvent('enhance_complete', { mode, score, duration_ms: durationMs });
}

/** Track prompt copy */
export function trackPromptCopy(source: 'result' | 'library' | 'personal') {
    trackEvent('prompt_copy', { source });
}

/** Track library prompt usage */
export function trackLibraryUse(promptId: string, promptTitle: string) {
    trackEvent('library_prompt_use', { prompt_id: promptId, prompt_title: promptTitle });
}

/** Track user signup */
export function trackSignUp(method: string) {
    trackEvent('user_signup', { method });
}

/** Track feature usage */
export function trackFeatureUse(feature: string) {
    trackEvent('feature_use', { feature });
}

/** Track chain run */
export function trackChainRun(chainId: string, stepCount: number) {
    trackEvent('chain_run', { chain_id: chainId, step_count: stepCount });
}

/** Track social share button click */
export function trackShare(platform: string, url: string) {
    trackEvent('blog_share', { platform, url });
}

/** Identify user for PostHog */
export function identifyUser(userId: string, properties?: Record<string, unknown>) {
    if (typeof window !== 'undefined' && analytics) {
        analytics.identify(userId, properties);
    }
}
