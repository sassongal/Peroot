"use client";

import posthog from 'posthog-js';

export const initAnalytics = () => {
    if (typeof window !== 'undefined') {
        const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
        const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

        if (key && host) {
            posthog.init(key, {
                api_host: host,
                person_profiles: 'identified_only', // Minimize data for guests
                capture_pageview: false, // We will manually capture
            });
        }
    }
};

export const analytics = posthog;
