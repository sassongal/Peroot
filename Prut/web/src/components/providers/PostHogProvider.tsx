"use client";

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initAnalytics, analytics } from '@/lib/analytics';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

function PostHogPageView() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

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

    return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        initAnalytics();
    }, []);

    return (
        <PHProvider client={analytics}>
            <Suspense fallback={null}>
                <PostHogPageView />
            </Suspense>
            {children}
        </PHProvider>
    );
}
