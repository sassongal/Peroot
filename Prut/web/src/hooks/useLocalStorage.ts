'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';

/**
 * localStorage-backed state with SSR-safe lazy initialization.
 *
 * The common anti-pattern this replaces:
 *
 *     const [value, setValue] = useState(defaultValue);
 *     useEffect(() => {
 *       const stored = localStorage.getItem(key);
 *       if (stored) setValue(JSON.parse(stored));
 *     }, []);
 *     useEffect(() => {
 *       localStorage.setItem(key, JSON.stringify(value));
 *     }, [value]);
 *
 * That triggers: initial render with default → effect runs → setState →
 * second render with stored value → second write-effect fires. Every mount
 * costs two renders, and the first paint shows the wrong value. On mobile
 * this compounds into noticeable INP degradation on pages with many such
 * hooks.
 *
 * This hook reads the stored value inside a `useState(() => ...)` lazy
 * initializer so there's only one render on mount, and the first paint
 * already has the persisted value. Writes still happen in an effect to
 * keep render pure.
 *
 * SSR safety: `typeof window` check means the initializer returns the
 * default during server render, and the first client render rehydrates
 * from localStorage. For values that must match SSR output, use the
 * default. For values that only matter post-hydration (user prefs,
 * drawer state, etc.), this is the right shape.
 */
export function useLocalStorage<T>(
    key: string,
    defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
    // Lazy initializer runs only once. On server it returns default; on
    // client it synchronously reads from localStorage during mount.
    const [value, setValue] = useState<T>(() => {
        if (typeof window === 'undefined') return defaultValue;
        try {
            const stored = window.localStorage.getItem(key);
            if (stored === null) return defaultValue;
            return JSON.parse(stored) as T;
        } catch (e) {
            logger.warn(`[useLocalStorage] read failed for "${key}":`, e);
            return defaultValue;
        }
    });

    // Track whether we've mounted so we don't write the default value
    // back over a stored value on the very first render (React 19 strict
    // mode can run effects twice; we want idempotent writes only).
    const mounted = useRef(false);
    useEffect(() => {
        if (!mounted.current) {
            mounted.current = true;
            return;
        }
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            logger.warn(`[useLocalStorage] write failed for "${key}":`, e);
        }
    }, [key, value]);

    const setter = useCallback(
        (next: T | ((prev: T) => T)) => {
            setValue(next);
        },
        []
    );

    return [value, setter];
}
