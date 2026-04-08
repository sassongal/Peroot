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
        let cancelled = false;
        const boot = () => {
            if (cancelled) return;
            cancelled = true;
            initAnalytics();
            setIsReady(true);
        };

        // Prefer idle callback — runs only when the main thread is free.
        // Fall back to a short timeout on browsers without requestIdleCallback.
        // Also boot on first user interaction (whichever fires first) so
        // analytics are ready by the time anything meaningful happens.
        const ric = (window as any).requestIdleCallback as
            | ((cb: () => void, opts?: { timeout: number }) => number)
            | undefined;
        const idleHandle = ric
            ? ric(boot, { timeout: 4000 })
            : (window.setTimeout(boot, 2500) as unknown as number);

        const interactionEvents = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;
        const onInteract = () => boot();
        interactionEvents.forEach((e) =>
            window.addEventListener(e, onInteract, { once: true, passive: true })
        );

        return () => {
            cancelled = true;
            if (ric && (window as any).cancelIdleCallback) {
                (window as any).cancelIdleCallback(idleHandle);
            } else {
                window.clearTimeout(idleHandle);
            }
            interactionEvents.forEach((e) => window.removeEventListener(e, onInteract));
        };
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
