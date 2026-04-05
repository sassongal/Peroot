"use client";

import { useEffect, useState, Suspense } from 'react';
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

/**
 * Non-blocking PostHog analytics wrapper.
 *
 * Children render immediately and unconditionally. PostHog initializes in a
 * deferred useEffect (5 s delay) and once ready the PHProvider context is
 * layered in without remounting the child tree.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            initAnalytics();
            setIsReady(true);
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    // Always render children first, unconditionally.
    // Layer PostHog provider and pageview tracker only after init.
    return (
        <>
            {isReady && analytics && (
                <PHProvider client={analytics}>
                    <Suspense fallback={null}>
                        <PostHogPageView />
                    </Suspense>
                </PHProvider>
            )}
            {children}
        </>
    );
}
