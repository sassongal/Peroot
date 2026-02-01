"use client";

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initAnalytics, analytics } from '@/lib/analytics';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        initAnalytics();
    }, []);

    useEffect(() => {
        if (pathname && analytics) {
            let url = window.origin + pathname;
            if (searchParams?.toString()) {
                url = url + '?' + searchParams.toString();
            }
            analytics.capture('$pageview', {
                '$current_url': url,
            });
        }
    }, [pathname, searchParams]);

    return <PHProvider client={analytics}>{children}</PHProvider>;
}
